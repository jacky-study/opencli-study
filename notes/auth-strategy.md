---
article_id: OBA-2tpxpr5e
tags: [opencli, auth-strategy, browser-bridge, architecture]
type: concept
updated_at: 2026-04-25
created_at: 2026-04-25
source: conversation
---

# OpenCLI 5 层认证策略

> OpenCLI 如何适配不同网站的身份认证需求，从无需认证到完全 DOM 交互，形成了一套渐进式的认证架构。

## 背景

OpenCLI 定位是"让任何网站变成 CLI"，但不同网站的访问权限差异巨大：有的完全公开（HackerNews），有的需要登录态（知乎），有的甚至没有 API 只能操作页面（Notion Desktop）。为此 OpenCLI 设计了 5 层认证策略，按复杂度递增适配各种场景。

## 5 层认证策略

| 标签 | 认证方式 | 工作原理 | 典型场景 |
|------|----------|----------|----------|
| `[public]` | 无认证 | 直接 HTTP fetch，不需要任何身份信息 | HackerNews、BBC、IMDb |
| `[cookie]` | 复用浏览器 Cookie | 通过 Browser Bridge 拿到 Chrome 中已登录的 cookies，随请求发送 | 知乎、Bilibili、小红书 |
| `[header]` | 自定义请求头 | 注入 API Key 等认证头信息 | LinkedIn 等基于 API Key 的服务 |
| `[intercept]` | 拦截网络请求 | 通过 CDP 拦截页面的 GraphQL/XHR 请求捕获数据 | Twitter/X、Product Hunt |
| `[ui]` | DOM 交互 | 通过 accessibility snapshot（无障碍树快照）模拟用户操作 | Notion Desktop、Instagram 发帖 |

> [!code-ref] 认证策略定义
> **仓库**: opencli | **路径**: `docs/developer/architecture.md:60-70`
> 🔗 [GitHub](https://github.com/jackwener/opencli/blob/main/docs/developer/architecture.md#L60-L70)
>
> 架构文档中将这 5 种策略定义为 Authentication Strategies 章节。
> 注意：文档标题写"3-tier"但实际已扩展为 5 种，属于文档滞后于代码演进的情况。

## 设计洞察

### 渐进式复杂度

这 5 层策略的核心设计思路是**按复杂度递增**：

1. **public → cookie**：从无状态到有状态，引入浏览器会话依赖
2. **cookie → header**：从浏览器 cookies 到自定义认证，适配 API 服务
3. **header → intercept**：从主动请求到被动拦截，解决没有公开 API 的场景
4. **intercept → ui**：从网络层到 DOM 层，处理连 API 拦截都无法覆盖的桌面应用

每一层都意味着更强的能力，但也更高的运行时要求和更脆弱的依赖关系。

### `[cookie]` 模式的关键前提

`[cookie]` 模式是最常用的认证策略，但它有三个硬性前提：

1. **Chrome 必须运行** — Browser Bridge 需要通过 CDP 连接 Chrome
2. **目标站点必须已登录** — cookies 中需要包含有效的 session
3. **Browser Bridge 扩展已安装** — 作为 Chrome 和 CLI 之间的桥梁

> [!code-ref] 知乎热榜命令的 cookie 使用
> **仓库**: opencli | **路径**: `clis/zhihu/hot.js:13-17`
> 🔗 [GitHub](https://github.com/jackwener/opencli/blob/main/clis/zhihu/hot.js#L13-L17)
>
> 通过 `credentials: 'include'` 在浏览器上下文中发起 fetch 请求，
> 自动携带当前域的 cookies。这意味着脚本运行在 Chrome 的页面环境中，
> 而非 Node.js 直接请求，巧妙绕过了 CORS 和 cookie 传递问题。

### `[ui]` 模式的定位

`[ui]` 模式是最后的兜底方案，通常用于两种场景：

- **写操作**：发布内容、点赞、评论等需要 UI 交互的操作（如 Instagram `post`、Jike `create`）
- **桌面应用**：没有 Web API 的应用（如 Notion Desktop），只能通过 DOM 读取和操作

这种模式依赖 accessibility tree 而非 CSS 选择器，因此对 UI 变化的容忍度比传统爬虫更高。

## 实战案例：知乎热榜返回空结果

运行 `opencli zhihu hot --limit 5 -v` 时返回 `0 items`，典型原因是 `[cookie]` 模式的前置条件未满足：

```
[1/4] navigate → https://www.zhihu.com     → (no data)   ← 正常
[2/4] evaluate → fetch API                  → 0 items     ← 问题在这
[3/4] map                                    → 0 items
[4/4] limit                                  → 0 items
```

**排查步骤**：

1. 在 Chrome 中打开 `https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=5`
2. 如果返回 JSON 数据（含 `data` 数组）→ API 正常，问题在 Browser Bridge 连接
3. 如果返回空或报错 → 知乎未登录，需先在 Chrome 中登录

**根因**：evaluate 步骤的 `fetch` 使用 `credentials: 'include'`，依赖浏览器 cookies。未登录或 Bridge 断连都会导致 cookies 缺失，API 返回空。

## 参考

- [[05-opencli-browser-bridge-mechanism|浏览器桥接机制]] — Browser Bridge 的实现细节
- [[06-browser-bridge-csp-troubleshooting|CSP 排查]] — Browser Bridge 相关的踩坑记录
- [[01-architecture|整体架构]] — OpenCLI 架构概览
- [OpenCLI Architecture](https://github.com/jackwener/opencli/blob/main/docs/developer/architecture.md)
- [OpenCLI Zhihu Adapter](https://github.com/jackwener/opencli/blob/main/docs/adapters/browser/zhihu.md)
