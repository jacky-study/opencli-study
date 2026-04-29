---
article_id: OBA-cmd4l1st
tags: [opencli, cheatsheet, commands, catalog]
type: cheatsheet
created_at: 2026-04-29
---

# OpenCLI 全站命令速查卡

> 100+ 站点、800+ 命令，一张卡查完所有可用的 `opencli` 指令。

---

## 通用用法

```bash
opencli <site> <command> [options]        # 基本格式
opencli <site> <command> --limit 10       # 限制条数
opencli <site> <command> -f json          # 输出格式：table(默认) / json / csv / yaml / md
opencli <site> <command> -v               # Verbose 模式（显示 pipeline 调试步骤）
opencli list                               # 查看所有已注册命令
opencli doctor                             # 前置检查（三项全绿才能用）
```

### 认证模式说明

| 标记 | 含义 | 要求 |
|------|------|------|
| 🌐 Public | 公开 API，无需登录 | 直接可用 |
| 🌐/🔐 | 公开+登录增强 | 不登录也能用，登录后数据更全 |
| 🔐 Browser | 需要浏览器登录 | Chrome 登录目标站点 + 安装 Browser Bridge 扩展 |
| 🔑 Local API | 需本地凭证 | 配置 API Key |
| 🔑 OAuth API | 需要 OAuth 授权 | 首次使用需 `auth` 命令授权 |
| 🖥️ Desktop | 桌面应用控制 | 应用需运行中，通过 CDP 控制 |

---

## 社交媒体

### Twitter (30 命令) 🔐

```bash
opencli twitter trending                              # 热门趋势
opencli twitter search "keyword" --limit 10           # 搜索
opencli twitter timeline                              # 个人时间线
opencli twitter profile <username>                    # 用户资料
opencli twitter tweets <username> --limit 20          # 用户推文
opencli twitter post "Hello World"                    # 发推
opencli twitter reply <tweet_id> "回复内容"            # 回复
opencli twitter thread <tweet_id>                     # 查看帖子串
opencli twitter like <tweet_id>                       # 点赞
opencli twitter bookmark <tweet_id>                   # 书签
opencli twitter follow <username>                     # 关注
opencli twitter download <username> --limit 20        # 下载媒体
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `trending` | 热门趋势 | `search` | 搜索推文 |
| `timeline` | 时间线 | `tweets` | 用户推文 |
| `profile` | 用户资料 | `post` | 发推 |
| `reply` | 回复推文 | `reply-dm` | 回复私信 |
| `thread` | 帖子串 | `like` / `likes` | 点赞 / 查看点赞 |
| `bookmark` / `unbookmark` | 添加/取消书签 | `bookmarks` | 查看书签 |
| `follow` / `unfollow` | 关注/取关 | `followers` / `following` | 粉丝/关注列表 |
| `block` / `unblock` | 拉黑/取消 | `list-tweets` | 列表推文 |
| `lists` | 查看列表 | `list-add` / `list-remove` | 列表增删 |
| `article` | 长文 | `download` | 下载媒体 |
| `notifications` | 通知 | `delete` | 删推 |
| `hide-reply` | 隐藏回复 | `accept` | 接受关注请求 |

### Reddit (15 命令) 🔐

```bash
opencli reddit hot --limit 10                         # 热门
opencli reddit search "keyword"                       # 搜索
opencli reddit subreddit <name>                       # 子版块
opencli reddit read <post_id>                         # 阅读帖子
opencli reddit upvote <post_id>                       # 点赞
opencli reddit comment <post_id> "评论内容"            # 评论
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `hot` / `frontpage` / `popular` | 热门/首页/流行 | `search` | 搜索 |
| `subreddit` | 子版块 | `read` | 阅读帖子 |
| `user` | 用户信息 | `user-posts` / `user-comments` | 用户帖子/评论 |
| `upvote` / `upvoted` | 点赞/已点赞 | `save` / `saved` | 收藏/已收藏 |
| `comment` | 评论 | `subscribe` | 订阅 |

### 小红书 (15 命令) 🔐

```bash
opencli xiaohongshu search "关键词" --limit 10        # 搜索笔记
opencli xiaohongshu note <url>                        # 查看笔记
opencli xiaohongshu user <user_id>                    # 用户信息
opencli xiaohongshu feed --limit 10                   # 推荐流
opencli xiaohongshu download <url> --output ./xhs     # 下载媒体
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `search` | 搜索笔记 | `note` | 笔记详情 |
| `feed` | 推荐流 | `user` | 用户信息 |
| `comments` | 评论 | `notifications` | 通知 |
| `download` | 下载媒体 | `publish` | 发布笔记 |
| `creator-notes` | 创作者笔记列表 | `creator-note-detail` | 笔记详情 |
| `creator-notes-summary` | 笔记汇总 | `creator-profile` | 创作者资料 |
| `creator-stats` | 创作者数据 | | |

### B 站 (16 命令) 🔐

```bash
opencli bilibili hot --limit 10                       # 热门视频
opencli bilibili search "关键词" --type video          # 搜索（video/user）
opencli bilibili video BV1xxx                         # 视频详情
opencli bilibili subtitle BV1xxx --lang zh-CN         # 字幕
opencli bilibili comments BV1xxx --limit 20           # 评论
opencli bilibili download BV1xxx --output ./dl        # 下载视频
opencli bilibili me                                   # 我的资料
opencli bilibili favorite --limit 10                  # 收藏夹
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `hot` | 热门视频 | `search` | 搜索视频/用户 |
| `video` | 视频详情 | `subtitle` | 获取字幕 |
| `comments` | 视频评论 | `download` | 下载视频 |
| `me` | 我的资料 | `favorite` | 收藏夹 |
| `history` | 观看历史 | `feed` / `feed-detail` | 动态流/动态详情 |
| `ranking` | 排行榜 | `dynamic` | 动态 |
| `following` | 关注列表 | `user-videos` | 用户投稿 |

### 微博 (9 命令) 🔐

```bash
opencli weibo hot --limit 10                          # 热搜
opencli weibo search "关键词"                         # 搜索
opencli weibo feed --limit 10                         # 关注流
opencli weibo post "内容"                             # 发微博
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `hot` | 热搜 | `search` | 搜索 |
| `feed` | 关注流 | `user` | 用户信息 |
| `me` | 我的资料 | `post` | 发微博 |
| `comments` | 评论 | | |

### 知乎 (11 命令) 🔐

```bash
opencli zhihu hot --limit 10                          # 热榜
opencli zhihu search "关键词"                         # 搜索
opencli zhihu question <id>                           # 问题详情
opencli zhihu answer <id>                             # 回答详情
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `hot` | 热榜 | `search` | 搜索 |
| `question` | 问题详情 | `answer` | 回答详情 |
| `follow` | 关注 | `like` | 点赞 |
| `favorite` | 收藏 | `comment` | 评论 |
| `download` | 下载 | | |

### 抖音 (13 命令) 🔐

```bash
opencli douyin profile                                # 个人资料
opencli douyin videos --limit 10                      # 我的视频
opencli douyin user-videos <uid>                      # 用户视频
opencli douyin publish --video ./video.mp4            # 发布视频
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `profile` | 个人资料 | `videos` | 我的视频 |
| `user-videos` | 用户视频 | `activities` | 动态 |
| `collections` | 合集 | `hashtag` | 话题标签 |
| `location` | 位置 | `stats` | 数据统计 |
| `publish` | 发布视频 | `draft` / `drafts` | 草稿 |
| `delete` | 删除 | `update` | 更新 |

### TikTok (15 命令) 🔐

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `explore` | 探索 | `search` | 搜索 |
| `profile` | 个人资料 | `user` | 用户信息 |
| `following` | 关注列表 | `follow` / `unfollow` | 关注/取关 |
| `like` / `unlike` | 点赞/取消 | `comment` | 评论 |
| `save` / `unsave` | 收藏/取消 | `live` | 直播 |
| `notifications` | 通知 | `friends` | 好友 |

### Instagram (19 命令) 🔐

```bash
opencli instagram explore --limit 10                  # 探索
opencli instagram search "keyword"                    # 搜索
opencli instagram user <username>                     # 用户资料
opencli instagram download <username> --limit 20      # 下载媒体
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `explore` | 探索 | `profile` | 个人资料 |
| `search` | 搜索 | `user` | 用户信息 |
| `followers` / `following` | 粉丝/关注 | `follow` / `unfollow` | 关注/取关 |
| `like` / `unlike` | 点赞/取消 | `comment` | 评论 |
| `save` / `unsave` / `saved` | 收藏/取消/已收藏 | `note` | 笔记 |
| `post` | 发帖 | `reel` | Reels |
| `story` | 快拍 | `download` | 下载媒体 |

### Facebook (10 命令) 🔐

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `feed` | 动态流 | `profile` | 个人资料 |
| `search` | 搜索 | `friends` | 好友列表 |
| `groups` | 群组 | `events` | 活动 |
| `notifications` | 通知 | `memories` | 回忆 |
| `add-friend` | 添加好友 | `join-group` | 加入群组 |

### V2EX (11 命令) 🌐/🔐

```bash
opencli v2ex hot --limit 10                           # 热门
opencli v2ex latest                                   # 最新
opencli v2ex topic <id>                               # 帖子详情
opencli v2ex me                                       # 我的资料
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `hot` | 热门 | `latest` | 最新 |
| `topic` | 帖子详情 | `node` | 节点 |
| `user` / `member` | 用户信息 | `replies` | 回复 |
| `nodes` | 所有节点 | `daily` | 每日 |
| `me` | 我的资料 | `notifications` | 通知 |

### 即刻 (10 命令) 🔐

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `feed` | 动态流 | `search` | 搜索 |
| `post` | 帖子详情 | `topic` | 话题 |
| `user` | 用户信息 | `create` | 发布 |
| `comment` | 评论 | `like` | 点赞 |
| `repost` | 转发 | `notifications` | 通知 |

### Linux.do (11 命令) 🌐/🔐

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `hot` | 热门 | `latest` | 最新 |
| `feed` | 动态流 | `search` | 搜索 |
| `categories` | 分类列表 | `category` | 分类详情 |
| `tags` | 标签列表 | `topic` | 话题详情 |
| `topic-content` | 话题内容 | `user-posts` | 用户帖子 |
| `user-topics` | 用户话题 | | |

### Bluesky (9 命令) 🌐

```bash
opencli bluesky search "keyword"                      # 搜索
opencli bluesky trending                              # 热门
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `search` | 搜索 | `profile` | 个人资料 |
| `user` | 用户信息 | `feeds` | 信息流 |
| `followers` / `following` | 粉丝/关注 | `thread` | 帖子串 |
| `trending` | 热门 | `starter-packs` | 入门包 |

### 贴吧 (4 命令) 🔐

| 命令 | 说明 |
|------|------|
| `hot` | 热门 |
| `posts` | 帖子 |
| `search` | 搜索 |
| `read` | 阅读 |

### 虎扑 (7 命令) 🌐/🔐

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `hot` | 热门 | `search` | 搜索 |
| `detail` | 详情 | `mentions` | 提及 |
| `reply` | 回复 | `like` | 点赞 |
| `unlike` | 取消点赞 | | |

### 脉脉 (1 命令) 🔐

| 命令 | 说明 |
|------|------|
| `search-talents` | 搜索人才 |

### Band (4 命令) 🔐

| 命令 | 说明 |
|------|------|
| `bands` | 群组列表 |
| `posts` | 帖子列表 |
| `post` | 帖子详情 |
| `mentions` | 提及 |

### 知识星球 (5 命令) 🔐

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `groups` | 星球列表 | `dynamics` | 动态 |
| `topics` | 话题列表 | `topic` | 话题详情 |
| `search` | 搜索 | | |

---

## 电商购物

### 京东 (6 命令) 🔐

```bash
opencli jd item <product_id>                          # 商品详情
opencli jd search "关键词"                            # 搜索
opencli jd add-cart <product_id>                      # 加购物车
opencli jd cart                                       # 购物车
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `item` | 商品详情 | `add-cart` | 加购物车 |
| `cart` | 购物车 | `detail` | 详情 |
| `reviews` | 评价 | `search` | 搜索 |

### 淘宝 (5 命令) 🔐

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `search` | 搜索 | `add-cart` | 加购物车 |
| `cart` | 购物车 | `detail` | 详情 |
| `reviews` | 评价 | | |

### 1688 (5 命令) 🔐

```bash
opencli 1688 search "关键词"                          # 搜索
opencli 1688 item <id>                                # 商品详情
opencli 1688 download <id> --output ./dl              # 下载媒体
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `search` | 搜索 | `item` | 商品详情 |
| `assets` | 商品素材 | `download` | 下载媒体 |
| `store` | 店铺信息 | | |

### 闲鱼 (3 命令) 🔐

| 命令 | 说明 |
|------|------|
| `search` | 搜索 |
| `item` | 商品详情 |
| `chat` | 聊天 |

### Amazon (9 命令) 🌐/🔐

```bash
opencli amazon search "keyword"                       # 搜索
opencli amazon bestsellers                            # 畅销榜
opencli amazon product <asin>                         # 商品详情
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `bestsellers` | 畅销榜 | `search` | 搜索 |
| `product` | 商品详情 | `offer` | 优惠 |
| `discussion` | 讨论 | `movers-shakers` | 飙升榜 |
| `new-releases` | 新品 | `rankings` | 排行 |

### Coupang (2 命令) 🔐

| 命令 | 说明 |
|------|------|
| `search` | 搜索 |
| `add-to-cart` | 加入购物车 |

---

## 求职招聘

### BOSS 直聘 (14 命令) 🔐

```bash
opencli boss search "前端开发" --city 上海             # 搜索职位
opencli boss detail <job_id>                          # 职位详情
opencli boss recommend                                # 推荐职位
opencli boss greet <boss_id>                          # 打招呼
opencli boss chatlist                                 # 聊天列表
opencli boss chatmsg <chat_id>                        # 聊天记录
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `search` | 搜索职位 | `detail` | 职位详情 |
| `recommend` | 推荐职位 | `joblist` | 职位列表 |
| `greet` | 打招呼 | `batchgreet` | 批量打招呼 |
| `send` | 发消息 | `chatlist` | 聊天列表 |
| `chatmsg` | 聊天记录 | `invite` | 邀请 |
| `mark` | 标记 | `exchange` | 交换 |
| `resume` | 简历 | `stats` | 统计 |

### 51job (4 命令) 🔐

| 命令 | 说明 |
|------|------|
| `search` | 搜索 |
| `hot` | 热门 |
| `detail` | 详情 |
| `company` | 公司 |

### 牛客网 (16 命令) 🌐/🔐

```bash
opencli nowcoder hot --limit 10                       # 热门
opencli nowcoder search "面试题"                       # 搜索
opencli nowcoder jobs --limit 10                      # 招聘
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `hot` | 热门 | `trending` | 趋势 |
| `topics` | 话题 | `recommend` | 推荐 |
| `creators` | 创作者 | `companies` | 公司 |
| `jobs` | 招聘 | `search` | 搜索 |
| `suggest` | 搜索建议 | `experience` | 面经 |
| `referral` | 内推 | `salary` | 薪资 |
| `papers` | 试卷 | `practice` | 练习 |
| `notifications` | 通知 | `detail` | 详情 |

---

## 视频音频

### YouTube (15 命令) 🔐

```bash
opencli youtube search "关键词" --limit 10            # 搜索
opencli youtube video <url>                           # 视频详情
opencli youtube transcript <url>                      # 字幕/转录
opencli youtube channel <id>                          # 频道信息
opencli youtube comments <url> --limit 20             # 评论
opencli youtube feed --limit 10                       # 订阅流
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `search` | 搜索 | `video` | 视频详情 |
| `transcript` | 字幕/转录 | `transcript-group` | 字幕组 |
| `comments` | 评论 | `channel` | 频道信息 |
| `playlist` | 播放列表 | `feed` | 订阅流 |
| `history` | 观看历史 | `watch-later` | 稍后观看 |
| `subscriptions` | 订阅列表 | `like` / `unlike` | 点赞/取消 |
| `subscribe` / `unsubscribe` | 订阅/退订 | | |

### 小宇宙 (6 命令) 🔑 Local API

```bash
opencli xiaoyuzhou podcast <id>                       # 播客信息
opencli xiaoyuzhou episode <id>                       # 单集详情
opencli xiaoyuzhou transcript <id>                    # 转录文本
opencli xiaoyuzhou download <id>                      # 下载
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `auth` | 认证 | `podcast` | 播客信息 |
| `podcast-episodes` | 播客单集列表 | `episode` | 单集详情 |
| `download` | 下载 | `transcript` | 转录文本 |

---

## AI & LLM 平台

### Gemini (5 命令) 🔐

```bash
opencli gemini new                                    # 新建对话
opencli gemini ask "问题"                             # 提问
opencli gemini image "提示词"                         # 生成图片
opencli gemini deep-research "主题"                   # 深度研究
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `new` | 新建对话 | `ask` | 提问 |
| `image` | 生成图片 | `deep-research` | 深度研究 |
| `deep-research-result` | 研究结果 | | |

### 豆包 (9 命令) 🔐

```bash
opencli doubao new                                    # 新建对话
opencli doubao ask "问题"                             # 提问
opencli doubao meeting-summary <url>                  # 会议摘要
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `status` | 状态 | `new` | 新建对话 |
| `send` | 发送 | `read` | 读取 |
| `ask` | 提问 | `history` | 历史记录 |
| `detail` | 详情 | `meeting-summary` | 会议摘要 |
| `meeting-transcript` | 会议转录 | | |

### NotebookLM (14 命令) 🔐

```bash
opencli notebooklm list                               # 列出笔记本
opencli notebooklm open <id>                          # 打开笔记本
opencli notebooklm summary                            # 生成摘要
opencli notebooklm source-list                        # 来源列表
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `status` | 状态 | `list` | 列出笔记本 |
| `open` | 打开笔记本 | `current` | 当前笔记本 |
| `get` | 获取信息 | `source-list` | 来源列表 |
| `source-get` | 获取来源 | `source-fulltext` | 来源全文 |
| `source-guide` | 来源指南 | `history` | 历史记录 |
| `note-list` | 笔记列表 | `notes-get` | 获取笔记 |
| `summary` | 摘要 | | |

### ChatGPT App (7 命令) 🖥️

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `status` | 状态 | `new` | 新建对话 |
| `send` | 发送 | `read` | 读取 |
| `ask` | 提问 | `model` | 模型 |
| `ax` | AX 操作 | | |

### 元宝 (2 命令) 🔐

| 命令 | 说明 |
|------|------|
| `new` | 新建对话 |
| `ask` | 提问 |

### Grok (1 命令) 🔐

| 命令 | 说明 |
|------|------|
| `ask` | 提问 |

### ChatGPT Web (1 命令) 🔐

| 命令 | 说明 |
|------|------|
| `image` | 生成图片 |

### Doubao App (7 命令) 🖥️

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `status` | 状态 | `new` | 新建对话 |
| `send` | 发送 | `read` | 读取 |
| `ask` | 提问 | `screenshot` | 截图 |
| `dump` | 导出 | | |

---

## 金融行情

### 雪球 (13 命令) 🔐

```bash
opencli xueqiu hot-stock --limit 10                   # 热门股票
opencli xueqiu stock <symbol>                         # 股票详情
opencli xueqiu search "关键词"                        # 搜索
opencli xueqiu kline <symbol>                         # K线数据
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `feed` | 动态流 | `hot-stock` | 热门股票 |
| `hot` | 热门 | `search` | 搜索 |
| `stock` | 股票详情 | `comments` | 评论 |
| `watchlist` | 自选股 | `earnings-date` | 财报日期 |
| `fund-holdings` | 基金持仓 | `fund-snapshot` | 基金快照 |
| `groups` | 股吧 | `kline` | K线数据 |

### 东方财富 (15 命令) 🔐

```bash
opencli eastmoney hot-rank                             # 热门排行
opencli eastmoney quote <symbol>                      # 行情报价
opencli eastmoney kline <symbol>                      # K线数据
opencli eastmoney longhu                               # 龙虎榜
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `hot-rank` | 热门排行 | `_secid` | 证券ID |
| `announcement` | 公告 | `convertible` | 可转债 |
| `etf` | ETF | `holders` | 持仓 |
| `kline` | K线数据 | `kuaixun` | 快讯 |
| `longhu` | 龙虎榜 | `money-flow` | 资金流向 |
| `northbound` | 北向资金 | `quote` | 行情 |
| `rank` | 排行 | `sectors` | 板块 |
| `index-board` | 指数看板 | | |

### Binance (11 命令) 🌐

```bash
opencli binance price BTCUSDT                         # 单币价格
opencli binance prices                                # 所有价格
opencli binance klines BTCUSDT                        # K线数据
opencli binance top                                   # 涨幅排行
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `price` | 单币价格 | `prices` | 所有价格 |
| `ticker` | 行情 | `pairs` | 交易对 |
| `trades` | 成交 | `depth` | 深度 |
| `asks` | 卖单 | `klines` | K线数据 |
| `top` | 涨幅排行 | `gainers` | 涨幅榜 |
| `losers` | 跌幅榜 | | |

### Barchart (5 命令) 🌐

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `quote` | 行情 | `options` | 期权 |
| `greeks` | 希腊值 | `flow` | 资金流 |

### 新浪财经 (4 命令) 🌐/🔐

| 命令 | 说明 |
|------|------|
| `news` | 新闻 |
| `rolling-news` | 滚动新闻 |
| `stock` | 股票 |
| `stock-rank` | 股票排行 |

### 通达信 (1 命令) 🔐

| 命令 | 说明 |
|------|------|
| `hot-rank` | 热门排行 |

### 同花顺 (1 命令) 🔐

| 命令 | 说明 |
|------|------|
| `hot-rank` | 热门排行 |

---

## 新闻资讯

### Bloomberg (10 命令) 🌐/🔐

```bash
opencli bloomberg main                                # 首页
opencli bloomberg markets                             # 市场
opencli bloomberg tech                                # 科技
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `main` | 首页 | `markets` | 市场 |
| `economics` | 经济 | `industries` | 产业 |
| `tech` | 科技 | `politics` | 政治 |
| `businessweek` | 商业周刊 | `opinions` | 观点 |
| `feeds` | 信息流 | `news` | 新闻 |

### 36氪 (4 命令) 🌐/🔐

| 命令 | 说明 |
|------|------|
| `news` | 新闻 |
| `hot` | 热门 |
| `search` | 搜索 |
| `article` | 文章 |

### 头条 (1 命令) 🔐

| 命令 | 说明 |
|------|------|
| `articles` | 文章列表 |

### 新浪博客 (4 命令) 🌐/🔐

| 命令 | 说明 |
|------|------|
| `hot` | 热门 |
| `search` | 搜索 |
| `article` | 文章 |
| `user` | 用户 |

### Google (4 命令) 🌐/🔐

```bash
opencli google search "关键词"                        # 搜索
opencli google news                                   # 新闻
opencli google trends                                 # 趋势
opencli google suggest "关键词"                       # 搜索建议
```

### Reuters (1 命令) 🔐

| 命令 | 说明 |
|------|------|
| `search` | 搜索 |

### Product Hunt (4 命令) 🌐/🔐

| 命令 | 说明 |
|------|------|
| `posts` | 产品列表 |
| `today` | 今日新品 |
| `hot` | 热门 |
| `browse` | 浏览 |

---

## 开发者 & 技术

### GitHub (Gitee) (3 命令) 🌐/🔐

```bash
opencli gitee trending                                # 趋势项目
opencli gitee search "关键词"                         # 搜索
opencli gitee user <username>                         # 用户信息
```

### ONES (11 命令) 🔐 + 环境变量

```bash
opencli ones login                                    # 登录
opencli ones tasks --limit 10                         # 任务列表
opencli ones my-tasks                                 # 我的任务
opencli ones worklog                                  # 工作日志
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `login` | 登录 | `me` | 我的资料 |
| `token-info` | Token 信息 | `tasks` | 任务列表 |
| `my-tasks` | 我的任务 | `task` | 任务详情 |
| `worklog` | 工作日志 | `logout` | 登出 |
| `enrich-tasks` | 丰富任务 | `resolve-labels` | 解析标签 |
| `task-helpers` | 任务辅助 | | |

### Stack Overflow (4 命令) 🌐

```bash
opencli stackoverflow hot --limit 10                  # 热门问题
opencli stackoverflow search "react hooks"            # 搜索
opencli stackoverflow bounties                        # 悬赏问题
```

| 命令 | 说明 |
|------|------|
| `hot` | 热门问题 |
| `search` | 搜索 |
| `bounties` | 悬赏问题 |
| `unanswered` | 未回答 |

### LessWrong (16 命令) 🌐

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `curated` | 精选 | `frontpage` | 首页 |
| `new` | 最新 | `top` / `top-week` / `top-month` / `top-year` | 排行 |
| `read` | 阅读 | `comments` | 评论 |
| `user` | 用户 | `user-posts` | 用户帖子 |
| `tag` / `tags` | 标签 | `sequences` | 序列 |
| `shortform` | 短文 | | |

### Lobsters (5 命令) 🌐

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `hot` | 热门 | `newest` | 最新 |
| `active` | 活跃 | `tag` | 标签 |

### HackerNews (8 命令) 🌐

```bash
opencli hackernews top --limit 10                     # 热门
opencli hackernews best                               # 精选
opencli hackernews search "关键词"                    # 搜索
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `top` | 热门 | `new` | 最新 |
| `best` | 精选 | `ask` | 提问 |
| `show` | 展示 | `jobs` | 招聘 |
| `search` | 搜索 | `user` | 用户 |

---

## 书籍阅读

### 微信读书 (9 命令) 🔐

```bash
opencli weread shelf                                  # 书架
opencli weread search "书名"                          # 搜索
opencli weread book <id>                              # 书籍详情
opencli weread highlights --limit 20                  # 划线笔记
opencli weread ai-outline <book_id>                   # AI 大纲
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `shelf` | 书架 | `search` | 搜索 |
| `book` | 书籍详情 | `ranking` | 排行榜 |
| `notebooks` | 笔记本 | `highlights` | 划线笔记 |
| `notes` | 笔记 | `ai-outline` | AI 大纲 |

### 豆瓣 (9 命令) 🔐

```bash
opencli douban search "电影名"                        # 搜索
opencli douban top250                                 # Top 250
opencli douban subject <id>                           # 条目详情
opencli douban movie-hot                              # 电影热门
opencli douban book-hot                               # 图书热门
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `search` | 搜索 | `top250` | Top 250 |
| `subject` | 条目详情 | `photos` | 图片 |
| `download` | 下载 | `marks` | 标记 |
| `reviews` | 评论 | `movie-hot` | 电影热门 |
| `book-hot` | 图书热门 | | |

### z-library (2 命令) 🔐

| 命令 | 说明 |
|------|------|
| `search` | 搜索 |
| `info` | 书籍信息 |

### Pixiv (7 命令) 🔐

```bash
opencli pixiv ranking --limit 10                      # 排行榜
opencli pixiv search "关键词"                         # 搜索
opencli pixiv download <id> --output ./pixiv          # 下载
```

| 命令 | 说明 | 命令 | 说明 |
|------|------|------|------|
| `ranking` | 排行榜 | `search` | 搜索 |
| `user` | 用户 | `illusts` | 插画列表 |
| `detail` | 详情 | `download` | 下载 |

---

## 学术研究

### arXiv (2 命令) 🌐

```bash
opencli arxiv search "transformer" --limit 10         # 搜索论文
opencli arxiv paper <id>                              # 论文详情
```

### Google Scholar (3 命令) 🌐

```bash
opencli google-scholar search "关键词"                # 搜索
opencli google-scholar cite <id>                      # 引用
opencli google-scholar profile <id>                   # 学者主页
```

### 百度学术 (1 命令) 🌐 | `search`

### 万方 (1 命令) 🌐 | `search`

### CNKI (1 命令) 🌐 | `search`

### 法律/政策 🌐

| 站点 | 命令 | 说明 |
|------|------|------|
| `gov-law` | `search` `recent` | 法律法规搜索 |
| `gov-policy` | `search` `recent` | 政策文件搜索 |

### PaperReview (3 命令) 🌐 | `submit` `review` `feedback`

---

## 桌面应用控制 🖥️

> 所有桌面应用命令通过 CDP（Chrome DevTools Protocol）控制，应用需运行中。

### Cursor IDE (12 命令)

```bash
opencli cursor status                                 # 检查状态
opencli cursor new                                    # 新建对话
opencli cursor send "帮我实现 XX"                      # 发送消息
opencli cursor read                                   # 读取回复
opencli cursor ask "问题"                             # 一次性提问
opencli cursor model                                  # 查看当前模型
opencli cursor extract-code                           # 提取代码
opencli cursor screenshot                             # 截图
```

| `status` | `send` | `read` | `new` | `dump` | `composer` | `model` | `extract-code` | `ask` | `screenshot` | `history` | `export` | |

### Codex CLI (11 命令)

| `status` | `send` | `read` | `new` | `extract-diff` | `model` | `ask` | `screenshot` | `history` | `export` | |

### Antigravity (9 命令)

| `status` | `send` | `read` | `new` | `dump` | `extract-code` | `model` | `watch` | `serve` | |

### ChatGPT App (7 命令) | `status` `new` `send` `read` `ask` `model` `ax`

### ChatWise (9 命令) | `status` `new` `send` `read` `ask` `model` `history` `export` `screenshot`

### Notion (9 命令)

```bash
opencli notion status                                 # 检查状态
opencli notion search "关键词"                        # 搜索
opencli notion read <page_id>                         # 读取页面
opencli notion new "标题"                             # 新建页面
opencli notion write <page_id> --content "内容"       # 写入内容
```

| `status` | `search` | `read` | `new` | `write` | `sidebar` | `favorites` | `export` | |

### Discord (8 命令) | `status` `send` `read` `channels` `servers` `search` `members` `delete`

### Doubao App (7 命令) | `status` `new` `send` `read` `ask` `screenshot` `dump`

---

## 其他工具

### Web 读取 (1 命令) 🔐

```bash
opencli web read <url>                                # 渲染感知读取网页内容
```

### AI 图像生成

| 站点 | 命令 | 认证 |
|------|------|------|
| **yollomi** (12) | `generate` `video` `edit` `upload` `models` `remove-bg` `upscale` `face-swap` `restore` `try-on` `background` `object-remover` | 🔐 |
| **jimeng** (4) | `generate` `history` `new` `workspaces` | 🔐 |

### 幕布 (5 命令) 🔐 | `doc` `docs` `notes` `recent` `search`

### UIverse (2 命令) 🔐 | `code` `preview`

### 微信公众号 (3 命令) 🔐 | `download` `drafts` `create-draft`

### 云存储

| 站点 | 命令 | 认证 |
|------|------|------|
| **夸克网盘** (7) | `ls` `mkdir` `mv` `rename` `rm` `save` `share-tree` | 🔐 |

### 建筑采购

| 站点 | 命令 | 认证 |
|------|------|------|
| **剑鱼** (5) | `china-bid-search` `detail` `procurement-contract` `procurement-detail` `search` | 🔐 |
| **国电** (1) | `search` | 🔐 |

### 教育

| 站点 | 命令 | 认证 |
|------|------|------|
| **超星** (2) | `assignments` `exams` | 🔐 |
| **小鹅通** (5) | `courses` `detail` `catalog` `play-url` `content` | 🔐 |

### 房产

| 站点 | 命令 | 认证 |
|------|------|------|
| **贝壳** (4) | `ershoufang` `zufang` `xiaoqu` `chengjiao` | 🔐 |

### 旅行 | **携程** (1) 🔐 | `search`

### 音乐 | **Spotify** (11 命令) 🔑 OAuth | `auth` `status` `play` `pause` `next` `prev` `volume` `search` `queue` `shuffle` `repeat`

### IMDb (6 命令) 🌐/🔐 | `search` `title` `top` `trending` `person` `reviews`

### Medium (3 命令) 🌐/🔐 | `feed` `search` `user`

### Substack (3 命令) 🌐/🔐 | `feed` `search` `publication`

### Steam (1 命令) 🌐 | `top-sellers`

### HuggingFace (1 命令) 🌐 | `top`

### BBC (1 命令) 🌐 | `news`

### Dev.to (3 命令) 🌐 | `top` `tag` `user`

### Apple Podcasts (3 命令) 🌐 | `search` `episodes` `top`

### Dictionary (3 命令) 🌐 | `search` `synonyms` `examples`

### Yahoo Finance (1 命令) 🌐 | `quote`

### Wikipedia (4 命令) 🌐 | `search` `summary` `random` `trending`

### 什么值得买 (1 命令) 🔐 | `search`

---

## 下载功能速查

> 多个站点支持 `download` 命令，用于下载媒体文件。

| 站点 | 支持类型 | 特殊要求 | 示例 |
|------|----------|----------|------|
| bilibili | 视频 | 需 `yt-dlp` | `opencli bilibili download BV1xxx -o ./dl` |
| youtube | 视频 | 需 `yt-dlp` | `opencli youtube download <url> -o ./yt` |
| twitter | 图片/视频 | — | `opencli twitter download <user> --limit 20` |
| xiaohongshu | 图片/视频 | — | `opencli xiaohongshu download <url>` |
| douyin | 视频 | — | `opencli douyin download <url>` |
| douban | 图片 | — | `opencli douban download <id>` |
| pixiv | 插画 | — | `opencli pixiv download <id>` |
| 1688 | 商品图片 | — | `opencli 1688 download <id>` |
| xiaoyuzhou | 音频 | 本地凭证 | `opencli xiaoyuzhou download <id>` |
| instagram | 图片/视频 | — | `opencli instagram download <user>` |
| weixin | 素材 | — | `opencli weixin download <url>` |

---

## 输出格式速查

```bash
opencli <site> <command> -f json    # JSON 格式，适合管道处理（jq/LLM）
opencli <site> <command> -f csv     # CSV 格式，适合电子表格
opencli <site> <command> -f yaml    # YAML 格式
opencli <site> <command> -f md      # Markdown 表格
opencli <site> <command> -v         # Verbose：显示 pipeline 调试步骤
```

---

## 常见工作流

### 工作流 1：搜索 → 详情 → 下载

```bash
opencli bilibili search "Claude Code"     # 搜索
opencli bilibili video BV1xxx             # 查看详情
opencli bilibili download BV1xxx          # 下载
```

### 工作流 2：搜索 → 字幕 → 翻译

```bash
opencli youtube search "AI Agent"         # 搜索
opencli youtube transcript <url>          # 获取字幕
```

### 工作流 3：社交媒体发布

```bash
opencli twitter post "发布内容"            # 发推
opencli xiaohongshu publish --title "标题" --content "内容"  # 发布笔记
```

### 工作流 4：招聘求职

```bash
opencli boss search "前端" --city 上海    # 搜索
opencli boss detail <id>                  # 详情
opencli boss greet <id>                   # 打招呼
opencli boss chatlist                     # 查看聊天
```

### 工作流 5：AI 对话

```bash
opencli gemini new                        # 新建对话
opencli gemini ask "解释 transformer"     # 提问
opencli gemini deep-research "AI Agent"   # 深度研究
```
