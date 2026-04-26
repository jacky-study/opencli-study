---
article_id: OBA-ast8m3v5
tags: [opencli, cheatsheet, auth, authentication]
type: cheatsheet
created_at: 2026-04-27
---

# OpenCLI 认证策略速查卡

> 5 层认证策略，从简到繁，帮你在适配新网站时快速选择正确的认证方式。

---

## 策略对比

| 策略 | 标签 | 需要 Chrome | 复杂度 | 典型场景 |
|------|------|:-----------:|:------:|----------|
| 无认证 | `[public]` | 否 | ★☆☆☆☆ | HackerNews、BBC、IMDb |
| Cookie 复用 | `[cookie]` | **是** | ★★★☆☆ | 知乎、B 站、小红书 |
| 自定义请求头 | `[header]` | 否 | ★★☆☆☆ | LinkedIn、API Key 服务 |
| 网络拦截 | `[intercept]` | **是** | ★★★★☆ | Twitter/X、Product Hunt |
| DOM 交互 | `[ui]` | **是** | ★★★★★ | Notion Desktop、Instagram 发帖 |

---

## 逐层详解

### 1. `[public]` — 无认证

```
请求方式：Node.js 直接 HTTP fetch
前置条件：无
```

**适用**：完全公开的网站，不需要任何登录态。

**示例适配器**：`clis/hackernews/`、`clis/imdb/`

---

### 2. `[cookie]` — 复用浏览器 Cookie

```
请求方式：Browser Bridge → Chrome 页面内 fetch（credentials: 'include'）
前置条件：Chrome 运行 + 目标站点已登录 + 扩展已安装
```

**适用**：需要登录态的网站，且该网站有可用的 API。

**关键代码模式**：
```javascript
// 在 Chrome 页面上下文中 fetch，自动携带 cookies
const resp = await fetch(apiUrl, { credentials: 'include' });
```

**排查 Cookie 无效**：
1. 在 Chrome 中直接访问目标 API URL
2. 返回正常 JSON → API 没问题，检查 Browser Bridge 连接
3. 返回空/报错 → 未登录，先在 Chrome 中登录

---

### 3. `[header]` — 自定义请求头

```
请求方式：Node.js fetch + 自定义 headers
前置条件：有 API Key 或 Token
```

**适用**：基于 API Key 认证的服务。

---

### 4. `[intercept]` — 拦截网络请求

```
请求方式：CDP 拦截页面的 GraphQL/XHR 请求
前置条件：Chrome 运行 + 扩展已安装
```

**适用**：网站有 API 但未公开、或 API 需要复杂签名的情况。

**工作原理**：在浏览器中正常操作，CDP 在后台捕获所有网络请求和响应。

---

### 5. `[ui]` — DOM 交互

```
请求方式：accessibility snapshot（无障碍树快照） + 模拟操作
前置条件：Chrome 运行 + 扩展已安装
```

**适用**：没有 API 的桌面应用，或需要模拟用户操作（发帖、点赞等）。

**特点**：基于 accessibility tree 而非 CSS 选择器，对 UI 变化容忍度更高。

---

## 策略选择决策树

```
目标网站需要认证吗？
├── 不需要 → [public] ← 最简单
└── 需要
    ├── 有 API Key/Token？
    │   └── 是 → [header]
    └── 没有公开 API？
        ├── 能通过浏览器 Cookie 访问？
        │   └── 是 → [cookie] ← 最常用
        └── 需要捕获隐藏 API？
            ├── 是 → [intercept]
            └── 只能操作 UI？
                └── 是 → [ui] ← 最后手段
```

---

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| cookie 模式返回空结果 | Chrome 未登录目标站点 | 在 Chrome 中手动登录 |
| cookie 模式连接失败 | Browser Bridge 断连 | 运行 `opencli doctor` 检查 |
| intercept 捕获不到请求 | 页面未完成加载 | 增大等待时间 |
| ui 模式元素定位失败 | UI 发生变化 | 重新获取 accessibility snapshot |

---

> [!seealso] 相关笔记
> - 完整分析 → [[auth-strategy|5 层认证策略]]
> - 桥接机制 → [[05-opencli-browser-bridge-mechanism|浏览器桥接机制]]
> - CSP 排查 → [[06-browser-bridge-csp-troubleshooting|CSP 三层限制与排查]]
> - 命令速查 → [[browser-commands-cheat-sheet|Browser 命令速查卡]]
