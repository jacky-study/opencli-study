# OpenCLI Study

本项目用于研究 [jackwener/opencli](https://github.com/jackwener/opencli) 仓库。

## 项目简介

OpenCLI — 让任何网站和工具变成 CLI。一个通用的 CLI Hub 和 AI 原生运行时。

- **语言**: JavaScript/TypeScript
- **Stars**: 16,428
- **版本**: 1.7.8
- **surveyState**: completed（已完成系统调研，后续为增量问答模式）

## 目录结构

```
opencli-study/
├── opencli/              # 源码（来自 GitHub 浅克隆）
├── explorer/             # 成体系笔记（Survey 产出，带编号前缀）
│   └── cheatsheet/       # 速查卡片（不带编号，每维度一份）
├── notes/                # 零散研究笔记（Incremental 产出）
├── scripts/              # 辅助脚本
├── Question.md           # 问题追踪（边看笔记边记录看不懂的地方）
├── .study-meta.json      # 项目元数据
└── CLAUDE.md             # 本文件
```

## 研究主题

- [x] 整体架构与核心设计
- [x] AI Agent 集成机制
- [x] CLI 转换引擎
- [x] 浏览器唤起与方案对比
- [x] 浏览器桥接机制
- [x] 认证策略
- [x] DOM 快照与元素打标
- [x] 浏览器命令实战

## Explorer 笔记索引

> 成体系笔记，带阅读顺序编号。

| # | 文件 | Article ID | 主题 |
|---|------|-----------|------|
| 01 | [opencli-architecture-and-core-design.md](explorer/01-opencli-architecture-and-core-design.md) | OBA-tktvzbf4 | 架构与核心设计 |
| 02 | [opencli-guide.md](explorer/02-opencli-guide.md) | OBA-qxq1fy8v | 导读指南 |

### Cheat Sheet（速查卡片）

> 不带编号，按维度分类，即查即用。

| 文件 | Article ID | 主题 |
|------|-----------|------|
| [browser-commands-cheat-sheet.md](explorer/cheatsheet/browser-commands-cheat-sheet.md) | OBA-bcm4k7r2 | 26 条浏览器命令速查 |
| [auth-strategy-cheat-sheet.md](explorer/cheatsheet/auth-strategy-cheat-sheet.md) | OBA-ast8m3v5 | 5 层认证策略速查 |
| [architecture-cheat-sheet.md](explorer/cheatsheet/architecture-cheat-sheet.md) | OBA-arc6p9w1 | 核心架构速查 |

## Notes 笔记索引

> 零散研究笔记，按主题分类。

| 文件 | Article ID | 主题 |
|------|-----------|------|
| [01-architecture.md](notes/01-architecture.md) | OBA-88dvprll | 整体架构概览 |
| [02-ai-agent-integration.md](notes/02-ai-agent-integration.md) | OBA-kv6o2qtx | AI Agent 集成 |
| [03-cli-transform-engine.md](notes/03-cli-transform-engine.md) | OBA-ss4arkds | CLI 转换引擎 |
| [04-real-browser-wakeup-and-web-access-vs-midscene.md](notes/04-real-browser-wakeup-and-web-access-vs-midscene.md) | OBA-nl1gi17d | 浏览器唤起 + Web Access vs Midscene |
| [05-opencli-browser-bridge-mechanism.md](notes/05-opencli-browser-bridge-mechanism.md) | OBA-hkwlo3qp | 浏览器桥接机制 |
| [06-browser-bridge-csp-troubleshooting.md](notes/06-browser-bridge-csp-troubleshooting.md) | OBA-a3u0hadi | CSP 三层限制与排查 |
| [07-opencli-demo-development-lessons.md](notes/07-opencli-demo-development-lessons.md) | OBA-xpscm86y | Demo 开发经验与教训 |
| [08-opencli-how-to-use-guide.md](notes/08-opencli-how-to-use-guide.md) | OBA-z8dtxeez | 使用指南（HOW-TO-USE） |
| [09-browser-commands-deep-dive.md](notes/09-browser-commands-deep-dive.md) | OBA-ub43lfgf | 浏览器命令完全指南（26 条） |
| [auth-strategy.md](notes/auth-strategy.md) | OBA-2tpxpr5e | 5 层认证策略 |
| [dom-snapshot-element-tagging.md](notes/dom-snapshot-element-tagging.md) | OBA-wj394cgy | DOM 快照与元素打标 |
| [opencli-design-skill.md](notes/opencli-design-skill.md) | OBA-7l53aosl | 设计模式 Skill 模板 |
| [opencli-guide.md](notes/opencli-guide.md) | OBA-azmrdfhz | 导读指南（notes 版） |

<!-- ob-index:start -->
## Obsidian 知识库

> 索引路径：`/Users/jiashengwang/jacky-github/jacky-obsidian/wiki/open-source/opencli-study/index.md`
> 渐进式加载：先读本概览，需要详情时读取索引文件，再读取具体文章。

| 文件 | Article ID | 主题 | 何时读取 |
|------|-----------|------|----------|
| 05-opencli-browser-bridge-mechanism.md | OBA-hkwlo3qp | 浏览器桥接 + 自动化窗口 + CDP | 理解 browser open 背后行为、窗口创建机制、CDP 调试协议时 |
| dom-snapshot-element-tagging.md | OBA-wj394cgy | DOM 快照与元素打标机制 | 理解 OpenCLI 如何感知页面元素、data-opencli-ref 打标流程时 |
| auth-strategy.md | OBA-2tpxpr5e | OpenCLI 5 层认证策略 | 理解命令认证模式（public/cookie/header/intercept/ui）时 |
| 06-browser-bridge-csp-troubleshooting.md | OBA-a3u0hadi | CSP 三层限制与排查 | 遇到 Chrome 扩展 CSP 限制时 |
| 07-opencli-demo-development-lessons.md | OBA-xpscm86y | Demo 开发经验与教训 | 需要参考开发调试经验时 |
| 09-browser-commands-deep-dive.md | OBA-ub43lfgf | 浏览器命令完全指南（26 条命令实战） | 需要查 browser 命令用法、参数、输出示例时 |
<!-- ob-index:end -->
