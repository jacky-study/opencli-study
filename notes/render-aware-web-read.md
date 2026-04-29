---
article_id: OBA-wt3k7np2
created_at: 2026-04-29
tags: [browser, web-read, render-aware, cdp, dom-snapshot]
---

# Render-Aware Web Read：渲染感知的网页读取机制

> 关联教程：[explorer/02-opencli-guide.md](../explorer/02-opencli-guide.md)

## 问题

OpenCLI 的 `web read` 命令新增了"render-aware"（渲染感知）能力。这个功能是怎么设计的？它如何处理动态网页、iframe、网络请求等复杂场景？

## 一、功能概述

**"render-aware"** 意味着 `web read` 命令能够感知和等待页面的动态渲染过程，而不是简单地等待固定时间后提取内容。

### 解决的核心问题

| 问题 | 说明 |
|------|------|
| **动态内容** | 现代网页大量使用 AJAX、React/Vue 等，内容是动态加载的 |
| **iframe 内容** | 很多网站用 iframe 嵌入内容，传统方式无法提取 |
| **API 请求依赖** | 某些页面依赖 API 请求填充数据，需要等网络稳定 |
| **DOM 稳定性** | 避免在页面还在变化时提取不完整的内容 |

### 变化前 vs 变化后

| 维度 | 变化前 | 变化后（render-aware） |
|------|--------|----------------------|
| 等待策略 | 固定时间等待 | DOM 稳定性检测 + 网络空闲检测 |
| iframe 处理 | 忽略或简单提取 | 同源 iframe 智能合并 |
| 网络感知 | 无 | 监听网络请求，等待 API 返回 |
| 诊断能力 | 无 | `--diagnose` 输出完整诊断信息 |

## 二、核心代码流程

### 完整调用链

```
用户命令: opencli web read <url>
    ↓
1. 页面导航: await page.goto(url)
    ↓
2. 渲染等待策略:
   - --wait-for selector: 等待特定选择器出现
   - --wait-until domstable: 等待 DOM 稳定（默认）
   - --wait-until networkidle: 等待网络空闲
    ↓
3. 内容提取: page.evaluate(buildRenderAwareExtractorJs({ frames: mode }))
    ↓
4. 网络捕获读取: drainNetworkCapture(page, networkEntries)
    ↓
5. 诊断输出: formatDiagnostics() → stderr
    ↓
6. 文章下载: downloadArticle() → 转换为 Markdown
```

### 关键源码文件

| 文件 | 作用 |
|------|------|
| `clis/web/read.js` | web read 命令主逻辑 |
| `src/browser/dom-helpers.ts` | DOM 稳定性检测（MutationObserver） |
| `src/browser/page.ts` | CDP 网络捕获 API |
| `extension/src/cdp.ts` | Chrome 扩展端 CDP 实现 |

## 三、渲染感知的判断逻辑

### 1. 三种等待策略

`read.js` 中的策略选择（`normalizeWaitUntil` 函数）：

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `domstable`（默认） | 用 MutationObserver 监听 DOM 变化 | 大多数动态网页 |
| `networkidle` | 监听网络请求，1 秒内无新请求 | 依赖 API 的数据页面 |
| `selector`（--wait-for） | 等待特定 CSS 选择器出现 | 已知目标元素的选择器 |

### 2. DOM 稳定性检测

`src/browser/dom-helpers.ts` 中的 `waitForDomStableJs`：

```javascript
// 核心思路：MutationObserver + 静默期 + 最大等待
new Promise(resolve => {
  const obs = new MutationObserver(resetQuiet);
  obs.observe(document.body, { childList: true, subtree: true, attributes: true });

  const resetQuiet = () => {
    clearTimeout(timer);
    timer = setTimeout(() => done('quiet'), quietMs);
  };

  const cap = setTimeout(() => done('capped'), maxMs);
});
```

**工作原理**：
- MutationObserver 监听 DOM 的所有变化（子节点、属性、子树）
- 每次变化重置"静默计时器"
- 静默超过 `quietMs` 毫秒 → 判定 DOM 稳定
- 超过 `maxMs` 毫秒 → 强制结束（兜底）

### 3. 网络空闲检测

`clis/web/read.js` 中的 `waitForNetworkIdle`：

```javascript
async function waitForNetworkIdle(page, maxSeconds, sink) {
  const timeoutMs = Math.max(1, Number(maxSeconds) || 1) * 1000;
  const deadline = Date.now() + timeoutMs;
  let quietSince = Date.now();

  while (Date.now() < deadline) {
    const entries = await drainNetworkCapture(page, sink);
    if (entries.length > 0) quietSince = Date.now();
    if (Date.now() - quietSince >= NETWORK_IDLE_QUIET_MS) return { ok: true };
    await sleep(NETWORK_IDLE_POLL_MS);
  }
  return { ok: false, timedOut: true };
}
```

**关键参数**：
- `NETWORK_IDLE_QUIET_MS = 1000`：1 秒内没有新网络请求才算"空闲"
- `NETWORK_IDLE_POLL_MS = 500`：每 500ms 检查一次

### 4. 超时策略

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--wait` | 3（秒） | 最大等待时间 |
| `--wait-for selector` | 等到选择器出现或超时 | 最长 `wait * 1000` 毫秒 |
| `--wait-until networkidle` | 最长 `wait` 秒 | 1 秒静默期 |

## 四、与浏览器桥接的关系

### 命令路由流程

```
CLI 命令 → Daemon (localhost:19825) → Chrome Extension → CDP → 页面执行
```

### CDP 网络捕获 API

**`src/browser/page.ts`** 提供两个核心方法：

```typescript
// 启动网络捕获
async startNetworkCapture(pattern: string = ''): Promise<boolean> {
  await sendCommand('network-capture-start', { pattern, ...this._cmdOpts() });
  return true;
}

// 读取捕获的网络请求
async readNetworkCapture(): Promise<unknown[]> {
  const result = await sendCommand('network-capture-read', { ...this._cmdOpts() });
  return Array.isArray(result) ? result : [];
}
```

**`extension/src/cdp.ts`** 在 Chrome 扩展端实现：

```typescript
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.requestWillBeSent') { /* 记录请求 */ }
  else if (method === 'Network.responseReceived') { /* 记录响应元数据 */ }
  else if (method === 'Network.loadingFinished') {
    chrome.debugger.sendCommand({tabId}, 'Network.getResponseBody',
      {requestId: params.requestId});  // 获取响应体
  }
});
```

### 响应体大小保护

```typescript
// src/browser/cdp.ts
export const CDP_RESPONSE_BODY_CAPTURE_LIMIT = 8 * 1024 * 1024; // 8MB
```

超过 8MB 的响应体会被截断，同时标记 `responseBodyFullSize` 和 `responseBodyTruncated`。

## 五、内容提取的智能策略

### 1. 内容定位优先级

`buildRenderAwareExtractorJs` 中的选择逻辑：

```
<article> → [role="main"] → <main> → 最大文本密度块 → <body>
```

如果页面有多个 `<article>`，选择文本量最大的那个。

### 2. iframe 内容合并

对于同源 iframe，render-aware 模式会：

1. 遍历所有 iframe，检测是否同源且可访问
2. 克隆 iframe 的 body 内容
3. 将链接转为绝对 URL
4. 用 `<section data-opencli-iframe-source="url">` 包裹
5. 添加语义化标题（"来自 iframe: ..."）
6. 替换原始的 iframe 元素

### 3. 懒加载图片处理

```javascript
clone.querySelectorAll('img').forEach(img => {
  const real = img.getAttribute('data-src')
    || img.getAttribute('data-original')
    || img.getAttribute('data-lazy-src');
  if (real) img.setAttribute('src', absolutize(real, window.location.href));
});
```

自动识别 `data-src`、`data-original`、`data-lazy-src` 等常见懒加载属性。

### 4. "有趣"网络请求过滤

```javascript
function isInterestingNetworkEntry(entry) {
  const staticAsset = /\.(js|css|png|jpg|gif|svg|woff|ico)(\?|$)/i.test(url);
  const noisy = /analytics|tracking|telemetry|beacon|pixel|gtag/i.test(url);
  const apiLikeUrl = /\/(api|ajax|graphql|rest)(\/|$)/i.test(url);
  const dataLikeContent = ct.includes('json') || ct.includes('xml');
  return !staticAsset && !noisy && (dataLikeContent || apiLikeUrl || method !== 'GET');
}
```

过滤掉静态资源和分析追踪请求，只保留真正的数据 API。

## 六、诊断模式（--diagnose）

`--diagnose` 参数输出完整调试信息到 stderr：

```
[web-read diagnose]
url: https://example.com
frames: 3, included_same_origin: 1
  [frame 0] same-origin accessible text=1234 https://embed.example.com
  [frame 1] cross-origin blocked text=0 https://ads.example.com
  [frame 2] same-origin accessible text=0 https://empty.example.com
empty_containers: 2
  main: div.content (https://example.com)
  iframe: div.holder (https://embed.example.com)
network_capture: enabled, entries=12, api_like=3
  GET 200 application/json https://api.example.com/data
  POST 200 application/json https://api.example.com/submit
```

诊断信息包括：
- iframe 数量和状态（同源/跨域、可访问/不可访问）
- 空容器（可能是内容没加载完）
- 网络请求统计（总数、API 类请求数、详情）

## 七、设计亮点

### 1. 渐进式增强策略

```
基础层: 固定等待时间（--wait 3）
  ↓
进阶层: DOM 稳定性检测（MutationObserver）
  ↓
高级层: 网络空闲检测（CDP Network domain）
  ↓
专家层: 特定选择器等待（支持 iframe 跨帧查找）
```

### 2. 零侵入设计

- 所有逻辑通过 `page.evaluate()` 在浏览器中执行
- 不需要修改目标网站
- 利用标准 Web API（MutationObserver、querySelector）

### 3. 防御性编程

- 跨域 iframe 不报错，静默跳过
- 网络捕获失败不影响主流程
- 超时兜底防止无限等待
- 8MB 响应体截断防止内存溢出

## 关键发现

1. **render-aware 的核心是"等待策略"的升级**：从固定时间 → DOM 稳定 → 网络空闲 → 选择器匹配，形成四层渐进策略
2. **iframe 合并是重要特性**：同源 iframe 内容直接合并到主文档，解决了传统爬虫无法提取 iframe 内容的痛点
3. **诊断模式体现了工程成熟度**：内置诊断工具帮助用户理解提取过程，降低调试成本
4. **网络捕获与 CDP 深度集成**：通过 Chrome 扩展的 CDP 协议实现网络请求的捕获和分析，不是简单的 fetch/XHR 拦截
