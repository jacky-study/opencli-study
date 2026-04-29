---
article_id: OBA-sk7p3qw1
created_at: 2026-04-29
tags: [skill, plugin, architecture, registry, adapter, pipeline]
---

# Skill 系统与插件架构

> 关联教程：[explorer/02-opencli-guide.md](../explorer/02-opencli-guide.md)

## 问题

OpenCLI 的 Skill 系统和插件架构是如何设计的？Skill 和 CLI Adapter 有什么区别？

## 一、Skill vs CLI Adapter

| 维度 | CLI Adapter | Skill |
|------|------------|-------|
| **定位** | 可执行的命令实现 | AI Agent 使用指南（Markdown） |
| **存储** | `clis/<site>/<name>.js` | `skills/<name>/SKILL.md` |
| **执行** | `opencli <site> <command>` | 安装到 AI Agent（Claude Code/Cursor） |
| **技术** | JavaScript 代码 | Markdown + `allowed-tools` 声明 |
| **用户** | 终端用户或 AI Agent | AI Agent（作为系统提示词） |
| **示例** | `opencli hackernews top` | `opencli-adapter-author` 指导 Agent 写 adapter |

**核心区别**：Adapter 是"执行代码"，Skill 是"操作手册"。Skill 驻留在 AI Agent 侧，通过自然语言描述实现松耦合。

## 二、Skills 目录结构

```
skills/
├── opencli-adapter-author/     # 核心：指导编写新 adapter
│   ├── SKILL.md                # 决策树 + 流程（30分钟闭环）
│   ├── references/             # 详细参考文档
│   │   ├── coverage-matrix.md  # 支持什么、不支持什么
│   │   ├── site-recon.md       # 站点侦察（5 种模式）
│   │   ├── api-discovery.md    # API 发现（5 条路径）
│   │   ├── field-conventions.md # 字段命名约定
│   │   └── site-memory/        # 站点知识积累
│   └── package.json
├── opencli-browser/            # 浏览器自动化参考
├── opencli-autofix/            # 自动修复坏掉的 adapter
├── opencli-usage/              # OpenCLI 总体使用指南
└── smart-search/               # 跨能力搜索
```

**各 Skill 功能**：

| Skill | 功能 |
|-------|------|
| `opencli-adapter-author` | 30 分钟闭环写 adapter：站点侦察 → API 发现 → 编码 → 验证 |
| `opencli-browser` | 浏览器操作原语参考（open/state/click/type） |
| `opencli-autofix` | 命令失败时自动诊断、修复、重试 |
| `opencli-usage` | 能力地图，帮助 Agent 选择正确的 Skill |
| `smart-search` | 搜索现有 90+ adapters |

## 三、Skill 安装与运行机制

### 安装方式

Skill **不在 OpenCLI 内运行**，安装到 AI Agent 中：

```bash
# 安装所有 skills
npx skills add jackwener/opencli

# 安装单个 skill
npx skills add jackwener/opencli --skill opencli-adapter-author
```

安装位置：`~/.skills/`（由 `npx skills` 工具管理）

### Skill 格式

```markdown
---
name: opencli-adapter-author
description: Use when writing an OpenCLI adapter...
allowed-tools: Bash(opencli:*), Read, Edit, Write, Grep
---

# opencli-adapter-author

你是要给一个站点写 adapter 的 agent...
```

**关键元数据**：
- `name`：Skill 唯一标识
- `description`：触发条件描述（Agent 据此匹配）
- `allowed-tools`：允许 Agent 使用的工具范围

### 运行机制

```
用户: "帮我写一个 B站热门视频的 adapter"
  → Agent 匹配到 opencli-adapter-author
  → 加载 SKILL.md 作为系统提示
  → Agent 执行: opencli browser open/state/network/init/verify
  → 返回生成的 adapter 代码
```

### Adapter Author 决策树

```
START
  → opencli doctor 通过？
    → 读站点记忆（~/.opencli/sites/<site>/）
      → 命中 endpoint → 直接验证
      → 没命中 → 站点侦察（Pattern A/B/C/D/E）
        → API 发现（network → state → bundle → token → intercept）
          → 编写 adapter → 验证
```

## 四、插件架构

### 注册系统（`src/registry.ts`）

```typescript
export function cli(opts: CliOptions): CliCommand {
  const cmd = {
    site: opts.site,
    name: opts.name,
    strategy: opts.strategy ?? Strategy.COOKIE,
    browser: opts.browser ?? true,
    args: opts.args ?? [],
    pipeline: opts.pipeline,
    func: opts.func,
  };
  registerCommand(cmd);
  return cmd;
}
```

**全局注册表**（解决 npm link 模块隔离问题）：
```typescript
declare global {
  var __opencli_registry__: Map<string, CliCommand> | undefined;
}
const _registry = globalThis.__opencli_registry__ ??= new Map();
```

### Strategy 枚举

```typescript
export enum Strategy {
  PUBLIC    = 'public',     // 公开 API，无需浏览器
  LOCAL     = 'local',      // 本地端点
  COOKIE    = 'cookie',     // 需要 Cookie（从浏览器抓取）
  HEADER    = 'header',     // 需要自定义 Header（Bearer/CSRF）
  INTERCEPT = 'intercept',  // 拦截页面发出的请求
  UI        = 'ui',         // 完整 UI 交互（DOM 操作）
}
```

Strategy 决定了：是否需要浏览器、是否预导航、凭据如何获取。

### Pipeline 声明式编程

```javascript
pipeline: [
  { fetch: { url: 'https://hn-api.com/topstories.json' } },
  { limit: '${{ Math.min(args.limit + 10, 50) }}' },
  { map: { id: '${{ item }}' } },
  { fetch: { url: 'https://hn-api.com/item/${{ item.id }}.json' } },
  { filter: 'item.title && !item.deleted' },
  { map: { rank: '${{ index + 1 }}', title: '${{ item.title }}' } },
  { limit: '${{ args.limit }}' },
]
```

类似 jq，但面向 Web API。支持模板字符串插值 `${{ }}`。

### Adapter 生命周期

```
发现: cli-manifest.json（快速路径）或扫描 clis/ 目录（回退）
  → 注册: cli() → globalThis.__opencli_registry__
    → Commander 绑定: registerAllCommands()
      → 执行: 参数验证 → 浏览器会话 → 预导航 → pipeline/func → 返回
        → 输出: renderOutput() → table/json/yaml/md/csv
```

### 用户插件

```
~/.opencli/
├── clis/           # 用户自定义 adapters
├── sites/          # 站点知识积累
│   └── <site>/
│       ├── endpoints.json    # 已验证的 API 端点
│       ├── field-map.json    # 字段映射规则
│       └── notes.md          # 人工笔记
└── plugins/        # 第三方插件
```

**插件系统**（`src/plugin.ts`）：
- 支持单插件和 Monorepo
- 安装来源：GitHub、本地路径、git URL
- 自动依赖安装和 TS 转译
- 锁文件追踪版本

## 五、关键代码片段

### 1. Strategy 自动推断（`src/registry.ts`）

```typescript
function normalizeCommand(cmd: CliCommand): CliCommand {
  const strategy = cmd.strategy ?? (cmd.browser === false ? Strategy.PUBLIC : Strategy.COOKIE);
  const browser = cmd.browser ?? (strategy !== Strategy.PUBLIC && strategy !== Strategy.LOCAL);

  if (strategy === Strategy.COOKIE || strategy === Strategy.HEADER) {
    navigateBefore = `https://${cmd.domain}`;  // 自动预导航
  }
  return { ...cmd, strategy, browser, navigateBefore };
}
```

### 2. 执行入口（`src/commanderAdapter.ts`）

```typescript
subCmd.action(async () => {
  const kwargs = prepareCommandArgs(cmd, rawKwargs);
  const result = await executeCommand(cmd, kwargs, verbose);
  renderOutput(result, { fmt: format, columns, title: `${site}/${name}` });
});
```

## 六、设计亮点

### 1. Skill 与 Adapter 彻底分离

- Skill 是"操作手册"（何时做），Adapter 是"执行代码"（怎么做）
- Skill 驻留在 AI Agent 侧，Adapter 在 OpenCLI 侧
- 通过自然语言 `description` 实现松耦合

### 2. 声明式 Pipeline

类似 jq 但面向 Web API，支持模板插值、链式操作：
`fetch → filter → map → limit` 一行定义完整数据流

### 3. 站点知识积累

```
~/.opencli/sites/<site>/
├── endpoints.json    # 已验证的 API 端点
├── field-map.json    # 字段映射规则
└── notes.md          # 人工笔记
```

下次写同站 adapter 从已积累知识开始，而非从零开始。

### 4. 全局注册表

```typescript
globalThis.__opencli_registry__ ??= new Map()
```

解决 npm link / peerDependency 的模块实例隔离问题，插件和主程序共享同一注册表。

### 5. Fast Path 优化

- 预编译 `cli-manifest.json`（生产环境无需扫描文件系统）
- Lazy Loading：只在执行时加载模块

## 关键发现

1. **Skill 本质是 AI Agent 的"系统提示词"**：不是代码，而是 Markdown 文档。通过 `npx skills add` 安装到 Agent，Agent 根据描述自动匹配
2. **Pipeline 是 OpenCLI 的杀手级抽象**：声明式数据流，支持 fetch/filter/map/limit，类似 jq 但面向 Web
3. **Strategy 枚举驱动的自动化**：只需声明 `Strategy.COOKIE`，系统自动处理浏览器会话、预导航、凭据获取
4. **站点知识积累是长期投资**：每次写 adapter 的经验（API 端点、字段映射）都被保存，越用越快
