---
article_id: OBA-ub43lfgf
tags: [opencli, browser, tutorial, automation]
type: tutorial
created_at: 2026-04-25
updated_at: 2026-04-25
source: conversation
---

# OpenCLI 浏览器命令完全指南：从打开网页到抓取数据

> 所有 `opencli browser` 命令逐一实战演示，覆盖导航、交互、读取、等待、网络抓包、Tab 管理等全部能力。
> 读完本文，你能用 OpenCLI 完整控制任何网页。

---

## 前置条件

1. 已安装 OpenCLI（`npm i -g @anthropic-ai/opencli`）
2. Chrome 浏览器已安装 OpenCLI 扩展
3. 运行 `opencli doctor` 三项全绿

```bash
opencli doctor
# [OK] Daemon: running on port 19825 (v1.7.7)
# [OK] Extension: connected (v1.0.0)
# [OK] Connectivity: connected in 2.1s
```

---

## 命令全景图

OpenCLI 的浏览器命令一共 **7 大类、26 条命令**：

| 类别 | 命令 | 作用 |
|------|------|------|
| **导航** | `open`, `back` | 打开页面、后退 |
| **页面读取** | `state`, `get title`, `get url`, `get text`, `get value`, `get html`, `get attributes`, `screenshot`, `frames` | 获取页面信息 |
| **交互操作** | `click`, `type`, `select`, `keys`, `scroll` | 点击、输入、选择、按键、滚动 |
| **等待** | `wait time`, `wait text`, `wait selector` | 等待条件满足 |
| **JS 执行** | `eval` | 在页面中运行 JavaScript |
| **网络** | `network` | 捕获并查看网络请求 |
| **Tab 管理** | `tab list`, `tab new`, `tab select`, `tab close` | 多标签页操作 |
| **会话** | `close` | 关闭自动化窗口 |

> **通用选项**：几乎所有命令都支持 `--tab <targetId>` 指定操作哪个标签页。

---

## 实战演练：用 B 站走完全流程

下面用一个完整的场景——在 B 站搜索视频并查看信息——演示每一条命令的真实输出。

### 1. 打开网页：`browser open`

```bash
opencli browser open https://www.bilibili.com
```

**输出**：
```json
{
  "url": "https://www.bilibili.com",
  "page": "53F547E9DF1702F5C704856CF00E7F99"
}
```

**要点**：
- `page` 是这个标签页的唯一 ID，后续 `--tab` 操作要用它
- 页面会自动等待 2 秒加载，同时注入网络请求拦截器
- 如果已有自动化窗口在运行，会在同窗口打开新页面

---

### 2. "读"页面：`browser state`（最重要的命令）

```bash
opencli browser state
```

**输出**（节选）：
```
URL: https://www.bilibili.com/

url: https://www.bilibili.com/
title: 哔哩哔哩 (゜-゜)つロ 干杯~-bilibili
viewport: 1422x804
page_scroll: 0↑ 2.4↓
---
<body />
  <div id=app />
    <div />
      <div />
        <div />
          <ul />
            <li />
              [3]<a href=/ />
                [2]<svg />
                <span>首页</span>
            <li />
              [4]<a href=/anime/ />
                <span>番剧</span>
            <li />
              [5]<a href=//live.bilibili.com />
                <span>直播</span>
            ...
                [12]<input type=text autocomplete=off placeholder=lpl·28分钟前更新 />
            ...
```

**要点**：
- 输出的**核心是带编号 `[N]` 的元素列表**，这就是后续 `click`、`type` 等命令的"地址"
- 一个完整的 B 站首页 state 有 **1300+ 行**，所以实战中通常用 `| grep` 过滤关键信息
- **每次页面变化后（导航、点击、滚动），编号都会重新分配**，必须重新 `state` 获取新编号

**实战技巧：用 grep 快速定位目标元素**

```bash
# 找所有可点击的链接
opencli browser state | grep '<a href'

# 找输入框
opencli browser state | grep '<input'

# 找点赞、收藏按钮
opencli browser state | grep -E 'like|coin|fav|收藏|点赞'
```

---

### 3. 获取页面属性：`browser get` 系列

#### `get title` — 获取页面标题

```bash
opencli browser get title
```

```plaintext
哔哩哔哩 (゜-゜)つロ 干杯~-bilibili
```

#### `get url` — 获取当前 URL

```bash
opencli browser get url
```

```plaintext
https://www.bilibili.com/
```

#### `get text <index>` — 获取元素文字内容

先在视频详情页找到点赞按钮（编号 206）：

```bash
opencli browser get text 206
```

```json
{
  "value": "1301",
  "matches_n": 1,
  "match_level": "exact"
}
```

> 这表示该视频有 1301 个赞。

#### `get attributes <index>` — 获取元素所有 HTML 属性

```bash
opencli browser get attributes 206
```

```json
{
  "value": {
    "title": "点赞（Q）",
    "class": "video-like video-toolbar-left-item",
    "data-opencli-ref": "206"
  },
  "matches_n": 1,
  "match_level": "exact"
}
```

> 可以看到按钮的 title 是"点赞（Q）"，快捷键提示也在里面。

#### `get value <index>` — 获取表单元素值

对搜索框使用（假设编号是 12）：

```bash
opencli browser get value 12
```

> 返回输入框当前值，空则返回 `(empty)`。

#### `get html` — 获取 HTML 源码

```bash
# 获取整个页面 HTML
opencli browser get html

# 只获取某个元素的 HTML
opencli browser get html --selector "title"
```

```html
<title>9分钟搞定！Claude Code 保姆级安装+原理+真实用法（国内直连）_哔哩哔哩_bilibili</title>
```

---

### 4. 输入文字：`browser type`

```bash
opencli browser type 12 "Claude Code"
```

**输出**：
```json
{
  "typed": true,
  "text": "Claude Code",
  "target": "12",
  "matches_n": 1,
  "match_level": "exact",
  "autocomplete": false
}
```

**要点**：
- `type` 会先**点击**目标元素，再输入文字（相当于 click + typeText）
- 如果目标是自动补全输入框（`autocomplete`），会额外等待 0.4 秒让下拉建议出现
- `matches_n: 1, match_level: exact` 表示精确匹配到一个元素

---

### 5. 按键：`browser keys`

```bash
opencli browser keys "Enter"
```

```plaintext
Pressed: Enter
```

**支持的按键名**（常见的）：

| 按键 | 参数 |
|------|------|
| 回车 | `"Enter"` |
| 退出 | `"Escape"` |
| 制表符 | `"Tab"` |
| 全选 | `"Control+a"` |
| 复制 | `"Control+c"` |
| 粘贴 | `"Control+v"` |
| 删除 | `"Backspace"` |
| 方向下 | `"ArrowDown"` |

> 组合键用 `+` 连接：`"Control+Shift+I"`。

---

### 6. 点击元素：`browser click`

```bash
opencli browser click 130
```

```json
{
  "clicked": true,
  "target": "130",
  "matches_n": 1,
  "match_level": "exact"
}
```

> 点击后如果页面发生变化，**务必重新 `state`**，因为编号会全部刷新。

---

### 7. 滚动页面：`browser scroll`

```bash
# 向下滚动 500 像素（默认）
opencli browser scroll down

# 向上滚动
opencli browser scroll up

# 自定义滚动距离
opencli browser scroll down --amount 300
```

```plaintext
Scrolled down
```

---

### 8. 浏览器后退：`browser back`

```bash
opencli browser back
```

```plaintext
Navigated back
```

> 相当于点击浏览器的"返回"按钮。后退后同样要重新 `state`。

---

### 9. 等待：`browser wait`（三种模式）

#### `wait time` — 等待固定秒数

```bash
opencli browser wait time 3
```

```plaintext
Waited 3s
```

#### `wait text` — 等待文字出现

```bash
opencli browser wait text "Claude Code" --timeout 10000
```

```plaintext
Text "Claude Code" appeared
```

> `--timeout` 单位是毫秒，默认 10000ms（10 秒）。超时未出现会报错。

#### `wait selector` — 等待 CSS 选择器匹配元素出现

```bash
opencli browser wait selector "#nav-searchform"
```

```plaintext
Element "#nav-searchform" appeared
```

---

### 10. 截图：`browser screenshot`

```bash
# 保存到文件
opencli browser screenshot /tmp/page.png
```

```plaintext
Screenshot saved to: /tmp/page.png
```

```bash
# 不指定路径 → 输出 base64 编码的 PNG（适合 AI 模型直接读取）
opencli browser screenshot
```

---

### 11. 执行 JavaScript：`browser eval`

这是**最灵活**的命令——任何 `state` 做不到的读取，都能用 `eval` 实现。

```bash
# 简单取值
opencli browser eval "document.title"
```

```plaintext
Claude Code-哔哩哔哩_bilibili
```

```bash
# 复杂查询
opencli browser eval "JSON.stringify({url: location.href, title: document.title, links: document.querySelectorAll('a').length})"
```

```json
{
  "url": "https://search.bilibili.com/all?keyword=Claude+Code",
  "title": "Claude Code-哔哩哔哩_bilibili",
  "links": 188
}
```

**跨域 iframe 中执行 JS**（需要先 `browser frames` 获取 iframe 索引）：

```bash
opencli browser eval "document.querySelector('.content').innerText" --frame 0
```

---

### 12. 网络请求捕获：`browser network`

OpenCLI 在 `browser open` 时会自动注入网络拦截器，记录所有 fetch/XHR 请求。

```bash
opencli browser network
```

**输出**（示例节选）：
```
Captured 246 API requests:

  [0] POST 200 https://data.bilibili.com/log/web
  [1] POST 200 https://data.bilibili.com/v2/log/web?content_type=pbrequest&logid=021436
  [2] POST 200 https://data.bilibili.com/v2/log/web?content_type=pbrequest&logid=021434
  ...

Use --detail <index> to see full response body.
```

**查看某条请求的详细内容**：

```bash
opencli browser network --detail 5
```

```plaintext
GET https://api.bilibili.com/x/web-interface/search/type?keyword=Claude+Code
Status: 200 | Size: 12340 | Type: application/json
---
{"code":0,"message":"0","data":{"result":[...]}}
```

**显示全部请求（包括静态资源）**：

```bash
opencli browser network --all
```

> 默认过滤掉 JS/CSS/图片等静态资源和埋点请求，`--all` 显示全部。

**实战用途**：这是**发现网站 API** 的利器——在浏览器里操作一番，然后用 `network` 看到网站调了哪些接口，直接就能写适配器。

---

### 13. 跨域 iframe 列表：`browser frames`

```bash
opencli browser frames
```

```json
[
  {"index": 0, "url": "https://message.bilibili.com/pages/nav/header_sync", "name": "headermessagesync"}
]
```

> 拿到 iframe 索引后，用 `browser eval "..." --frame 0` 在 iframe 中执行 JS。

---

### 14. 下拉选择：`browser select`

```bash
# 选择 <select> 元素中的选项
opencli browser select 15 "最新发布"
```

```plaintext
Selected "最新发布" in element [15]
```

> 如果选的值不存在，会报错并列出所有可选项：
> ```
> Error: "最新" not found — Available: 最新发布, 最多播放, 最多收藏
> ```

---

### 15. Tab 管理：`browser tab` 系列

#### `tab list` — 列出所有标签页

```bash
opencli browser tab list
```

```json
[
  {
    "index": 0,
    "page": "53F547E9DF1702F5C704856CF00E7F99",
    "url": "https://search.bilibili.com/all?keyword=Claude+Code",
    "title": "Claude Code-哔哩哔哩_bilibili",
    "active": false
  },
  {
    "index": 1,
    "page": "18EA825528893437A78507E51BDD46F8",
    "url": "https://www.zhihu.com",
    "title": "知乎 - 有问题，就会有答案",
    "active": true
  }
]
```

#### `tab new` — 新建标签页

```bash
opencli browser tab new "https://www.zhihu.com"
```

```json
{
  "page": "18EA825528893437A78507E51BDD46F8",
  "url": "https://www.zhihu.com"
}
```

#### `tab select` — 切换到指定标签页

```bash
opencli browser tab select "53F547E9DF1702F5C704856CF00E7F99"
```

```json
{
  "selected": "53F547E9DF1702F5C704856CF00E7F99"
}
```

#### `tab close` — 关闭标签页

```bash
opencli browser tab close "18EA825528893437A78507E51BDD46F8"
```

```json
{
  "closed": "18EA825528893437A78507E51BDD46F8"
}
```

---

### 16. 关闭自动化窗口：`browser close`

```bash
opencli browser close
```

```plaintext
Automation window closed
```

> 关闭整个浏览器窗口，**所有标签页和网络请求数据都会丢失**。

---

## 常见错误与应对

### 错误 1：编号失效 `[not_found]`

```bash
opencli browser get text 130
```

```json
{
  "error": {
    "code": "not_found",
    "message": "ref=130 not found in DOM",
    "hint": "The element may have been removed. Re-run `opencli browser state` to get a fresh snapshot."
  }
}
```

**原因**：页面发生了任何变化（导航、点击、动态加载），旧的编号全部失效。

**解决**：重新运行 `opencli browser state` 获取最新编号。

### 错误 2：浏览器连接失败

```
Browser attach failed — another extension may be interfering. Try disabling 1Password.
```

**原因**：其他 Chrome 扩展（如 1Password）抢占了 CDP 调试端口。

**解决**：在 `chrome://extensions` 中临时禁用冲突的扩展。

### 错误 3：等待超时

```
Error: Timed out waiting for text "加载完成"
```

**原因**：指定时间内文字未出现。

**解决**：增大 `--timeout`，或确认文字是否真的会出现在页面上。

---

## AI Agent 控制浏览器的循环

所有这些命令的设计目的是让 AI Agent 能像人一样操作浏览器。核心循环：

```
┌─────────────┐
│ browser open │ ← 打开目标网页
└──────┬──────┘
       ▼
┌──────────────┐
│ browser state │ ← 读取页面，获取编号
└──────┬───────┘
       ▼
┌──────────────┐
│   分析 + 决策   │ ← AI 决定下一步操作
└──────┬───────┘
       ▼
┌─────────────────────────┐
│ click / type / keys / ...│ ← 执行操作
└──────┬──────────────────┘
       ▼
  返回 browser state ──→ 继续循环
```

> **每个 Agent 循环的起手式**都是 `browser state`——它既是"眼睛"（读取页面），也是"校验"（确认上一步操作的结果）。

---

## 命令速查表

```
# ─── 导航 ────────────────────────────────────
opencli browser open <url>                    # 打开网页
opencli browser back                          # 浏览器后退

# ─── 读取页面 ─────────────────────────────────
opencli browser state                         # 完整页面快照（最重要）
opencli browser get title                     # 页面标题
opencli browser get url                       # 当前 URL
opencli browser get text <编号>                # 元素文字
opencli browser get value <编号>               # 表单值
opencli browser get html [--selector <CSS>]    # HTML 源码
opencli browser get attributes <编号>           # 元素属性
opencli browser screenshot [路径]              # 截图
opencli browser frames                        # 跨域 iframe 列表

# ─── 交互操作 ─────────────────────────────────
opencli browser click <编号>                    # 点击
opencli browser type <编号> "文字"               # 输入（会先点击）
opencli browser select <编号> "选项"             # 下拉选择
opencli browser keys "Enter"                  # 按键
opencli browser scroll <up|down> [--amount N]  # 滚动

# ─── 等待 ────────────────────────────────────
opencli browser wait time 3                   # 等待 3 秒
opencli browser wait text "加载完成"            # 等待文字出现
opencli browser wait selector ".loaded"       # 等待元素出现

# ─── JS 执行 ─────────────────────────────────
opencli browser eval "<JS代码>"               # 执行 JavaScript
opencli browser eval "<JS代码>" --frame 0     # 在 iframe 中执行

# ─── 网络抓包 ─────────────────────────────────
opencli browser network                       # 查看捕获的 API 请求
opencli browser network --detail <序号>        # 查看某条请求详情
opencli browser network --all                 # 包含静态资源

# ─── Tab 管理 ─────────────────────────────────
opencli browser tab list                      # 列出所有标签页
opencli browser tab new [url]                 # 新建标签页
opencli browser tab select <targetId>         # 切换标签页
opencli browser tab close <targetId>          # 关闭标签页

# ─── 会话 ────────────────────────────────────
opencli browser close                         # 关闭自动化窗口

# ─── 通用选项 ─────────────────────────────────
--tab <targetId>                              # 指定操作的标签页
```

---

> **实测环境**：macOS / Node v24.9.0 / OpenCLI v1.7.7 / Chrome + OpenCLI Extension v1.0.0 / 2026-04-25

---

## 相关文章

- [[08-opencli-how-to-use-guide]] — 7 步上手教程（包含浏览器控制入门）
- [[05-opencli-browser-bridge-mechanism]] — 浏览器桥接底层机制
- [[06-browser-bridge-csp-troubleshooting]] — CSP 限制排查
- [[dom-snapshot-element-tagging]] — DOM 快照与元素编号机制
