# OpenCLI AI Agent 集成机制

> 研究 OpenCLI 如何让 AI Agent 发现、学习和执行工具

## 一、核心理念

OpenCLI 是"AI 原生运行时"，从设计之初就将 AI Agent 视为一等公民。不要求 AI 去解析 help 文本或猜测命令行为，而是通过**结构化元数据、标准化输入输出和自描述注册机制**，让 AI Agent 能够像调用 API 一样使用命令行工具。

## 二、SKILL.md — 面向 AI 的技能描述文件

> **关键发现**：项目中不存在 AGENT.md 文件，而是设计了功能更强大的 SKILL.md 体系。

### SKILL.md 结构

| 字段 | 作用 | 示例 |
|------|------|------|
| `name` | 技能唯一标识 | `opencli-explorer` |
| `description` | 触发条件描述，告诉 AI "何时使用此技能" | `Use when creating a new OpenCLI adapter from scratch` |
| `tags` | 分类标签 | `[opencli, adapter, browser, cli]` |
| `allowed-tools` | 该技能可使用的工具权限 | `Bash(opencli:*), Read, Edit, Write` |

### 7 个核心 SKILL

| 路径 | 职责 |
|------|------|
| `skills/opencli-browser/SKILL.md` | 浏览器自动化，AI Agent 控制 Chrome |
| `skills/opencli-explorer/SKILL.md` | 完整的适配器开发流程（API发现→策略选择→编写→测试）|
| `skills/opencli-oneshot/SKILL.md` | 单点快速 CLI 生成（URL+一句话描述）|
| `skills/opencli-autofix/SKILL.md` | 自修复机制，命令失败时自动诊断修复 |
| `skills/opencli-usage/SKILL.md` | 全平台 87+ 适配器使用指南 |
| `skills/smart-search/SKILL.md` | 智能搜索路由，将查询分发到最佳数据源 |
| `clis/antigravity/SKILL.md` | 控制 Antigravity 桌面应用 |

## 三、工具注册表（Registry）

核心文件：`src/registry.ts`

每个注册的工具（CliCommand）携带完整的自描述元数据：

| 元数据字段 | 含义 |
|-----------|------|
| `site` | 所属平台（如 `bilibili`, `twitter`）|
| `name` | 命令名（如 `search`, `hot`）|
| `description` | 人类/AI 可读的功能描述 |
| `strategy` | 认证策略（PUBLIC/COOKIE/HEADER/INTERCEPT/UI）|
| `browser` | 是否需要浏览器 |
| `args` | 参数定义（类型、默认值、是否必填）|
| `columns` | 输出字段列表 |
| `domain` | 目标域名 |

### 两级发现路径

核心文件：`src/discovery.ts`

```
┌─────────────────────────────────────┐
│         discoverClis()              │
│                                     │
│   优先路径: cli-manifest.json       │
│   (预编译清单，即时注册，懒加载)    │
│          ↓ 失败？                   │
│   备用路径: 文件系统扫描            │
│   (扫描 clis/<site>/<name>.js)      │
│          ↓                          │
│   插件路径: ~/.opencli/plugins/     │
│   (第三方插件目录)                  │
└─────────────────────────────────────┘
```

AI Agent 可通过 `opencli list -f yaml` 获取结构化完整工具列表。

## 四、AI Agent 执行机制

### 执行流程

```
AI Agent 调用命令
     ↓
opencli <site> <command> [args] [--format json]
     ↓
commanderAdapter.ts 解析命令
     ↓
注册表查找 → 懒加载模块
     ↓
normalizeCommand() 解析策略 → 决定是否需要浏览器
     ↓
┌─ browser=false → 直接执行 func() 或 pipeline
├─ browser=true  → browserSession(BrowserFactory, page => {
│     page.goto(domain)
│     func(page, kwargs)
│   })
└─ 输出: table / json / yaml / md / csv
```

### 5 级认证策略

AI Agent 无需理解认证细节，系统自动选择：

| 层级 | 策略 | 速度 | 含义 |
|------|------|------|------|
| Tier 1 | `PUBLIC` | ~1s | 无需认证，直接 fetch |
| Tier 2 | `COOKIE` | ~7s | 复用 Chrome 登录 Cookie |
| Tier 2.5 | localStorage Bearer | ~7s | JWT 存 localStorage |
| Tier 3 | `HEADER` | ~7s | 需要 CSRF/Bearer Header |
| Tier 4 | `INTERCEPT` | ~10s | 复杂签名，通过 Store Action 拦截 |
| Tier 5 | `UI` | ~15s+ | 纯 DOM 自动化 |

### 错误处理（机器可读）

```
EXIT_CODES = {
  0:   成功
  1:   通用错误
  2:   参数错误
  66:  空结果 (EX_NOINPUT)
  69:  服务不可用
  75:  超时 (EX_TEMPFAIL)
  77:  需要认证 (EX_NOPERM)
  78:  配置错误 (EX_CONFIG)
}
```

AI Agent 根据 exit code 决定下一步：77 需要登录，75 可重试，66 无数据。

## 五、自动生成与验证（generate）

核心文件：`src/generate-verified.ts`、`src/explore.ts`

`opencli generate <url>` 一键从网页生成 CLI 适配器：

```
┌──────────┐    ┌───────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
│ explore  │ →  │synthesize │ →  │cascade    │ →  │ verify   │ →  │ register │
│ 发现API  │    │ 合成候选   │    │ 探测策略   │    │ 验证结果  │    │ 注册命令  │
└──────────┘    └───────────┘    └───────────┘    └──────────┘    └──────────┘
```

输出三种状态：
- **success**：适配器已验证并注册
- **blocked**：无法自动生成
- **needs-human-check**：需要人工审查

## 六、自修复机制（AutoFix）

SKILL 文件：`skills/opencli-autofix/SKILL.md`

```
命令失败 → OPENCLI_DIAGNOSTIC=1 重新运行
→ 获取 RepairContext（error.code / adapter.sourcePath / page.snapshot / networkRequests）
→ 用 browser 重新探索网站
→ 修补适配器文件
→ 重试验证（最多3轮）
→ 成功 → 向上游提交 GitHub Issue
```

## 七、与 AI 模型的交互

### 不依赖任何 LLM API

核心框架不调用任何大模型 API。所有能力都是确定性算法实现。AI 的角色是**外层的编排者**：
- AI Agent 读取 SKILL.md 获取使用指南
- 通过 `opencli` CLI 命令与系统交互
- 解析 JSON 格式结构化输出做决策

### 支持的 AI 平台（通过浏览器自动化控制）

| 平台 | 命令前缀 | 能力 |
|------|---------|------|
| ChatGPT | `opencli chatgpt` | 发送、读取、切换模型 |
| Cursor | `opencli cursor` | 发送、提取代码、历史 |
| Codex | `opencli codex` | 发送、读取、提取 diff |
| 豆包 | `opencli doubao` | 状态、发送、读取 |
| Gemini | `opencli gemini` | 提问、图片、深度研究 |
| Grok | `opencli grok` | 提问、图片 |

## 八、整体数据流

```
                    ┌─────────────────────────────────┐
                    │         AI Agent (Claude等)       │
                    │  读取 SKILL.md → 调用 opencli CLI │
                    └──────────┬──────────────────────┘
                               │ 命令行调用
                               ↓
┌──────────────────────────────────────────────────────────┐
│                    opencli 运行时                          │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐              │
│  │ Registry │  │Discovery │  │  Browser   │              │
│  │ 全局注册表│  │ 发现引擎  │  │  Bridge    │              │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘              │
│       ↓              ↓              ↓                     │
│  ┌──────────────────────────────────────┐                │
│  │         Commander Adapter            │                │
│  │    (命令分发 + 策略解析 + 执行)       │                │
│  └───────────────┬──────────────────────┘                │
│     ┌───────────┼───────────┐                            │
│     ↓           ↓           ↓                            │
│  PUBLIC       COOKIE     INTERCEPT                       │
│  fetch        Chrome      XHR拦截                        │
│     └─────────┴───────────┘                              │
│               ↓                                          │
│     结构化输出 (json/yaml/table)                          │
└──────────────────────────────────────────────────────────┘
```

## 总结：5 个核心设计原则

1. **AI 不需要猜测**：所有命令都有结构化元数据
2. **确定性优先**：核心不依赖 LLM API
3. **SKILL.md 代替 AGENT.md**：更丰富的 Skill 体系
4. **5 级策略级联**：自动选择最优执行路径
5. **自描述 + 自修复**：标准 exit code + Diagnostic 上下文自动修复

---

*研究日期：2026-04-20*
