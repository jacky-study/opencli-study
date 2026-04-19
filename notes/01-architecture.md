# OpenCLI 整体架构与核心设计

> 研究 OpenCLI 项目的整体架构、核心设计模式、技术栈和代码质量

## 一、项目定位

OpenCLI 是一个将网站、浏览器会话和桌面应用转化为确定性 CLI 命令的框架。核心理念：**让任何网站成为你的 CLI**，同时为 AI Agent 提供浏览器操控能力，运行时不消耗任何 LLM Token。

## 二、目录结构与模块划分

```
opencli/
├── src/                  # 核心框架源码（约 18,290 行）
│   ├── main.ts           # 入口文件
│   ├── cli.ts            # Commander 命令注册（1,466 行）
│   ├── registry.ts       # 命令注册中心
│   ├── commanderAdapter.ts # Commander 框架适配层
│   ├── execution.ts      # 命令执行引擎
│   ├── pipeline/         # YAML 流水线引擎（核心）
│   │   ├── executor.ts   # 流水线执行器
│   │   ├── registry.ts   # 步骤注册表
│   │   ├── template.ts   # 模板表达式引擎
│   │   └── steps/        # 内置步骤实现
│   ├── browser/          # 浏览器控制层
│   │   ├── bridge.ts     # 浏览器桥接（Daemon 管理）
│   │   ├── cdp.ts        # CDP 直连客户端
│   │   ├── page.ts       # 页面抽象
│   │   └── dom-snapshot.ts # DOM 快照引擎
│   ├── download/         # 下载模块
│   ├── errors.ts         # 统一错误体系
│   ├── types.ts          # IPage 接口定义
│   ├── runtime.ts        # 运行时（浏览器工厂 + 超时）
│   └── plugin.ts         # 插件系统（1,571 行）
├── clis/                 # 101 个适配器目录，846 个文件
├── extension/            # Chrome 扩展源码
├── tests/                # E2E 和冒烟测试
├── skills/               # AI Agent 技能定义
└── docs/                 # 文档（VitePress）
```

## 三、核心模块职责

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| **入口与启动** | 快速路径处理、发现注册、启动 CLI | `src/main.ts` |
| **命令注册中心** | 所有适配器命令的注册与查询 | `src/registry.ts` |
| **流水线引擎** | 解析 YAML 步骤并顺序执行 | `src/pipeline/executor.ts` |
| **步骤注册表** | 可扩展的步骤处理器注册 | `src/pipeline/registry.ts` |
| **模板引擎** | `${{ }}` 表达式渲染 | `src/pipeline/template.ts` |
| **浏览器桥接** | Daemon 生命周期管理、IPage 实例 | `src/browser/bridge.ts` |
| **CDP 客户端** | 直接连接 Electron/远程浏览器 | `src/browser/cdp.ts` |
| **错误体系** | 统一错误类型与退出码 | `src/errors.ts` |
| **插件系统** | 安装、卸载、更新社区插件 | `src/plugin.ts` |
| **适配器发现** | 扫描内置/用户/插件目录 | `src/discovery.ts` |

## 四、启动流程

`src/main.ts` 设计了三层启动路径：

### 第一层：超快路径（零依赖）
处理 `--version`、`completion`、`--get-completions`，不加载任何模块，直接输出后退出。

### 第二层：并行发现
通过 `Promise.all` 并行执行三个独立操作：
1. 确保用户 CLI 兼容垫片
2. 确保用户适配器目录
3. 发现内置适配器

### 第三层：完整启动
触发 `onStartup` 钩子，调用 `runCli()` 创建 Commander 程序并解析命令行参数。

## 五、核心设计模式

### 5.1 策略模式（Strategy Pattern）

六种数据获取策略，通过 `Strategy` 枚举管理：

| 策略 | 含义 | 典型场景 |
|------|------|----------|
| `PUBLIC` | 无需认证的公开 API | HackerNews 热榜 |
| `LOCAL` | 本地工具直连 | `gh`、`docker` |
| `COOKIE` | 复用浏览器登录 Cookie | Bilibili 收藏 |
| `HEADER` | 自定义请求头认证 | 内部 API |
| `INTERCEPT` | 拦截浏览器网络请求 | 动态加载数据 |
| `UI` | 直接操作 DOM 元素 | 表单提交、按钮点击 |

适配器声明策略后，框架自动决定是否启动浏览器、是否预导航到目标域名。

### 5.2 管道/流水线模式（Pipeline Pattern）

数据处理核心。每个适配器可定义 `pipeline`（YAML 数组），由 `executor.ts` 顺序执行：

```yaml
pipeline:
  - fetch: "https://hacker-news.firebaseio.com/v0/topstories.json"
  - map:
      expr: "${{ item }}"
      limit: "${{ args.limit }}"
  - fetch:
      url: "https://hacker-news.firebaseio.com/v0/item/${{ item }}.json"
      concurrency: 5
  - select: ["title", "score", "url"]
```

步骤注册表（`pipeline/registry.ts`）采用 Map 结构，内置 16 种步骤，第三方插件可通过 `registerStep()` 扩展。

### 5.3 注册表模式（Registry Pattern）

`registry.ts` 维护全局 Map，使用 `globalThis.__opencli_registry__` 确保跨模块单例：

```typescript
const _registry: Map<string, CliCommand> =
  globalThis.__opencli_registry__ ??= new Map<string, CliCommand>();
```

### 5.4 工厂方法模式（Factory Method）

`IBrowserFactory` 接口定义了 `connect()` 和 `close()` 方法：
- **`BrowserBridge`**：通过本地 Daemon + Chrome 扩展连接（网站）
- **`CDPBridge`**：直接通过 CDP WebSocket 连接（Electron 应用）

### 5.5 模板引擎（Template Engine）

实现了 `${{ expression }}` 语法的表达式求值：
1. **快速路径**：字符串字面量、数字字面量、简单点路径
2. **管道过滤器**：支持 `| upper`、`| default(0)`、`| truncate(50)` 等 16 种
3. **沙箱 VM**：复杂表达式在 `node:vm` 沙箱中执行，禁用 `eval`/`Function`，50ms 超时，LRU 缓存

### 5.6 模块间通信与解耦

- **依赖倒置**：浏览器操作全部通过 `IPage` 接口，不依赖具体实现
- **钩子系统**：`onStartup`、`onBeforeExecute`、`onAfterExecute` 事件钩子
- **动态导入**：`main.ts` 使用 `await import()` 延迟加载，确保快速路径零开销

## 六、技术栈分析

| 依赖 | 用途 | 选型原因 |
|------|------|----------|
| **commander** | CLI 框架 | Node.js 生态最成熟的命令行解析库 |
| **ws** | WebSocket 客户端 | 与 Chrome 扩展 Daemon 通信 |
| **js-yaml** | YAML 解析 | 适配器配置文件格式 |
| **turndown** | HTML 转 Markdown | 文章下载功能 |
| **undici** | HTTP 客户端 | 比 Node 内置 `fetch` 更高性能 |
| **cli-table3** | 终端表格渲染 | 命令输出默认格式 |
| **vitest** | 测试框架 | 原生 ESM 支持，配置简洁 |

### 有趣的技术选型决策

1. **零运行时 LLM 依赖**：不调用任何 LLM API，所有数据获取确定性
2. **Node.js >= 21 要求**：使用 `styleText()` 和顶层 `await`
3. **Daemon + Chrome 扩展**：复用用户已登录浏览器，无需 Puppeteer
4. **VM 沙箱**：模板表达式使用 `node:vm`，防止沙箱逃逸
5. **多入口点导出**：各模块可独立导入，插件只需引入需要的部分

## 七、代码规模和质量

| 类别 | 行数 | 文件数 |
|------|------|--------|
| 核心框架（src/*.ts） | 约 18,290 行 | 约 60 个文件 |
| 测试代码 | 约 9,985 行 | 约 20 个文件 |
| 适配器（clis/） | 约 846 个文件 | 101 个站点目录 |
| 最大单文件 | `src/plugin.ts` 1,571 行 | `src/cli.ts` 1,466 行 |

### 测试策略

| 项目 | 范围 | 说明 |
|------|------|------|
| **unit** | `src/**/*.test.ts` | 核心逻辑单元测试 |
| **extension** | `extension/src/**/*.test.ts` | Chrome 扩展测试 |
| **adapter** | `clis/**/*.test.{ts,js}` | 适配器集成测试 |
| **e2e** | `tests/e2e/*.test.ts` | 端到端浏览器测试 |

### 错误处理策略

遵循 Unix `sysexits.h` 规范，所有错误继承 `CliError` 基类：
- 机器可读的 `code`
- 人类可读的 `hint`
- 语义化的 `exitCode`
- 统一序列化为 YAML 格式的 `ErrorEnvelope`

---

*研究日期：2026-04-20*
