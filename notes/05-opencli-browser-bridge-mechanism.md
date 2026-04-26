---
article_id: OBA-hkwlo3qp
title: OpenCLI 浏览器桥接机制 —— 从命令行到浏览器的完整链路
tags: [opencli, browser-bridge, daemon, chrome-extension, cdp]
created_at: 2026-04-24
updated_at: 2026-04-25
---

# OpenCLI 浏览器桥接机制

> 一句话概括：OpenCLI 通过 Chrome 扩展在真实浏览器环境里执行 JS，借浏览器之手调用网站 API，天然绕过反爬限制。

## 一、这条命令背后发生了什么？

```bash
opencli bilibili hot --limit 5
```

实际上经历了 4 个进程的协作：

```
终端 (CLI)
  |  opencli bilibili hot --limit 5
  v
CLI 进程 --- HTTP POST ---> Daemon (localhost:19825, 后台常驻)
                                  |
                                  |  WebSocket 转发
                                  v
                            Chrome 浏览器扩展
                                  |
                                  |  在浏览器里执行 JS
                                  v
                            Bilibili API (带真实 cookie)
                                  |
                                  v
                            结果原路返回 CLI -> 打印表格
```

## 二、命令声明（clis/bilibili/hot.js）

每个命令是一个独立 JS 文件，用声明式 DSL 注册。核心结构：

```javascript
cli({
    site: 'bilibili',          // 所属网站
    name: 'hot',               // 子命令名 -> opencli bilibili hot
    domain: 'www.bilibili.com', // cookie 上下文域名
    columns: ['rank', 'title', 'author', 'play', 'danmaku'], // 输出列
    pipeline: [
        { navigate: 'https://www.bilibili.com' },        // 1. 打开页面建立 cookie
        { evaluate: `(async () => {                       // 2. 在浏览器里执行 JS
            const res = await fetch('...api.bilibili.com...', {
                credentials: 'include'  // 关键：带上 cookie
            });
            return (await res.json())?.data?.list || [];
        })()` },
        { map: { rank: '${{ index+1 }}', ... } },        // 3. 映射字段 (CLI 本地)
        { limit: '${{ args.limit }}' },                    // 4. 截取前 N 条 (CLI 本地)
    ],
});
```

pipeline 步骤：`navigate` 和 `evaluate` 在浏览器执行，`map` 和 `limit` 在 CLI 进程执行。

> **重点**：`evaluate` 里的 `fetch` 不是 Node.js 的 fetch，而是在浏览器页面里执行的。`credentials: 'include'` 能带上你登录 B 站后的真实 cookie，所以不需要处理登录。

## 三、Daemon 机制（src/daemon.ts）

常驻后台的 Node.js 进程，充当 CLI 和 Chrome 扩展的中转站：

```
           HTTP                    WebSocket
CLI 进程 --------> Daemon ---------> Chrome 扩展
         POST /command    ws://localhost:19825/ext
```

核心职责：监听 19825 端口，HTTP 接收 CLI 命令，WebSocket 转发给扩展。

安全措施（5 层防御，防止恶意网页连接 localhost）：

| 层级 | 机制 | 防御对象 |
|------|------|----------|
| 1 | Origin 检查 | 拒绝非 chrome-extension:// 来源 |
| 2 | X-OpenCLI 自定义 header | 浏览器无法在简单请求中附加 |
| 3 | 不返回 CORS header | 浏览器 fetch 直接被拦截 |
| 4 | Body 大小限制 (1MB) | 防止 OOM |
| 5 | WebSocket verifyClient | 拒绝非扩展来源的 WS 连接 |

生命周期：首次执行浏览器命令时自动 spawn，独立于 CLI 持久运行，`POST /shutdown` 或 SIGTERM 优雅关闭。

## 四、Chrome 扩展（extension/）

MV3 Service Worker 架构，权限包括 `debugger`、`tabs`、`cookies`、`activeTab`。

### 启动与连接

```
Chrome 启动 -> onInstalled/onStartup
  -> initialize()
    -> keepalive alarm（每 ~24s 触发）
    -> connect(): 先 fetch('/ping') 探测 daemon，再建 WebSocket
```

先 ping 再建 WS 的原因：Chrome 在 WS 连接失败时打印不可捕获的 ERR_CONNECTION_REFUSED，ping 可以避免噪音。

### 命令执行

`handleCommand` 按 action 分发：

| action | 处理函数 | 底层调用 |
|--------|----------|----------|
| navigate | handleNavigate | chrome.tabs.update() |
| exec | handleExec | chrome.debugger + Runtime.evaluate |
| cookies | handleCookies | chrome.cookies.getAll() |
| screenshot | handleScreenshot | CDP Page.captureScreenshot |
| cdp | handleCdp | chrome.debugger.sendCommand() |

`exec` 是核心：通过 `chrome.debugger` attach 到页面，用 CDP 的 `Runtime.evaluate` 执行 JS。

### 自动化窗口隔离

扩展不操作用户标签页，而是创建专用自动化窗口（空闲 30s 自动关闭），用户浏览不受干扰。

## 五、两种浏览器连接模式

| 模式 | 用途 | 连接方式 |
|------|------|----------|
| **BrowserBridge** | 普通网站 (bilibili, zhihu 等) | CLI -> Daemon -> Chrome 扩展 |
| **CDPBridge** | Electron 应用 (VS Code 等) | CLI 直连 CDP WebSocket |

```typescript
// src/runtime.ts
function getBrowserFactory(site?: string) {
  if (site && isElectronApp(site)) return CDPBridge;
  return BrowserBridge;  // 默认
}
```

CDPBridge 不需要 daemon 和扩展，直连 Electron 调试端口。

## 六、扩展安装

Chrome 安全策略限制，无法自动安装。手动步骤：

1. 从 [GitHub Releases](https://github.com/jackwener/opencli/releases) 下载
2. 打开 `chrome://extensions/` -> 开启「开发者模式」
3. 「加载已解压的扩展程序」-> 选择扩展目录

## 七、完整调用链路

```
1. CLI 解析命令
   main.ts -> discovery.ts -> clis/bilibili/hot.js

2. 准备浏览器会话
   runtime.ts -> getBrowserFactory('bilibili') -> BrowserBridge

3. 连接 Daemon
   BrowserBridge._ensureDaemon()
     -> daemon 没运行? spawn 后台进程
     -> 轮询等待 daemon + 扩展就绪

4. 执行 Pipeline

   4a. navigate: CLI -> POST /command -> Daemon -> WS -> 扩展
       扩展 -> chrome.tabs.update(bilibili.com) -> 等待加载

   4b. evaluate: CLI -> POST /command -> Daemon -> WS -> 扩展
       扩展 -> debugger.attach() + Runtime.evaluate(fetch(...))
       浏览器 -> fetch(带 cookie) -> Bilibili API -> JSON

   4c. map + limit: CLI 本地处理，不经过浏览器

5. 输出表格到终端
```

## 八、自动化窗口行为详解

### 为什么看不到浏览器窗口？

执行 `opencli browser open https://36kr.com` 后，浏览器**确实**打开了一个新窗口，但默认不抢焦点。

> [!code-ref] 自动化窗口创建逻辑
> **仓库**: opencli | **路径**: `extension/src/background.ts:149-209`
> 🔗 [GitHub](https://github.com/jackwener/opencli/blob/main/extension/src/background.ts#L149-L209)
>
> `windowFocused` 默认为 `false`，调用 `chrome.windows.create({ focused: false })` 时，macOS 上新窗口出现在当前应用后面，不会跳到前台。这是用户"看不到浏览器"的直接原因。

### 为什么不能复用已有 Tab？

OpenCLI **始终**调用 `chrome.windows.create()` 创建独立窗口，而非在用户已有窗口中新增 Tab（`chrome.tabs.create()`）。这是刻意的设计决策：

| 原因 | 说明 |
|------|------|
| **隔离性** | 自动化操作不影响用户正在浏览的页面 |
| **可清理** | 30 秒空闲自动关闭，不留残留 |
| **安全性** | 防止误操作用户的真实 Tab |

虽然是新窗口，但因为是**同一个 Chrome Profile**，Cookie、Session、登录状态天然共享。这才是 OpenCLI 用 Chrome 扩展方案的核心优势——不用重新登录。

### 环境变量控制窗口行为

```bash
# 让自动化窗口在前台打开（抢焦点）
export OPENCLI_WINDOW_FOCUSED=true
opencli browser open https://36kr.com
```

> [!code-ref] windowFocused 读取与传递
> **仓库**: opencli | **路径**: `src/browser/daemon-client.ts:146-148`
> 🔗 [GitHub](https://github.com/jackwener/opencli/blob/main/src/browser/daemon-client.ts#L146-L148)
>
> CLI 进程读取 `OPENCLI_WINDOW_FOCUSED` 环境变量，值为 `1` 或 `true` 时，将其注入到发送给 Daemon 的命令中。Daemon 再转发给扩展，扩展据此决定 `chrome.windows.create` 的 `focused` 参数。

### 验证自动化窗口存在

- **macOS Dock**：Chrome 图标上的小白点表示有额外窗口
- **Chrome 窗口菜单**：菜单栏「窗口」→ 底部列出所有窗口
- **快捷键**：`Cmd + `` ` 在 Chrome 窗口间切换

## 九、CDP 执行机制

CDP（Chrome DevTools Protocol，Chrome 开发者工具协议）是 Chrome 内置的调试协议——按 F12 打开 DevTools 时，内部用的就是这套协议。

Chrome 扩展通过 `chrome.debugger` API 使用 CDP：

```
chrome.debugger.attach(tabId, "1.3")                          // 附加到 Tab
chrome.debugger.sendCommand(tabId, "Runtime.evaluate", {       // 执行 JS
    expression: "fetch('https://api.xxx.com', { credentials: 'include' })"
})
```

等价于在 DevTools Console 中手动输入代码，只是完全程序化。这是 OpenCLI 扩展执行 `evaluate` 步骤的底层机制。

> [!code-ref] CDP 命令分发（exec action）
> **仓库**: opencli | **路径**: `extension/src/background.ts` handleCommand → handleExec
>
> 扩展收到 `action: "exec"` 命令后，调用 `chrome.debugger.attach()` 附加到目标 Tab，再通过 `Runtime.evaluate` 执行 JS 代码。执行完毕后 detach debugger。

## 十、浏览器实例 vs 窗口 vs Tab

| 概念 | 类比 | 说明 |
|------|------|------|
| **浏览器实例** | 一个运行中的 Chrome 进程 | 双击 Chrome 图标 = 启动一个实例 |
| **窗口** | 同一实例中的多个窗口 | `Cmd+N` 创建新窗口 |
| **Tab** | 同一窗口中的多个标签页 | 同一窗口内切换 |

同一实例共享 Cookie、Session、扩展。OpenCLI 在**同一实例**中创建新窗口，所以登录态天然继承。

用 `--user-data-dir` 启动才是"新实例"——与日常 Chrome 完全隔离：

```bash
google-chrome --user-data-dir=/tmp/test-profile   # 新实例，无 Cookie/历史/扩展
```

---

## 参考资料

| 内容 | 文件路径 |
|------|----------|
| Daemon | `opencli/src/daemon.ts` |
| BrowserBridge | `opencli/src/browser/bridge.ts` |
| CDPBridge | `opencli/src/browser/cdp.ts` |
| 运行时入口 | `opencli/src/runtime.ts` |
| 命令声明 | `opencli/clis/bilibili/hot.js` |
| 扩展后台脚本 | `opencli/extension/src/background.ts` |
| 扩展配置 | `opencli/extension/manifest.json` |
| Daemon 客户端（windowFocused） | `opencli/src/browser/daemon-client.ts` |
| [Chrome DevTools Protocol 官方文档](https://chromedevtools.github.io/devtools-protocol/) | — |
| [chrome.debugger API](https://developer.chrome.com/docs/extensions/reference/api/debugger) | — |

---

*研究日期：2026-04-24 ~ 2026-04-25*
