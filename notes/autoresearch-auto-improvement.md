---
article_id: OBA-ar8x5kn2
created_at: 2026-04-29
tags: [autoresearch, automation, testing, ai-agent, quality]
---

# Autoresearch：AI 驱动的自动研究引擎

> 关联教程：[explorer/02-opencli-guide.md](../explorer/02-opencli-guide.md)

## 问题

OpenCLI 源码中有一个 `autoresearch/` 目录，与 `src/`、`clis/` 同级。这个自动研究引擎是如何工作的？

## 一、功能概述

**Autoresearch 是 OpenCLI 的"自动驾驶系统"**，基于 Andrej Karpathy 的 autoresearch 理念，通过**约束 + 机械性指标 + 无界循环**实现 AI 驱动的自主代码改进。

### 核心定位

| 维度 | 说明 |
|------|------|
| **给谁用** | 项目维护者和自动化开发者 |
| **解决什么** | 自动提升浏览器命令可靠性（56/59 → 59/59）、优化 Skill 质量、修复适配器失效 |
| **独特价值** | 零人工干预：从发现问题到修复代码全自动化 |

### 科学方法论

完整实现"观察 → 假设 → 实验 → 结论"的循环：

```
观察: 日志 + git log 显示历史模式
  → 假设: Claude Code 根据上下文提出改进方案
    → 实验: commit → verify → guard
      → 结论: keep（改进）或 discard（回滚）
        → 记录: TSV 日志永久保存
```

## 二、目录结构

```
autoresearch/
├── engine.ts                 # 核心引擎：8阶段自动迭代循环
├── config.ts                 # 配置解析和指标提取
├── logger.ts                 # TSV 格式结果日志
│
├── commands/
│   ├── run.ts               # 主循环入口
│   ├── plan.ts              # 交互式配置向导
│   ├── fix.ts               # 迭代错误消除
│   └── debug.ts             # 假设驱动的调试
│
├── presets/                  # 预设配置（开箱即用）
│   ├── browser-reliability.ts    # 浏览器命令可靠性（59 任务）
│   ├── skill-quality.ts          # Skill E2E 质量（35 任务）
│   ├── v2ex-reliability.ts       # V2EX 适配器
│   ├── zhihu-reliability.ts      # 知乎适配器
│   ├── combined-reliability.ts   # 组合测试套件
│   └── save-reliability.ts       # Save as CLI 流程
│
├── eval-*.ts                 # 各层测试执行器
│   ├── eval-browse.ts        # Layer 1: 确定性测试
│   ├── eval-skill.ts         # Layer 2: LLM E2E 测试
│   ├── eval-v2ex.ts          # Layer 3: V2EX 真实测试
│   ├── eval-zhihu.ts         # Layer 3: 知乎真实测试
│   ├── eval-save.ts          # Layer 4: 完整流程测试
│   └── eval-all.ts           # 组合运行器
│
├── *-tasks.json              # 测试任务定义
├── save-adapters/            # Layer 4 测试用适配器
├── *.sh                      # 快速运行脚本
├── baseline-*.txt            # 性能基准
└── results/                  # 测试结果（gitignore）
```

## 三、工作原理：8 阶段自动迭代循环

```
Phase 0: 前置检查（Git 状态、无 stale lock、非 detached HEAD）
Phase 1: Review（读取 scope + 历史日志 + git log）
Phase 2: Ideate（根据历史选择改进方向）
Phase 3: Modify（委托 Claude Code 进行 ONE 原子性修改）
Phase 4: Commit（git commit）
Phase 5: Verify（运行 verify 命令，提取指标）
Phase 5.5: Guard（可选回归检查）
Phase 6: Decide（keep/discard/crash + 回滚）
Phase 7: Log（追加到 TSV 日志）
Phase 8: Repeat（回到 Phase 1）
```

### 原子性修改原则

```
1. 每次只做一个逻辑修改（可涉及多文件）
2. 修改前必须先读取失败输出或代码
3. 不修改测试文件或 verify 命令
4. 用一句话描述改了什么
5. 如果前一个方案被 discard，换一个完全不同的方法
```

### Claude Code 集成

```typescript
// commands/run.ts
const result = execSync(
  `claude -p --dangerously-skip-permissions \
   --allowedTools "Bash(npm:*),Bash(git:*),Read,Edit,Write,Glob,Grep" \
   --output-format text --no-session-persistence "${prompt}"`,
  { cwd: ROOT, timeout: 300_000 }  // 5 分钟超时
);
```

### 智能卡住检测

连续 5 次 discard 时提供不同策略提示：

| 连续失败次数 | 提示策略 |
|-------------|---------|
| 5-9 | 重新阅读所有 scope 文件，尝试完全不同的方法 |
| 10-14 | 回顾完整日志，尝试组合之前成功的变更 |
| 15+ | 尝试相反的方法 / 架构级变更 / 做减法 |

### 安全回滚机制

```
策略 1: git revert HEAD --no-edit（正常）
策略 2: git revert --abort && git reset --hard HEAD~1（revert 失败）
策略 3: hook 阻塞时不回滚（因为未提交）
```

## 四、四层测试架构

### Layer 1: 确定性 Browse 测试（59 任务）

零 LLM 成本，纯命令可靠性测试。

```json
{
  "name": "extract-github-stars",
  "steps": [
    "opencli browser open https://github.com/browser-use/browser-use",
    "opencli browser eval \"document.querySelector('#repo-stars-counter-star')?.textContent?.trim()\""
  ],
  "judge": { "type": "matchesPattern", "pattern": "\\d" }
}
```

**覆盖**：extract(9) + list(10) + search(6) + nav(7) + scroll(5) + form(6) + complex(6) + bench(10)

### Layer 2: LLM E2E 测试（35 任务）

使用 Claude Code 执行任务，多标准评估：

```typescript
{
  name: "extract-github-stars",
  task: "Find the number of stars on this repository",
  url: "https://github.com/browser-use/browser-use",
  judge_context: ["Output must contain a number (the star count)"]
}
```

### Layer 3: 真实网站测试

- **V2EX**：60 个任务，覆盖帖子列表、详情、评论
- **知乎**：60 个任务，覆盖热榜、搜索、问答

### Layer 4: Save as CLI 流程测试

端到端验证"浏览器探索 → 写适配器 → 验证"的完整流程。

## 五、与其他系统的关系

### 与 Skill 系统（闭环）

```
Autoresearch 发现 Skill 质量问题
  → eval-skill.ts 测试失败
    → 修改 SKILL.md 提示词
      → 重新测试，验证改进
        → baseline 提升 → keep commit
```

### 与 Browser 系统（持续集成）

```
Browser 命令 (src/browser/*)
  → Browse 任务定义 (browse-tasks.json)
    → eval-browse.ts 执行测试
      → 收集失败案例 + 日志
        → Autoresearch 驱动修复
          → 验证改进（baseline 提升）
```

### 与 opencli-autofix Skill（互补）

| 维度 | Autoresearch | opencli-autofix |
|------|-------------|-----------------|
| 触发 | 主动，定时/手动 | 被动，命令失败时 |
| 目标 | 提升整体质量 | 修复单个失败 |
| 范围 | 系统级改进 | 单适配器修复 |
| 迭代 | 无界循环直到完美 | 最多 3 轮 |

## 六、设计亮点

### 1. 约束驱动的自动改进

| 约束 | 说明 |
|------|------|
| Scope 约束 | 只修改指定 glob 模式文件 |
| 原子性约束 | 每次只做一个逻辑修改 |
| 验证约束 | 必须通过机械性验证（数值指标） |
| 守卫约束 | 可选回归检查（如 `npm run build`） |
| 回滚约束 | 失败自动 git revert |

### 2. 指标提取算法

```typescript
function extractMetric(output: string): number | null {
  // 优先级 1: "SCORE=56" 格式
  // 优先级 2: 独立数字行
  // 优先级 3: fallback 到第一个数字
}
```

### 3. TSV 可观测性

```tsv
# metric_direction: higher_is_better
0  a1b2c3d  56  0    -  baseline  initial state
1  e5f6g7h  57  +1   pass  keep  fixed selector for github stars
2  h8i9j0k  56  -1   -     discard  snapshot optimization failed
```

易于 grep/awk 分析，永久记录所有实验。

### 4. 成本效率优化

- 快速失败策略：baseline 为 null 直接报错
- 超时保护：Claude Code 调用 5 分钟超时
- 噪声过滤：`minDelta: 1` 忽略微小波动

### 5. 预设配置系统

```typescript
export const browserReliability: AutoResearchConfig = {
  goal: 'Increase browser command pass rate to 59/59',
  scope: ['src/browser/*.ts', 'src/cli.ts'],
  metric: 'pass_count',
  direction: 'higher',
  verify: 'npx tsx autoresearch/eval-browse.ts 2>&1 | tail -1',
  guard: 'npm run build',
  minDelta: 1,
};
```

## 关键发现

1. **Autoresearch 本质是"AI 驱动的科学方法"**：观察 → 假设 → 实验 → 结论的完整循环，每次迭代都是一次受控实验
2. **四层测试架构体现了成本意识**：Layer 1 零成本快速筛选，Layer 2-4 逐步增加成本但提供更真实的验证
3. **与 opencli-autofix 形成互补**：Autoresearch 是主动的系统级质量提升，autofix 是被动的单次修复
4. **原子性修改 + 自动回滚 = 安全的自动化**：即使 AI 犯错，git revert 确保不会破坏主分支
5. **这个模式可移植**：任何有"机械性指标"的项目都可以用这个框架实现自动改进
