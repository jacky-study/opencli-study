---
article_id: OBA-ss4arkds
tags: [study-note]
type: note
created_at: 2026-04-25
updated_at: 2026-04-25
---

# OpenCLI CLI 转换引擎

> 研究如何将网站、Electron 应用、本地二进制转化为标准化 CLI 接口

## 一、整体架构概览

OpenCLI 的核心使命是将网站操作转化为标准化的 CLI 命令。整个系统采用"三层映射"架构：

```
用户输入 (opencli twitter post "Hello World")
     |
     v
+---------------------------------------------------+
|  main.ts -> discovery.ts -> registry.ts           |
|  (启动 / 发现命令 / 注册到全局命令表)                   |
+---------------------------------------------------+
     |
     v
+---------------------------------------------------+
|  commanderAdapter.ts -> cli.ts -> execution.ts    |
|  (参数绑定 / 会话管理 / 命令执行)                      |
+---------------------------------------------------+
     |
     v
+---------------------+     +-----------------------+
| BrowserBridge       |     | CDPBridge             |
| (网站: 走daemon+扩展) |     | (Electron: 走CDP直连)  |
+---------------------+     +-----------------------+
     |                              |
     v                              v
+---------------------+     +-----------------------+
| Chrome Extension    |     | WebSocket -> CDP      |
| daemon -> CDP       |     | 直连浏览器调试协议        |
+---------------------+     +-----------------------+
```

**为什么双通道设计**：网站需要用户已登录的浏览器环境（Cookie/Session），通过 Chrome 扩展接管用户真实浏览器；Electron 应用自带调试端口，直接 CDP WebSocket 连接即可。

## 二、Adapter 系统

### 2.1 命令定义

每个网站在 `clis/` 目录下有一个子目录，每条命令一个 JS 文件：

```javascript
// clis/twitter/post.js
cli({
    site: 'twitter',
    name: 'post',
    strategy: Strategy.UI,
    browser: true,
    domain: 'x.com',
    args: [
        { name: 'text', type: 'string', required: true, positional: true },
    ],
    func: async (page, kwargs) => {
        await page.goto('https://x.com/compose/tweet');
        // ... DOM 操作 ...
    }
});
```

| 字段 | 含义 |
|------|------|
| `site` | 命令所属网站，构成 `site/name` 的命令全名 |
| `strategy` | 访问策略：UI/COOKIE/PUBLIC 等 |
| `func` | 实际执行函数，接收 `page`(IPage) 和 `kwargs`(参数) |
| `pipeline` | 可选，声明式步骤序列（替代 func） |

### 2.2 发现与注册

`discovery.ts` 实现两级发现：
1. **快速路径**：读取 `cli-manifest.json`，延迟加载 JS 模块
2. **回退路径**：扫描 `clis/` 文件系统，逐个 `import()` JS 文件

全局单例 Registry 使用 `globalThis.__opencli_registry__` 确保跨模块单例。

### 2.3 六种访问策略

| 策略 | 含义 | 需要浏览器 |
|------|------|:---:|
| `PUBLIC` | 公开 API，直接 HTTP 请求 | 否 |
| `LOCAL` | 本地二进制调用 | 否 |
| `COOKIE` | 需从浏览器获取 Cookie 再请求 | 是 |
| `HEADER` | 需浏览器拦截请求头 | 是 |
| `INTERCEPT` | 拦截浏览器 XHR/Fetch | 是 |
| `UI` | 完整浏览器 DOM 自动化 | 是 |

## 三、浏览器控制层

### 3.1 双通道架构

```
getBrowserFactory(site)
     |
     +--- isElectronApp(site)? ---> CDPBridge (直连 CDP WebSocket)
     |
     +--- 否? ----------------------> BrowserBridge (daemon + Chrome 扩展)
```

### 3.2 BrowserBridge 通道（网站）

```
CLI进程                     Daemon进程                Chrome扩展
sendCommand()  --HTTP-->   /command    --WebSocket-->  background.ts
                                                        |
                                                       cdp.ts
                                                   chrome.debugger.sendCommand()
                                                        |
                                                     目标网页
```

### 3.3 CDPBridge 通道（Electron 应用）

1. 通过 HTTP 获取 CDP 目标列表（`/json` 端点）
2. 智能选择最佳目标（按类型 app>webview>page、URL 本地性等评分）
3. 建立 WebSocket 连接，直接发送 CDP 命令

### 3.4 IPage 统一抽象

```
               IPage (接口)
              /           \
         BasePage (共享DOM操作实现)
          /                    \
    Page(daemon)          CDPPage(直连)
```

`BasePage` 抽象了约 200 行共享的 click/type/scroll/snapshot 方法，子类只需实现 `goto`、`evaluate`、`getCookies` 等传输层方法。

## 四、命令执行流程

### 4.1 完整链路

```
main.ts:runCli()
  -> cli.ts: 注册 Commander 子命令
    -> commanderAdapter.ts:registerCommandToProgram()  (参数映射)
      -> execution.ts:executeCommand()                 (核心执行入口)
        -> runtime.ts:browserSession()                 (创建浏览器会话)
          -> runCommand()                              (加载 adapter, 执行 func)
            -> adapter 的 func(page, kwargs)           (DOM 自动化)
```

### 4.2 executeCommand 核心逻辑

1. **参数校验**：`coerceAndValidateArgs` 检查必填参数、类型转换、枚举值
2. **判断是否需要浏览器**：`shouldUseBrowserSession` 检查 `cmd.browser` 和 pipeline 步骤
3. **创建浏览器会话**：调用 `browserSession` 获取 `IPage`
4. **预导航**：对 COOKIE/UI 策略，自动导航到 `cmd.domain`
5. **加载适配器**：支持延迟加载（`_lazy` 标志），热重载用户 adapter
6. **执行与超时**：`runWithTimeout` 包装，默认 60 秒

### 4.3 参数处理

`commanderAdapter.ts` 将 Registry 命令桥接到 Commander.js：
- 位置参数（`positional: true`）→ Commander argument
- 命名参数 → Commander option
- 统一添加 `--format` 和 `--verbose` 选项

## 五、DOM 操作到 CLI 的映射

以 `twitter/post.js` 为例：

```
CLI: opencli twitter post "Hello World"
  → args: { text: "Hello World" }
  → page.goto('https://x.com/compose/tweet')
  → page.evaluate(ClipboardEvent paste)  // 粘贴文本(兼容Draft.js)
  → page.evaluate(querySelector + click) // 点击发送按钮
  → 输出: [{ status: "success", message: "Tweet posted" }]
```

### DOM 定位：ref + 指纹系统

1. **快照标注**：DOM 快照给每个可交互元素标注 `data-opencli-ref` 编号
2. **指纹验证**：记录元素的 tag/text/role/testid 作为身份向量
3. **操作时校验**：click/type 时先定位元素，再验证指纹是否匹配

### 原生点击三级回退

1. JS `el.click()` — 优先
2. CDP `DOM.getContentQuads` 精确定位坐标 + `Input.dispatchMouseEvent` — 回退
3. CDP `DOM.getBoxModel` 坐标计算 + 原生点击 — 最终回退

## 六、Pipeline 声明式引擎

除 `func` 编程式外，还支持声明式 pipeline 步骤：

| 步骤 | 功能 |
|------|------|
| `navigate` | 导航到 URL |
| `click` / `type` | DOM 操作 |
| `snapshot` | 获取 DOM 快照 |
| `fetch` | HTTP 请求 |
| `select/map/filter/sort/limit` | 数据变换 |
| `intercept` | 拦截网络请求 |
| `download` | 下载媒体 |

Pipeline 支持模板表达式 `${{ args.limit }}`，通过沙箱 VM 执行渲染。

## 七、Chrome 扩展

Manifest V3 Chrome 扩展：
- **`background.ts`**：Service Worker，WebSocket 连接 daemon
- **`cdp.ts`**：通过 `chrome.debugger` API 执行 CDP 命令
- **`popup.js`**：状态展示弹窗

## 八、下载功能

`download/` 模块提供三类能力：
- **HTTP 直连下载**：带进度回调的流式下载
- **yt-dlp 包装**：视频平台（YouTube、Bilibili、Twitter 等）
- **内容类型自动检测**：根据 URL 扩展名和 Content-Type 判断

## 总结：5 个核心设计思路

1. **Adapter 模式**：每个网站一个目录，每条操作一个 JS 文件
2. **双通道浏览器控制**：网站走 Chrome 扩展，Electron 走 CDP 直连
3. **IPage 统一抽象**：BasePage 基类消除通道差异
4. **声明式 + 编程式双引擎**：pipeline 适合简单场景，func 适合复杂逻辑
5. **ref + 指纹定位**：兼顾速度和可靠性，三层点击回退确保操作成功

---

*研究日期：2026-04-20*
