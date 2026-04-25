---
article_id: OBA-a3u0hadi
tags: [opencli, CSP, Chrome扩展, CDP, 踩坑记录, 浏览器自动化]
type: troubleshooting
updated_at: 2026-04-24
created_at: 2026-04-24
source: conversation
---

# 浏览器扩展执行动态 JS 的 CSP 问题与解决方案

> 核心结论：在 Chrome 扩展中执行动态 JS 代码，CSP 有三层限制。最终只有 CDP（Chrome DevTools Protocol）能保证在所有网站上可靠执行。OpenCLI 也是这么做的。

## 问题背景

在开发 OpenCLI 的最小化 Demo 时，需要在 Chrome 扩展中执行动态 JS 代码（字符串形式的代码）。先后尝试了 4 种方案，前 3 种都被 CSP 拦截。

## CSP 三层限制

CSP 不是一层墙，而是三道独立的门：

| 层级 | 作用范围 | 默认策略 | 拦截了什么 |
|------|----------|----------|------------|
| **第1层：扩展 CSP** | Service Worker 里的代码 | `script-src: 'self'` | `new Function()`、`eval()` |
| **第2层：页面 CSP** | `world: "MAIN"` 上下文 | 取决于目标网站 | `<script>` 内联、`eval()` |
| **第3层：CDP** | V8 引擎层面 | 无限制 | 不受任何 CSP 约束 |

```
┌─────────────────────────────────────┐
│  扩展 Service Worker CSP             │  ← 最严格，禁止 eval/Function
│  chrome.scripting.executeScript     │
│  (默认 ISOLATED world)               │
├─────────────────────────────────────┤
│  目标页面 CSP                        │  ← 因网站而异
│  world: "MAIN" 上下文                │     bilibili 拦了 inline + eval
├─────────────────────────────────────┤
│  CDP Runtime.evaluate               │  ← 完全绕过 CSP
│  chrome.debugger API                │     在 V8 引擎层面执行
└─────────────────────────────────────┘
```

## 四次尝试过程

### 尝试 1：`new Function()` — 扩展 CSP 拦截

```
Error: Evaluating a string as JavaScript violates the following
Content Security Policy directive: script-src 'self' 'wasm-unsafe-eval'
```

MV3 Service Worker 的 CSP 禁止 `eval()` 和 `new Function()`，无法绕过。

> [!code-ref] 扩展 background.js 中错误的代码
> **仓库**: jackwener/opencli | **路径**: `extension/src/background.ts`
> 🔗 [GitHub](https://github.com/jackwener/opencli/blob/main/extension/src/background.ts)
>
> 真正的 OpenCLI 扩展没有这个问题——它使用 CDP 而非 `chrome.scripting.executeScript`。

### 尝试 2：`<script>` 标签注入 — 页面 CSP 拦截

通过 `world: "MAIN"` 绕过扩展 CSP，在页面上下文中创建 `<script>` 元素注入代码。结果被 bilibili.com 的页面 CSP 拦截——`script-src` 不允许 inline script。

现象：**静默失败，Promise 永远不 resolve，导致 15 秒超时**。这是最危险的失败模式——没有报错，只是卡住。

### 尝试 3：`eval()` + `world: "MAIN"` — 页面 CSP 再次拦截

改为在 MAIN world 中直接调用 `eval()`。bilibili.com 的 CSP 同样禁止了 `unsafe-eval`。

同样是静默超时。

### 尝试 4：`chrome.debugger` API（CDP）— 成功

```js
await chrome.debugger.attach({ tabId }, "1.3");
const res = await chrome.debugger.sendCommand(
  { tabId },
  "Runtime.evaluate",
  {
    expression: `(async () => { ${code} })()`,
    awaitPromise: true,
    returnByValue: true,
  }
);
await chrome.debugger.detach({ tabId });
```

CDP 在 V8 引擎层面执行代码，完全绕过 CSP。需要 `debugger` 权限，Chrome 顶部会显示调试提示条。

## 面试关键问题

### Q：Chrome 扩展执行动态 JS 有哪几种方式？各受什么限制？

| 方式 | CSP 限制 | 适用场景 |
|------|----------|----------|
| `chrome.scripting.executeScript` + `func` | 扩展 CSP | 函数体固定的逻辑 |
| `world: "MAIN"` + `eval()` | 页面 CSP | 目标网站允许 unsafe-eval 时 |
| `chrome.debugger` (CDP) | 无限制 | 需要执行任意代码时 |

### Q：为什么 Puppeteer/Playwright 不受 CSP 限制？

它们直接通过 CDP WebSocket 连接浏览器，走的是 `Runtime.evaluate`，在 V8 层面执行，与页面 CSP 完全无关。

## 预防措施

1. **需要执行动态代码 → 直接用 CDP**，不要在其他方案上试错
2. **遇到"静默挂起" → 首先怀疑 CSP**，CSP 拦截不总是报错，有时只是静默失败
3. **Daemon 必须加超时**，否则 CLI 会永远等待无响应的命令
4. **Demo 项目用独立端口**，避免和正式服务冲突

## 相关文章

- [[05-opencli-browser-bridge-mechanism]] — 浏览器桥接机制的完整架构
- [[04-real-browser-wakeup-and-web-access-vs-midscene]] — 浏览器唤起方案对比
