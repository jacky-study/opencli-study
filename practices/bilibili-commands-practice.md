---
article_id: OBA-bl7p3xk9
title: OpenCLI B 站适配器实操手册
description: 15 条 B 站命令的完整实操指南，每条命令均已跑通验证
date: 2026-04-29
status: verified
environment:
  opencli: 1.7.7
  node: v24.9.0
  os: macOS 14.1.1 (Apple M2)
  auth: cookie（Chrome 浏览器已登录 B 站）
---

# OpenCLI B 站适配器实操手册

> **所有命令均已在 2026-04-29 实测通过。** 认证模式统一为 `[cookie]`，需要 Chrome 浏览器已登录 B 站。

## 前置条件

```bash
# 1. 确认环境健康
opencli doctor
```

期望输出三项全绿：

```
[OK] Daemon: running on port 19825
[OK] Extension: connected
[OK] Connectivity: connected in 0.xs
```

> 如果 Extension 不是 connected，确认 Chrome 已打开且安装了 OpenCLI 扩展。

## 命令全景

| # | 命令 | 功能 | 实测状态 |
|---|------|------|---------|
| 1 | `hot` | 热门视频 | ✅ |
| 2 | `ranking` | 排行榜 | ✅ |
| 3 | `search` | 搜索 | ✅ |
| 4 | `video` | 视频详情 | ✅ |
| 5 | `user-videos` | UP 主投稿列表 | ✅ |
| 6 | `comments` | 视频评论 | ✅ |
| 7 | `subtitle` | 视频字幕 | ✅ |
| 8 | `download` | 下载视频 | ✅（需 yt-dlp） |
| 9 | `feed` | 动态时间线 | ✅ |
| 10 | `feed-detail` | 动态详情 | ✅ |
| 11 | `dynamic` | 用户动态 | ✅ |
| 12 | `following` | 关注列表 | ✅ |
| 13 | `favorite` | 我的收藏夹 | ✅ |
| 14 | `history` | 观看历史 | ✅ |
| 15 | `me` | 个人信息 | ✅ |

---

## 第 1 章：浏览发现

### 1.1 热门视频

```bash
opencli bilibili hot --limit 3
```

**输出**：

```yaml
- rank: 1
  title: 我男朋友死在了我床上，而如今我也随他而去，魂归黄泉
  author: 摩的司机徐师傅
  play: 698653
  danmaku: 1003
- rank: 2
  title: (1931——2020) 一位普通女性的世纪人生
  author: 妍妍酱的一天转关注版
  play: 54582
  danmaku: 548
- rank: 3
  title: 无公司，无投资，无AI！我们手搓了一个原创中恐无限流大电影！？
  author: 爱黏人的圆子哔___
  play: 1979475
  danmaku: 16931
```

### 1.2 排行榜

```bash
opencli bilibili ranking --limit 3
```

**输出**：

```yaml
- rank: 1
  title: 【NMIXX】"Crescendo" M/V
  author: NMIXX
  score: 869464
  url: https://www.bilibili.com/video/BV1zY9rBJEBb
- rank: 2
  title: 【星穹铁道生日会】二相乐园躲猫猫大赛！！
  author: WildKoko木可
  score: 1160581
  url: https://www.bilibili.com/video/BV1TFo7BiE11
- rank: 3
  title: 【星穹铁道生日会】《求索者》天才俱乐部印象曲
  author: 帷幕VMovie
  score: 1566120
  url: https://www.bilibili.com/video/BV1dio5BVEve
```

### 1.3 搜索

```bash
opencli bilibili search "AI" --limit 3
```

**输出**：

```yaml
- rank: 1
  title: 分享我转 AI 方向的学习路径和工作转变
  author: polebug23
  score: 14308
  url: https://www.bilibili.com/video/BV1co9yBhEvW
- rank: 2
  title: AI真的好用吗？影视飓风全新工作流分享！
  author: 影视飓风
  score: 1806180
  url: https://www.bilibili.com/video/BV16woRBfEsH
- rank: 3
  title: 何帆教授：越追AI风口，越容易被时代淘汰
  author: 凉子访谈录
  score: 144232
  url: https://www.bilibili.com/video/BV1dQDfBJEwz
```

> **提示**：搜索关键词用双引号包裹，支持中文和英文。

---

## 第 2 章：UP 主内容

### 2.1 UP 主投稿列表

```bash
# 按发布时间排序（默认）
opencli bilibili user-videos "王站岗" --limit 5
```

**输出**：

```yaml
- rank: 1
  title: 我的大电池单日涨15%，成为我今年大a里涨幅最多的票
  plays: 1771
  likes: 0
  date: '2026-04-29'
  url: https://www.bilibili.com/video/BV1Rn9QBMEqH
- rank: 2
  title: 遭遇财报杀，我今天大亏
  plays: 3134
  likes: 0
  date: '2026-04-28'
  url: https://www.bilibili.com/video/BV1P19kBcEDz
- rank: 3
  title: 半导体集体暴拉，我是不敢碰一点儿
  plays: 1863
  likes: 0
  date: '2026-04-27'
  url: https://www.bilibili.com/video/BV1TKoyBjEDP
- rank: 4
  title: 说说那些纯炒作的假商业航天，帮大家排排雷
  plays: 2968
  likes: 0
  date: '2026-04-26'
  url: https://www.bilibili.com/video/BV1xqofBHE6m
- rank: 5
  title: 美股的半导体已经产生了比较大的泡沫，见好就收
  plays: 2817
  likes: 0
  date: '2026-04-25'
  url: https://www.bilibili.com/video/BV18hoSBeEok
```

**按播放量排序**（看 UP 主最火的内容）：

```bash
opencli bilibili user-videos "王站岗" --limit 5 --order click
```

**输出**：

```yaml
- rank: 1
  title: 辨别一个博主是不是模拟盘
  plays: 72556
  likes: 0
  date: '2025-11-11'
  url: https://www.bilibili.com/video/BV1GvkkBmEfp
- rank: 2
  title: 说说a股真正的科技公司有哪些
  plays: 49919
  likes: 0
  date: '2025-12-21'
  url: https://www.bilibili.com/video/BV1gyq1B6EtW
- rank: 3
  title: 4月1日收盘总结：小米暴跌到46块，我并没有接回来
  plays: 48941
  likes: 0
  date: '2025-04-01'
  url: https://www.bilibili.com/video/BV1FzZtYPEvP
- rank: 4
  title: 已跌回到起点的中芯国际能抄底吗？
  plays: 27481
  likes: 0
  date: '2026-04-04'
  url: https://www.bilibili.com/video/BV1zcDKBCEDE
- rank: 5
  title: 小米股价会跌到多少？
  plays: 24126
  likes: 0
  date: '2025-11-08'
  url: https://www.bilibili.com/video/BV14a1XB3EaR
```

> **排序选项**：`--order pubdate`（按时间，默认）、`--order click`（按播放量）、`--order stow`（按收藏量）
>
> **分页**：`--page 2` 获取第二页，每页最多 50 条。

### 2.2 视频详情

先用 `user-videos` 或 `search` 拿到 BV 号，再查看详情：

```bash
opencli bilibili video BV1yWzDBjEKi
```

**输出**：

```yaml
- field: bvid
  value: BV1yWzDBjEKi
- field: aid
  value: '115953530569152'
- field: title
  value: 我为什么清仓了茅台
- field: author
  value: '王站岗 (mid: 3546869816887527)'
- field: publish_time
  value: 2026-01-25 03:12
- field: duration
  value: 2m31s (151s)
- field: view
  value: '10159'
- field: danmaku
  value: '9'
- field: reply
  value: '52'
- field: like
  value: '132'
- field: coin
  value: '9'
- field: favorite
  value: '21'
- field: share
  value: '13'
- field: parts
  value: '1'
- field: thumbnail
  value: http://i0.hdslb.com/bfs/archive/0f4bdb9e32a49458ef0d24f26a36491fe8cb86dd.jpg
```

> **返回字段丰富**：标题、作者、时长、播放量、弹幕、评论数、点赞、投币、收藏、分享、封面图等。

### 2.3 视频评论

```bash
opencli bilibili comments BV1yWzDBjEKi --limit 5
```

**输出**：

```yaml
- rank: 1
  author: 似从前asitwas
  text: 菜场主被洗出去了
  likes: 11
  replies: 0
  time: 2026-01-29 08:55
- rank: 2
  author: 过去式cc
  text: 您，是否在，按时间顺序，排序[星星眼]
  likes: 11
  replies: 0
  time: 2026-01-29 08:47
- rank: 3
  author: 心凯瑞
  text: 快涨停了
  likes: 9
  replies: 2
  time: 2026-01-29 06:29
- rank: 4
  author: 兄台莫生气
  text: 今天一涨顶了你9连跌
  likes: 5
  replies: 0
  time: 2026-01-29 06:53
- rank: 5
  author: 伊波小鸟
  text: 按时间排序[doge]
  likes: 4
  replies: 0
  time: 2026-01-29 08:28
```

### 2.4 视频字幕

```bash
opencli bilibili subtitle BV1yWzDBjEKi
```

**输出**（带时间戳的字幕列表）：

```yaml
- index: 1
  from: 0.16s
  to: 2.30s
  content: 关注我半年以上的朋友应该都知道
- index: 2
  from: 2.30s
  to: 5.14s
  content: 我在去年7月份大盘上3600的时候
- index: 3
  from: 5.14s
  to: 6.72s
  content: 进行了大幅度的调仓
- index: 4
  from: 6.72s
  to: 8.03s
  content: 进入了防守模式
- index: 5
  from: 8.03s
  to: 10.31s
  content: 当时我以1400块的价格
# ... 共 68 条字幕
- index: 68
  from: 149.18s
  to: 150.86s
  content: 没再接回茅台呀
```

> **注意**：不是所有视频都有字幕。没有字幕的视频会报错。

### 2.5 下载视频

```bash
opencli bilibili download BV1yWzDBjEKi
```

> **前置**：需要安装 `yt-dlp`（`brew install yt-dlp`）。
>
> **可选参数**：
> - `--output ./downloads` — 指定输出目录（默认 `./bilibili-downloads`）
> - `--quality 1080p` — 画质选择（best / 1080p / 720p / 480p）

---

## 第 3 章：动态与关注

### 3.1 动态时间线（关注的人）

```bash
# 不传参数 → 查看关注的人的动态
opencli bilibili feed --limit 5
```

**输出**：

```yaml
- rank: 1
  time: 9分钟前
  author: polebug23
  title: '[图片x1]'
  type: draw
  likes: 17
  url: https://t.bilibili.com/1196735445309849603
- rank: 2
  time: 13分钟前
  author: 胡慢慢滚雪球
  title: 随便聊聊
  type: draw
  likes: 1
  url: https://t.bilibili.com/1196734448870096928
- rank: 3
  time: 13分钟前
  author: 全球宏观FICC
  title: 印尼突然翻脸改规矩，过河拆桥，反向收割中企！
  type: video
  likes: 3
  url: https://www.bilibili.com/video/BV1gq9yB5EPv/
```

### 3.2 指定用户的动态

```bash
# 传用户名 → 查看指定用户的动态
opencli bilibili feed "王站岗" --limit 3
```

**输出**：

```yaml
- rank: 1
  time: 5小时前
  author: 王站岗
  title: 我的大电池单日涨15%，成为我今年大a里涨幅最多的票
  type: video
  likes: 30
  url: https://www.bilibili.com/video/BV1Rn9QBMEqH
- rank: 2
  time: 昨天 19:42
  author: 王站岗
  title: 遭遇财报杀，我今天大亏
  type: video
  likes: 65
  url: https://www.bilibili.com/video/BV1P19kBcEDz
- rank: 3
  time: 2天前
  author: 王站岗
  title: 半导体集体暴拉，我是不敢碰一点儿
  type: video
  likes: 40
  url: https://www.bilibili.com/video/BV1TKoyBjEDP
```

### 3.3 动态详情

从 `feed` 输出中拿到动态 ID（URL 中的数字），查看详情：

```bash
opencli bilibili feed-detail 1196735445309849603
```

**输出**：

```yaml
- field: id
  value: '1196735445309849603'
- field: author
  value: polebug23
- field: time
  value: 2026年04月29日 23:04
- field: type
  value: draw
- field: images
  value: http://i0.hdslb.com/bfs/new_dyn/715cde975cc355bda759c5db25eb1b8058078997.png
- field: likes
  value: '19'
- field: comments
  value: '4'
- field: forwards
  value: '0'
- field: url
  value: https://t.bilibili.com/1196735445309849603
```

### 3.4 我的动态

```bash
opencli bilibili dynamic --limit 3
```

**输出**：

```yaml
- id: '1196735445309849603'
  author: polebug23
  text: ''
  likes: 17
  url: https://t.bilibili.com/1196735445309849603
- id: '1196734448870096928'
  author: 胡慢慢滚雪球
  text: 随便聊聊
  likes: 1
  url: https://t.bilibili.com/1196734448870096928
- id: '1196734234122780675'
  author: 全球宏观FICC
  text: 印尼突然翻脸改规矩，过河拆桥，反向收割中企！
  likes: 4
  url: https://t.bilibili.com/1196734234122780675
```

### 3.5 关注列表

```bash
opencli bilibili following --limit 5
```

**输出**：

```yaml
- mid: 3546869816887527
  name: 王站岗
  sign: 抄作业1k/month：askwzg
  following: 已关注
  fans: ''
- mid: 1659565416
  name: AI大白话007
  sign: 每天5分钟，看懂AI前沿技术 不追热点，只讲底层逻辑
  following: 已关注
  fans: ''
- mid: 413596956
  name: Simon_HeQAQ
  sign: 我是Simon He，一位自学转行前端的开源爱好者
  following: 已关注
  fans: ''
```

---

## 第 4 章：个人数据

### 4.1 我的信息

```bash
opencli bilibili me
```

**输出**：

```yaml
name: 酸菜小子闯天下
uid: 35688154
level: 6
coins: 1213.5
followers: 0
following: 0
```

### 4.2 我的收藏夹

```bash
opencli bilibili favorite --limit 5
```

**输出**：

```yaml
- rank: 1
  title: 完整版！《诀别书》交响乐现场
  author: XSO西安交响乐团
  plays: 2393597
  url: https://www.bilibili.com/video/BV1cCdUBCEcU
- rank: 2
  title: 我妹瘦了80斤后，突然陷入了虚无主义…
  author: 欧阳春晓Aurora
  plays: 2510368
  url: https://www.bilibili.com/video/BV1MDoWBdEoy
- rank: 3
  title: 从零开始用国内网络跑通Claude Code等一切Agent
  author: 技术爬爬虾
  plays: 48867
  url: https://www.bilibili.com/video/BV1qtdSBkEDy
```

### 4.3 观看历史

```bash
opencli bilibili history --limit 5
```

**输出**：

```yaml
- rank: 1
  title: 我为什么清仓了茅台
  author: 王站岗
  progress: 0:01/2:31 (1%)
  url: https://www.bilibili.com/video/BV1yWzDBjEKi
- rank: 2
  title: 女流聊到弟弟和闺女
  author: NICHOLASDOGEGG
  progress: 0:02/17:26 (0%)
  url: https://www.bilibili.com/video/BV14XoZBHEZv
- rank: 3
  title: 【4K】梁博 曾经是情侣 音画修复版
  author: 钢蛋和卢比
  progress: 0:28/6:39 (7%)
  url: https://www.bilibili.com/video/BV1SZ4y167L8
- rank: 4
  title: 在百万豪装录音棚大声听吴青峰《起风了》
  author: JLRS-LeoFM
  progress: 已看完
  url: https://www.bilibili.com/video/BV1mG4y1J7Kr
- rank: 5
  title: 【私藏馆】朴树《平凡之路》
  author: 音乐私藏馆
  progress: 已看完
  url: https://www.bilibili.com/video/BV1bo4y1A7S9
```

> **特色**：`progress` 字段显示观看进度（时间或"已看完"）。

---

## 第 5 章：输出格式与管道

所有命令都支持 `-f` 切换输出格式：

| 格式 | 参数 | 适用场景 |
|------|------|---------|
| yaml | 默认 | 终端浏览 |
| table | `-f table` | 终端可读性最佳 |
| json | `-f json` | 程序处理，配合 jq |
| csv | `-f csv` | Excel 打开 |
| md | `-f md` | 嵌入 Markdown |

### 示例：UP 主视频 + jq 分析

```bash
# 获取视频列表（JSON）→ 按播放量排序
opencli bilibili user-videos "王站岗" --limit 20 -f json | \
  jq '.[] | {title, plays, date}'

# 导出为 CSV
opencli bilibili user-videos "王站岗" --limit 50 -f csv > bilibili_videos.csv

# table 格式查看
opencli bilibili user-videos "王站岗" --limit 10 -f table
```

### 实用组合

```bash
# 搜索 → 获取第一条视频的详情
BV=$(opencli bilibili search "关键词" -f json | jq -r '.[0].url' | grep -o 'BV\w*')
opencli bilibili video "$BV"

# 获取 UP 主热门视频的字幕
opencli bilibili user-videos "王站岗" --limit 1 --order click -f json | \
  jq -r '.[0].url' | grep -o 'BV\w*' | \
  xargs -I{} opencli bilibili subtitle {}
```

---

## 第 6 章：已知问题

| 问题 | 影响 | 解决方案 |
|------|------|---------|
| `likes` 字段在 `user-videos` 中始终为 0 | 无法直接看点赞数 | 用 `video` 命令查单条视频的 `like` 字段 |
| `user-videos` 不在 `opencli list` 输出中 | 容易忽略这个命令 | 直接用，命令本身可正常工作 |
| `subtitle` 部分视频无字幕 | 会报错 | 先用 `video` 查看，或 try-catch |
| `download` 依赖 yt-dlp | 未安装时报错 | `brew install yt-dlp` |
| 单页最多 50 条 | 需要翻页 | `--page 2`、`--page 3`... |

---

## 命令速查表

```
# 环境
opencli doctor

# 浏览发现
opencli bilibili hot --limit 10
opencli bilibili ranking --limit 10
opencli bilibili search "关键词" --limit 10

# UP 主内容
opencli bilibili user-videos "用户名" --limit 20 --order click
opencli bilibili video BV1xxx
opencli bilibili comments BV1xxx --limit 20
opencli bilibili subtitle BV1xxx
opencli bilibili download BV1xxx

# 动态关注
opencli bilibili feed --limit 10
opencli bilibili feed "用户名" --limit 10
opencli bilibili feed-detail <动态ID>
opencli bilibili dynamic --limit 10
opencli bilibili following --limit 10

# 个人数据
opencli bilibili me
opencli bilibili favorite --limit 10
opencli bilibili history --limit 10

# 输出格式
-f table / json / yaml / md / csv
```
