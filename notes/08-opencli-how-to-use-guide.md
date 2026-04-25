---
article_id: OBA-z8dtxeez
tags: [study-note, tutorial]
type: note
created_at: 2026-04-25
updated_at: 2026-04-25
---

# OpenCLI 实战教程：7 步上手

> 跟着做 7 个步骤，掌握 OpenCLI 80% 的能力。环境已就绪，直接开干。

---

## 第 1 步：验证环境

**目标**：确认 OpenCLI 和浏览器扩展都正常工作。

```bash
opencli doctor
```

**你应该看到**：连接成功的提示（绿色/OK 状态）。

> 如果失败：检查 Chrome 扩展是否启用 → `chrome://extensions` → 确认 OpenCLI 扩展开着。

---

## 第 2 步：第一条命令——不碰浏览器也能玩

**目标**：用公开 API 获取数据，感受 OpenCLI 最简单的用法。

```bash
opencli hackernews top --limit 5
```

**你应该看到**：一张表格，列出了 Hacker News 当前前 5 条热门文章的标题、分数、链接。

**这说明了什么**：
- OpenCLI 内置了大量网站的适配器
- 公开数据（HackerNews、GitHub Trending 等）不需要浏览器，直接调 API

**再试一个**：

```bash
opencli github-trending repos --language typescript --limit 5
```

---

## 第 3 步：换种格式看数据

**目标**：学会控制输出格式，为后续管道操作打基础。

用同一条命令，换不同的 `-f` 参数：

```bash
# JSON —— 方便程序处理
opencli hackernews top --limit 3 -f json
```

你会看到结构化的 JSON 数组，每条是一个对象。

```bash
# Markdown —— 可以直接粘贴到笔记里
opencli hackernews top --limit 3 -f md
```

你会看到 Markdown 表格。

```bash
# CSV —— 可以用 Excel 打开
opencli hackernews top --limit 3 -f csv
```

**实用技巧**：保存到文件

```bash
opencli hackernews top --limit 10 -f json > ~/Desktop/hn.json
```

打开 `~/Desktop/hn.json` 看看，数据已经存好了。

**这说明了什么**：
- 每条命令都支持 `-f table/json/yaml/md/csv` 五种格式
- 配合 `>` 重定向，可以随时把数据存下来

---

## 第 4 步：复用浏览器登录态

**目标**：让 OpenCLI 借用你在 Chrome 中已有的登录状态，获取需要认证的数据。

> **前置条件**：确保你已在 Chrome 中**登录了 B 站**（bilibili.com）。如果没登录，先去浏览器登录。

```bash
opencli bilibili hot --limit 5
```

**你应该看到**：B 站当前热门视频列表（标题、UP 主、播放量等）。

如果成功了，再试：

```bash
opencli zhihu hot --limit 5
```

**如果返回空或报错**：说明你没在 Chrome 里登录对应网站。去浏览器登录后重试。

**这说明了什么**：
- OpenCLI 通过 Chrome 扩展复用你的浏览器 Cookie
- 不需要单独处理登录、Token、API Key
- 支持的站点：B 站、知乎、Twitter、Reddit 等 90+ 个

**查看所有可用命令**：

```bash
opencli list
```

扫一眼列表，找找有没有你常用的网站。

---

## 第 5 步：手动控制浏览器——像人一样操作网页

**目标**：学会用底层浏览器命令，逐个动作操控网页。这是 AI Agent 控制浏览器的基础。

### 5.1 打开一个页面

```bash
opencli browser open https://news.ycombinator.com
```

**你应该看到**：命令执行成功，页面在浏览器中打开。

### 5.2 "看一眼"当前页面

```bash
opencli browser state
```

**你应该看到**：一大段结构化文本，每个可交互元素前面有编号 `[0]`、`[1]`、`[2]`……

这相当于 OpenCLI 在"读"网页。**记住这个编号机制**，后续操作全靠它。

### 5.3 点击一个元素

从 `state` 的输出中找到一个链接（比如第 5 个），点击它：

```bash
opencli browser click 5
```

### 5.4 回退并搜索

```bash
# 返回上一页
opencli browser back

# 在搜索框里输入文字（先 state 找到搜索框的编号）
opencli browser state
# 假设搜索框编号是 [3]
opencli browser type 3 "opencli"

# 按 Enter 提交
opencli browser keys "Enter"

# 等页面加载完再看状态
opencli browser state
```

### 5.5 常用浏览器命令速查

| 操作 | 命令 |
|------|------|
| 打开网页 | `opencli browser open <url>` |
| "读"页面 | `opencli browser state` |
| 点击元素 | `opencli browser click <编号>` |
| 输入文字 | `opencli browser type <编号> "内容"` |
| 按键 | `opencli browser keys "Enter"` |
| 返回 | `opencli browser back` |
| 滚动 | `opencli browser scroll down` |
| 获取标题 | `opencli browser get title` |
| 获取 URL | `opencli browser get url` |
| 等待文字出现 | `opencli browser wait text "加载完成"` |

**这说明了什么**：
- `browser state` 是最重要的命令——每次操作后都要跑一遍，确认结果
- 所有交互通过编号定位元素，不需要写 CSS 选择器
- 这就是 AI Agent 控制浏览器的方式：state → 决策 → 操作 → state → ...

---

## 第 6 步：给新网站造一个适配器

**目标**：为一个 OpenCLI 还没内置的网站创建你自己的命令。

### 6.1 一键生成

```bash
opencli generate https://hn.algolia.com --goal "搜索文章"
```

OpenCLI 会自动分析这个网站，尝试生成一个适配器。

### 6.2 手动写一个最简适配器

创建目录和文件：

```bash
mkdir -p ~/.opencli/clis/myhn
```

然后创建文件 `~/.opencli/clis/myhn/search.js`，写入以下内容：

```javascript
import { cli, Strategy } from '@jackwener/opencli/registry';

cli({
  site: 'myhn',
  name: 'search',
  description: '搜索 Hacker News 文章',
  domain: 'hn.algolia.com',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    { name: 'query', type: 'str', required: true, help: '搜索关键词' },
    { name: 'limit', type: 'int', default: 5, help: '结果数量' }
  ],
  columns: ['title', 'author', 'points', 'url'],

  func: async (_page, kwargs) => {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(kwargs.query)}&tags=story`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.hits || []).slice(0, kwargs.limit).map(item => ({
      title: item.title,
      author: item.author,
      points: item.points,
      url: item.url
    }));
  }
});
```

保存后，直接使用：

```bash
opencli myhn search "opencli" --limit 3
```

**你应该看到**：从 Hacker News 搜索到的文章表格。

**这说明了什么**：
- 适配器就是一个 JS 文件，放到 `~/.opencli/clis/<站点>/` 目录下
- `strategy: PUBLIC` 表示不需要登录，直接调公开 API
- 如果需要登录态，换成 `strategy: Strategy.COOKIE`
- `func` 函数里写获取数据的逻辑，返回数组即可

---

## 第 7 步：管道组合——把数据玩出花

**目标**：学会把 OpenCLI 的输出和其他命令行工具组合使用。

### 7.1 用 jq 过滤数据

```bash
# 只看播放量超过 100 万的 B 站视频
opencli bilibili hot -f json | jq '.[] | select(.play > 1000000) | .title'
```

### 7.2 批量搜索并汇总

```bash
# 同时搜多个关键词，合并结果
echo "opencli\nAI agent\nCLI tool" | while read q; do
  opencli myhn search "$q" -f json --limit 2
done | jq -s 'flatten | unique_by(.title) | .[0:10]'
```

### 7.3 定时采集

```bash
# 每分钟抓一次 Hacker News 热门，追加到文件
while true; do
  echo "--- $(date) ---" >> ~/Desktop/hn_log.txt
  opencli hackernews top --limit 5 -f csv >> ~/Desktop/hn_log.txt
  sleep 60
done
```

> 按 `Ctrl+C` 停止。

---

## 收官：你学到了什么

| 步骤 | 掌握的能力 | 覆盖场景 |
|------|-----------|----------|
| 第 1 步 | 环境检查 | 排查问题 |
| 第 2 步 | 调用内置命令获取公开数据 | HackerNews、GitHub Trending 等 |
| 第 3 步 | 控制输出格式 + 保存到文件 | 数据导出、对接其他工具 |
| 第 4 步 | 复用浏览器登录态 | B 站、知乎、Twitter 等需登录的站点 |
| 第 5 步 | 手动浏览器自动化 | state/click/type/keys 全套操作 |
| 第 6 步 | 创建自定义适配器 | 扩展 OpenCLI 支持新网站 |
| 第 7 步 | 管道组合 | jq 过滤、批量处理、定时采集 |

**还没覆盖的 20%**：AI Agent Skill 安装、桌面应用控制（Cursor/ChatGPT）、插件系统、CDP 配置。这些是进阶用法，需要时再查。

---

## 附录：命令速查表

```
# 环境检查
opencli doctor

# 查看所有命令
opencli list

# 内置命令格式
opencli <站点> <操作> --limit <数量> -f <格式>

# 浏览器控制
opencli browser open <url>        # 打开
opencli browser state             # 读取页面
opencli browser click <编号>       # 点击
opencli browser type <编号> "文字"  # 输入
opencli browser keys "Enter"      # 按键
opencli browser back              # 返回
opencli browser scroll down       # 滚动

# 自定义适配器
opencli generate <url> --goal "目标"

# 输出格式
-f table / json / yaml / md / csv

# 调试
opencli <命令> -v
```
