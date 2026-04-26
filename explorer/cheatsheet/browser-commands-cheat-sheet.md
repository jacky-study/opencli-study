---
article_id: OBA-bcm4k7r2
tags: [opencli, cheatsheet, browser, commands]
type: cheatsheet
created_at: 2026-04-27
---

# OpenCLI Browser 命令速查卡

> 26 条 `opencli browser` 命令，按使用频率排列，即查即用。

---

## 快速起手

```bash
opencli doctor                        # 前置检查（三项全绿才能用）
opencli browser open <url>            # 打开网页 → 返回 page ID
opencli browser state                 # 获取页面快照 + 元素编号（最常用）
```

> **核心循环**：`open` → `state` → 操作（click/type）→ `state` → ...

---

## 命令速查表

### 导航

| 命令 | 说明 | 示例 |
|------|------|------|
| `browser open <url>` | 打开网页，返回 page ID | `opencli browser open https://bilibili.com` |
| `browser back` | 浏览器后退 | `opencli browser back` |

### 页面读取

| 命令 | 说明 | 示例 |
|------|------|------|
| `browser state` | **最重要**。页面快照 + 带 `[N]` 编号的元素列表 | `opencli browser state \| grep '<input'` |
| `browser get title` | 页面标题 | `opencli browser get title` |
| `browser get url` | 当前 URL | `opencli browser get url` |
| `browser get text <N>` | 获取编号 N 元素的文字 | `opencli browser get text 206` |
| `browser get value <N>` | 获取编号 N 表单元素的值 | `opencli browser get value 12` |
| `browser get html` | HTML 源码（可 `--selector` 过滤） | `opencli browser get html --selector "title"` |
| `browser get attributes <N>` | 编号 N 元素的所有 HTML 属性 | `opencli browser get attributes 206` |
| `browser screenshot [路径]` | 截图，不指定路径输出 base64 | `opencli browser screenshot /tmp/p.png` |
| `browser frames` | 列出跨域 iframe | `opencli browser frames` |

### 交互操作

| 命令 | 说明 | 示例 |
|------|------|------|
| `browser click <N>` | 点击编号 N 的元素 | `opencli browser click 130` |
| `browser type <N> "文字"` | 输入文字（先点击再输入） | `opencli browser type 12 "Claude Code"` |
| `browser select <N> "选项"` | 下拉选择 | `opencli browser select 15 "最新发布"` |
| `browser keys "按键"` | 按键，组合键用 `+` 连接 | `opencli browser keys "Enter"` |
| `browser scroll <up\|down>` | 滚动，可 `--amount N` 控制距离 | `opencli browser scroll down --amount 300` |

### 等待

| 命令 | 说明 | 示例 |
|------|------|------|
| `browser wait time <秒>` | 等待固定秒数 | `opencli browser wait time 3` |
| `browser wait text "文字"` | 等待文字出现（`--timeout ms`） | `opencli browser wait text "加载完成" --timeout 10000` |
| `browser wait selector "CSS"` | 等待 CSS 选择器匹配元素出现 | `opencli browser wait selector "#nav"` |

### JS 执行 & 网络抓包

| 命令 | 说明 | 示例 |
|------|------|------|
| `browser eval "<JS>"` | 在页面执行 JavaScript | `opencli browser eval "document.title"` |
| `browser eval "<JS>" --frame 0` | 在 iframe 中执行 JS | `opencli browser eval "1+1" --frame 0` |
| `browser network` | 查看捕获的 API 请求列表 | `opencli browser network` |
| `browser network --detail <N>` | 查看第 N 条请求的完整响应 | `opencli browser network --detail 5` |
| `browser network --all` | 包含静态资源和埋点 | `opencli browser network --all` |

### Tab 管理 & 会话

| 命令 | 说明 | 示例 |
|------|------|------|
| `browser tab list` | 列出所有标签页 | `opencli browser tab list` |
| `browser tab new [url]` | 新建标签页 | `opencli browser tab new "https://zhihu.com"` |
| `browser tab select <page>` | 切换到指定标签页 | `opencli browser tab select "53F547E9..."` |
| `browser tab close <page>` | 关闭指定标签页 | `opencli browser tab close "18EA8255..."` |
| `browser close` | 关闭自动化窗口（所有数据丢失） | `opencli browser close` |

---

## 通用选项

| 选项 | 说明 |
|------|------|
| `--tab <targetId>` | 指定操作哪个标签页（几乎所有命令都支持） |

---

## 常用按键名

| 按键 | 参数 | 按键 | 参数 |
|------|------|------|------|
| 回车 | `"Enter"` | 退出 | `"Escape"` |
| Tab | `"Tab"` | 退格 | `"Backspace"` |
| 全选 | `"Control+a"` | 复制 | `"Control+c"` |
| 粘贴 | `"Control+v"` | 方向下 | `"ArrowDown"` |

> 组合键用 `+` 连接：`"Control+Shift+I"`

---

## 常见错误速查

| 错误 | 原因 | 解决 |
|------|------|------|
| `ref=130 not found in DOM` | 页面变化后旧编号失效 | 重新 `browser state` |
| `Browser attach failed` | 其他扩展抢占 CDP 端口 | 禁用冲突扩展（如 1Password） |
| `Timed out waiting for text` | 等待超时 | 增大 `--timeout` 或确认文字是否存在 |

---

## 实战模式：grep 快速定位

```bash
# 找链接
opencli browser state | grep '<a href'
# 找输入框
opencli browser state | grep '<input'
# 找按钮（含中文）
opencli browser state | grep -E 'like|收藏|点赞'
```

---

> [!seealso] 相关笔记
> - 完整教程 → [[09-browser-commands-deep-dive|浏览器命令完全指南]]
> - 桥接原理 → [[05-opencli-browser-bridge-mechanism|浏览器桥接机制]]
> - DOM 打标 → [[dom-snapshot-element-tagging|DOM 快照与元素打标]]
> - 认证策略 → [[auth-strategy-cheat-sheet|认证策略速查卡]]
