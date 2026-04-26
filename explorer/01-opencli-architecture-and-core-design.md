---
article_id: OBA-tktvzbf4
title: OpenCLI 整体架构与核心设计
tags: [opencli, architecture, survey]
---

# OpenCLI 整体架构与核心设计

> **定位**：对 OpenCLI v1.7.8 的全面系统调研，覆盖产品认知、核心概念、代码原理三个层次。
> **读者**：想深入理解 OpenCLI 设计哲学和实现细节的开发者。
> **前置知识**：无，假设零基础。

---

## 目录

- [一、产品认知](#一产品认知)
- [二、核心概念与设计哲学](#二核心概念与设计哲学)
- [三、代码原理](#三代码原理)
- [四、架构洞察](#四架构洞察)
- [五、关键文件地图](#五关键文件地图)

---

## 一、产品认知

### 1.1 一句话定位

OpenCLI 是一个 AI 原生的浏览器自动化工具，将任意网站、浏览器会话、Electron 应用和本地工具统一转换为确定性 CLI 命令，让人类和 AI Agent 都能通过命令行安全、高效地操作各类在线服务。

### 1.2 解决什么问题

**痛点**：
- 每个网站的操作方式不同，没有统一的命令行接口
- AI Agent 需要操作浏览器，但 Puppeteer/Playwright 的输出不确定、消耗 token
- 复用用户登录态很复杂（OAuth、API Key 管理繁琐）
- 桌面应用（Cursor、ChatGPT）无法通过命令行控制

**OpenCLI 的方案**：
- 将 90+ 站点统一为 CLI 命令（如 `opencli bilibili video <url>`）
- 零 LLM 运行成本，完全确定性输出
- 复用 Chrome 登录态，无需额外凭证
- 支持 8 款桌面应用的命令行控制

### 1.3 定位差异

| 对比维度 | OpenCLI | Puppeteer/Playwright | Browser-Use/Stagehand |
|----------|---------|---------------------|----------------------|
| 抽象层级 | 高（站点级命令） | 低（页面操作原语） | 中（AI 驱动操作） |
| 确定性 | 高（结构化输出） | 中（需手动处理） | 低（依赖 LLM） |
| 运行成本 | 零 token | 零 token | 消耗 token |
| 开箱即用 | 90+ 站点 | 需编码 | 需 prompt |
| 桌面应用 | 支持 | 不支持 | 不支持 |

### 1.4 用户画像

| 用户群体 | 核心需求 | 典型场景 |
|----------|----------|----------|
| AI Agent 开发者 | 浏览器自动化能力 | Claude Code 操作浏览器 |
| 数据工程师 | 批量抓取、数据管道 | 定时抓取 Bilibili 热门 |
| DevOps/SRE | CI/CD 集成 | 自动化部署、监控 |
| 内容创作者 | 跨平台操作 | 多平台内容发布 |
| 开发者爱好者 | 终端统一体验 | 在终端操作 Cursor、ChatGPT |

### 1.5 技术栈

| 类别 | 技术选择 |
|------|----------|
| 语言 | TypeScript (ES Modules) |
| 运行时 | Node.js >= 21 / Bun >= 1.0 |
| CLI 框架 | Commander.js |
| 浏览器通信 | WebSocket + CDP |
| 数据处理 | js-yaml, @mozilla/readability, turndown |
| 测试 | Vitest |
| 文档 | VitePress |
| 构建 | TypeScript Compiler + esbuild |

---

## 二、核心概念与设计哲学

### 2.1 双引擎架构

**为什么需要两个引擎？**

简单场景（公开 API 抓取）用声明式配置就够了，复杂场景（登录态交互、动态加载）需要完整编程能力。双引擎覆盖全频谱：

```
简单 ←————————————————————————→ 复杂
YAML Pipeline（声明式）     TypeScript Adapter（编程式）
```

**Pipeline 引擎**：
- 通过 YAML/JS 配置声明数据处理流程
- 内置步骤：fetch、parse、extract、transform
- 支持重试机制和模板变量
- 适合公开 API、静态页面

**TypeScript Adapter**：
- 完整编程能力
- 直接操作 IPage 接口（浏览器抽象层）
- 适合复杂交互、登录态、动态加载
- 约 90+ 站点使用此方式

### 2.2 五层认证策略

认证是浏览器自动化的核心难题。OpenCLI 设计了 5 层策略，由简到繁：

| 层级 | 模式 | 原理 | 适用场景 |
|------|------|------|----------|
| 1 | PUBLIC | 直接 HTTP 请求，无需认证 | HackerNews、arXiv |
| 2 | LOCAL | 本地命令，不涉及网络 | 文件操作 |
| 3 | COOKIE | 复用浏览器 Cookie | Bilibili、知乎、豆瓣 |
| 4 | HEADER | 自定义 HTTP 头 | Bearer Token、CSRF |
| 5 | INTERCEPT | 拦截 XHR/Fetch 响应 | Twitter GraphQL |
| 6 | UI | 通过 DOM 快照交互 | 桌面应用（Cursor） |

**自动推断机制**（`src/analysis.ts`）：
- 检测到 Bearer Token → header 策略
- 检测到 CSRF Token → header 策略
- 检测到签名参数（如 `w_rid`）→ intercept 策略
- 默认 → cookie 策略

**降级机制**：INTERCEPT → HEADER → COOKIE，自动尝试更简单的策略。

**安全设计**：凭证永不离开浏览器进程。Daemon 作为中间层，所有敏感操作都在 Chrome 扩展内完成。

### 2.3 Browser Bridge（浏览器桥接）

这是 OpenCLI 最核心的创新能力：

```
OpenCLI CLI                    Chrome 扩展
    │                              │
    │  WebSocket (端口 19825)       │
    ├──────── Daemon ──────────────┤
    │  (Node.js 微守护进程)         │
    │                              │
    └── CDP 命令 ──→  浏览器操作 ───┘
```

**关键特性**：
- **复用登录态**：利用 Chrome 扩展获取用户已有的 Cookie/Session
- **按需启动**：Daemon 不常驻，有命令时启动，空闲时退出
- **会话隔离**：自动化窗口独立于用户浏览，不干扰正常使用
- **安全隔离**：Origin 检查 + 自定义头部 + 无 CORS + 1MB 请求体限制

**两种浏览器后端**：
- **CDPBridge**：直接通过 CDP 端点连接（适合调试）
- **BrowserBridge**：通过 Chrome 扩展 + Daemon 桥接（默认方式）

工厂模式 `getBrowserFactory()` 根据站点类型返回对应实现。

### 2.4 AI 原生 Skills 系统

OpenCLI 把 AI Agent 作为一等公民，设计了完整的 Skill 生态：

```
skills/
├── opencli-adapter-author/   # 适配器编写全流程指导
├── opencli-autofix/          # 失败自动修复
├── opencli-browser/          # 浏览器自动化参考
├── opencli-usage/            # 命令快速查询
└── smart-search/             # 能力搜索引擎
```

**适配器编写闭环**：
```
侦察 → API 发现 → 字段解码 → 编码 → 验证
```

**站点记忆机制**（`~/.opencli/sites/<site>/`）：每次适配器编写过程中累积的知识（API 端点、字段映射、认证方式），下次编写同站点时自动复用。

### 2.5 确定性输出

所有命令支持 `--format` 参数：

| 格式 | 用途 |
|------|------|
| `table`（默认） | 人类可读的富文本表格 |
| `json` | 机器可读，AI Agent 消费 |
| `yaml` | 人类友好的配置格式 |
| `md` | Markdown 文档 |
| `csv` | 电子表格导入 |

**为什么确定性重要？**
- AI Agent 不需要消耗 token 解析页面
- CI/CD 流水线可以可靠地解析输出
- 脚本可以稳定地管道组合命令

---

## 三、代码原理

### 3.1 入口与启动优化

**主入口**：`src/main.ts`（149 行）

启动流程设计了**多重快速路径**来优化性能：

```
用户输入 opencli xxx
        │
        ├─ --version / -V? → 直接输出版本号，退出
        ├─ completion? → 打印 shell 补全脚本，退出
        ├─ --get-completions? → 从 manifest 读取候选，退出
        │
        └── 完整启动路径 ↓
            ├─ 动态导入核心模块
            ├─ 并行：用户目录设置 + 内置 CLI 发现 + 插件发现
            ├─ 注册 Commander 命令
            └─ 发送 onStartup 生命周期钩子
```

**关键优化**：
- 快速命令绕过完整初始化（省去模块加载、CLI 发现的开销）
- 核心模块使用动态 import，只在需要时加载

### 3.2 CLI 注册与发现

**全局单例注册表**（`src/registry.ts`）：

```javascript
// 使用 globalThis 确保跨模块实例唯一性
globalThis.__opencli_registry__ = { commands: new Map() };

// 命令注册 API
function cli(config) {
  // 策略解析、字段规范化
  normalizeCommand(config);
  // 注册到全局注册表
  globalThis.__opencli_registry__.commands.set(key, config);
}
```

**双路径发现**（`src/discovery.ts`）：

```
发现命令
  │
  ├─ 快速路径（优先）：
  │   读取 cli-manifest.json（构建时预编译）
  │   → 毫秒级完成
  │
  └─ 回退路径：
      文件系统扫描 clis/ 目录
      → 动态 import 每个模块
      → 注册到全局注册表
```

**Manifest 预编译**（`src/build-manifest.ts`）：
- 构建时扫描 `clis/` 目录的 892 个 JS 文件
- 提取命令元数据到 `cli-manifest.json`
- 运行时直接读取 JSON，避免动态 import 的性能开销

**懒加载设计**：
- 命令注册时只存元数据（名称、参数、描述）
- 命令执行时才 import 完整模块（func/pipeline）
- 大幅减少冷启动时间

### 3.3 命令执行引擎

**执行流程**（`src/execution.ts`）：

```
用户输入命令
    ↓
Commander.js 解析参数
    ↓
executeCommand()
    ├─ 1. 参数验证 (coerceAndValidateArgs)
    │     类型转换、必填检查、默认值填充
    │
    ├─ 2. 浏览器会话准备 (browserSession)
    │     根据策略获取对应的浏览器后端
    │     CDPBridge 或 BrowserBridge
    │
    ├─ 3. 前置导航 (resolvePreNav)
    │     根据命令配置导航到目标页面
    │
    ├─ 4. 生命周期钩子 (onBeforeExecute)
    │
    ├─ 5. 执行核心逻辑
    │     ├─ func 模式：调用 TypeScript 函数
    │     └─ pipeline 模式：按步骤执行 YAML 管道
    │
    ├─ 6. 结果渲染
    │     根据 --format 参数格式化输出
    │
    └─ 7. 生命周期钩子 (onAfterExecute)
```

### 3.4 浏览器操作抽象层

**IPage 接口**（`src/types.ts`，第 47-103 行）统一了所有浏览器操作：

| 操作类别 | 方法 | 说明 |
|----------|------|------|
| 导航 | `goto(url)` | 页面导航 |
| 交互 | `click()`, `typeText()`, `pressKey()` | 用户交互模拟 |
| 信息 | `snapshot()`, `evaluate()` | 页面状态获取 |
| 网络 | `installInterceptor()`, `getInterceptedRequests()` | 请求拦截 |
| iframe | `frames()`, `evaluateInFrame()` | 跨域 iframe 操作 |
| 原生 | `nativeClick()`, `nativeType()` | CDP 级操作（富编辑器） |

**两种实现**：
- `CDPBridge`：直接通过 CDP WebSocket 连接
- `BrowserBridge`：通过 Chrome 扩展 → Daemon → WebSocket 桥接

### 3.5 Daemon-Extension 桥接

**Daemon**（`src/daemon.ts`）：
- 监听端口 19825
- 按需启动，空闲超时自动退出（默认 30 秒，交互模式 10 分钟）
- 版本不匹配时自动重启

**Chrome 扩展**（`extension/src/background.ts`）：
- Service Worker 模式
- WebSocket 连接 Daemon，指数退避重连（最大 60 秒）
- 控制台日志转发到 Daemon

**安全措施**：
- Origin 检查：只接受来自扩展的连接
- 自定义头部验证
- 无 CORS（不暴露 HTTP 端点）
- 1MB 请求体限制

### 3.6 Pipeline 引擎

**管道系统**（`src/pipeline/`）：

```
YAML 定义                    步骤执行器
steps:                       executor.ts
  - fetch: url               ├─ fetch → HTTP 请求
  - parse: json              ├─ parse → JSON/HTML 解析
  - extract: $.items         ├─ extract → 数据提取
  - transform:               └─ transform → 数据转换
      field: title
      map: uppercase
```

**核心特性**：
- 步骤注册表（`registry.ts`）：动态注册自定义步骤
- 模板变量（`template.ts`）：支持 `{{prev.field}}` 引用上一步结果
- 重试机制：可配置每步的重试次数和间隔

### 3.7 认证策略推断

**分析模块**（`src/analysis.ts`）：

```javascript
// URL 模式标准化
urlToPattern(url) → 识别 API 路径模式

// 数组路径发现
findArrayPath(data) → 自动定位数据数组

// 字段角色检测
detectFieldRoles(data) → 识别 title/author/score 等语义

// 认证策略推断
inferStrategy(url, headers) → 从技术特征推断认证方式
```

**推断规则**：
- Bearer Token in headers → HEADER
- CSRF Token in headers → HEADER
- 签名参数（如 `w_rid`, `wts`）→ INTERCEPT
- 默认 → COOKIE

### 3.8 插件系统

**插件管理**（`src/plugin.ts`）：
- 安装：`opencli plugin install github:user/opencli-plugin-xxx`
- 发现：自动扫描已安装插件的 `clis/` 目录
- 锁定：`~/.opencli/plugins.lock.json` 记录版本
- 更新：`opencli plugin update --all`

**外部 CLI 集成**（`~/.opencli/external-clis.yaml`）：
- 零配置透传执行外部 CLI（gh、docker、obsidian 等）
- 自动安装缺失的依赖
- Tab 补全支持所有站点和命令

---

## 四、架构洞察

### 洞察 1：Manifest 预编译实现毫秒级冷启动

构建时将 892 个适配器文件的元数据扫描到 `cli-manifest.json`，运行时直接读取 JSON 而非动态 import 每个文件。这是从秒级到毫秒级的关键优化。

**设计决策**：牺牲了构建时的速度（需要扫描所有文件），换取运行时的极致性能。

### 洞察 2：全局单例 + 懒加载的内存效率

`globalThis.__opencli_registry__` 确保跨模块只有一个注册表实例。命令注册时只存元数据（几十字节），执行时才 import 完整模块（可能几十 KB）。在 90+ 适配器场景下，这种设计避免了启动时加载所有代码。

### 洞察 3：Daemon-Extension 的精妙生命周期

Daemon 不常驻内存，而是按需启动：
1. 命令需要浏览器 → 启动 Daemon
2. 命令执行完毕 → 空闲倒计时
3. 超时无新命令 → Daemon 退出

配合 Chrome 扩展的指数退避重连，实现了"零资源占用时的即时响应"。

### 洞察 4：认证推断降低了适配器编写门槛

开发者只需指定站点和命令，系统自动推断认证方式。这意味着写一个新适配器只需要关注业务逻辑（抓什么数据），而非技术细节（怎么认证）。

### 洞察 5：AI Agent 的全链路优化

从 Skill 系统（指导编写）→ 结构化输出（AI 可消费）→ 站点记忆（知识累积）→ 自动修复（错误恢复），整个产品围绕 AI Agent 的使用场景做了端到端优化。

---

## 五、关键文件地图

| 文件 | 职责 | 重要度 |
|------|------|--------|
| `src/main.ts` | 入口，启动优化，快速路径 | ★★★★★ |
| `src/registry.ts` | 全局命令注册表，策略枚举 | ★★★★★ |
| `src/discovery.ts` | CLI 发现，manifest 快速路径 | ★★★★★ |
| `src/execution.ts` | 命令执行引擎 | ★★★★★ |
| `src/commanderAdapter.ts` | 注册表 → Commander 桥接 | ★★★★ |
| `src/analysis.ts` | 认证推断，字段角色检测 | ★★★★ |
| `src/browser/cdp.ts` | CDP 客户端 | ★★★★ |
| `src/daemon.ts` | Daemon 守护进程管理 | ★★★★ |
| `src/pipeline/executor.ts` | 管道步骤执行器 | ★★★ |
| `src/pipeline/registry.ts` | 管道步骤注册表 | ★★★ |
| `src/types.ts` | IPage 接口定义 | ★★★★ |
| `src/constants.ts` | 字段语义映射 | ★★★ |
| `extension/src/background.ts` | Chrome 扩展 Service Worker | ★★★★ |
| `cli-manifest.json` | 预编译命令清单 | ★★★★ |
| `clis/` | 90+ 站点适配器 | ★★★ |
| `skills/` | AI Agent 技能包 | ★★★★ |

---

## 版本信息

- **分析版本**：v1.7.8
- **Commit**：54ffc88
- **分析日期**：2026-04-27
- **源码规模**：892 个适配器 JS 文件 + 81 个核心 TypeScript 模块
