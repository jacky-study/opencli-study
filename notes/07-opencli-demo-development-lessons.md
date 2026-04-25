---
article_id: OBA-0eso18jc
tags: [opencli, 开发经验, Demo, Node.js, 模板字符串, 进程通信]
type: note
updated_at: 2026-04-24
created_at: 2026-04-24
source: conversation
---

# OpenCLI 最小化 Demo 开发经验总结

> 用 4 个文件约 150 行代码复刻 OpenCLI 核心机制，经历 7 次修改。核心教训：模仿别人系统写 Demo 时，不要从"我猜它怎么工作"出发，而要从"它为什么这么设计"出发。

## Demo 结构

```
demo/
├── package.json           # "type": "module"（踩坑1）
├── daemon.js              # HTTP + WebSocket 中转（40行）
├── cli.js                 # 命令行客户端（50行）
└── extension/
    ├── manifest.json      # Chrome 扩展配置
    └── background.js      # 扩展脚本（40行）
```

> [!code-ref] 真正的 OpenCLI 对应文件
> **仓库**: jackwener/opencli
> - Daemon: `src/daemon.ts` — 完整版有安全校验、心跳、超时
> - Browser Bridge: `src/browser/bridge.ts` — 自动启动 Daemon + 等待扩展
> - Page: `src/browser/page.ts` — CDP 命令封装（evaluate、click、screenshot）
> - 命令定义: `clis/bilibili/hot.js` — 声明式 DSL
>
> 🔗 [GitHub src/daemon.ts](https://github.com/jackwener/opencli/blob/main/src/daemon.ts)

## 7 次修改时间线

| # | 问题 | 根因 | 教训 |
|---|------|------|------|
| 1 | Module type 警告 | package.json 缺 `"type": "module"` | ES Module 项目必须声明 |
| 2 | `limit is not defined` | 模板字符串 `${limit}` 定义时求值 | 转义 `\${limit}` 或用普通字符串 |
| 3 | `bilibili/undefined` | argv 解析逻辑错 | 先 `console.log(argv)` 看真实值 |
| 4 | `X-OpenCLI header` | 端口和正式 OpenCLI 冲突 | Demo 第一件事：换端口 |
| 5 | `unsafe-eval CSP` | MV3 Service Worker 禁 eval | 扩展 CSP 是第一道墙 |
| 6 | evaluate 超时 | `<script>` 注入被页面 CSP 拦 | 页面 CSP 是第二道墙 |
| 7 | 再次超时 | `eval()` 也被页面 CSP 拦 | CDP 是唯一可靠方案 |

## 关键经验

### 1. 端口冲突是隐形杀手

Demo 和正式服务用同一端口，请求打到了正式 Daemon 上，错误信息完全不相关。**开发 Demo 时第一件事就是换端口**。

### 2. 先加日志，再猜问题

Daemon 没有 stdout 日志，CLI 卡住时完全不知道卡在哪。加了日志立刻定位到"navigate 成功、evaluate 超时"。

```js
// Daemon 关键日志点
console.log(`📩 收到命令: ${body.action}`);
console.log(`   → 已转发给扩展`);
// 加超时，不要永远等待
const timer = setTimeout(() => resolve({ ok: false, error: "超时" }), 15000);
```

### 3. 模板字符串求值时机

```js
// ❌ 定义时求值，limit 还不存在
code: `...?ps=${limit}&pn=1...`

// ✅ 转义成字面量，运行时再替换
code: `...?ps=\${limit}&pn=1...`
step.code.replace("${limit}", 5);
```

**模板字符串在定义时求值**，不是"使用时"。这是 JS 的基本功考点。

### 4. 不要在简单方案上浪费时间

`<script>` 标签注入方案写了 20 行（随机回调名、setInterval 轮询、window 全局变量传递结果），被 CSP 一刀毙命。最终 CDP 方案只 5 行。

**在浏览器扩展场景下，越复杂的工作区越容易被 CSP 打穿。直接用最底层 API 反而最简。**

### 5. 模仿系统的核心原则

> 每一步"简化"都可能引入新问题。

OpenCLI 用 CDP 不是因为 fancy，是因为其他方案都被 CSP 挡了。砍掉 CDP 改用 `chrome.scripting.executeScript`，看起来简化了，实际上砍掉的是处理边界情况的正确方案。

**理解"为什么"比理解"怎么做"更重要。**

## 进程间通信架构

```
CLI (node)         Daemon (node)           Chrome Extension (MV3)
  │                     │                        │
  │  HTTP POST          │                        │
  │────────────────────▶│  WebSocket             │
  │                     │───────────────────────▶│
  │                     │                        │  CDP Runtime.evaluate
  │                     │  ◀──────────────────── │  返回结果
  │  HTTP Response      │                        │
  │◀────────────────────│                        │
```

为什么用两种协议：
- **CLI → Daemon 用 HTTP**：请求-响应模型，简单可靠
- **Daemon → 扩展用 WebSocket**：扩展不能启动 HTTP Server，只能被动连接

## 相关文章

- [[06-browser-bridge-csp-troubleshooting]] — CSP 问题的完整排查过程
- [[05-opencli-browser-bridge-mechanism]] — 浏览器桥接机制架构
- [[01-architecture]] — OpenCLI 整体架构
