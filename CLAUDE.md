# OpenCLI Study

本项目用于研究 [jackwener/opencli](https://github.com/jackwener/opencli) 仓库。

## 项目简介

OpenCLI — 让任何网站和工具变成 CLI。一个通用的 CLI Hub 和 AI 原生运行时。

- **语言**: JavaScript/TypeScript
- **Stars**: 16,428
- **版本**: 1.7.4

## 目录结构

```
opencli-study/
├── opencli/          # 源码（来自 GitHub 浅克隆）
├── notes/            # 研究笔记
├── scripts/          # 辅助脚本
├── .study-meta.json  # 项目元数据
└── CLAUDE.md         # 本文件
```

## 研究主题

- [ ] 整体架构与核心设计
- [ ] AI Agent 集成机制
- [ ] CLI 转换引擎

## 笔记索引

- [01 - 整体架构概览](notes/01-architecture.md)
- [02 - AI Agent 集成](notes/02-ai-agent-integration.md)
- [03 - CLI 转换引擎](notes/03-cli-transform-engine.md)
- [04 - 真实浏览器唤起机制 + Web Access vs Midscene](notes/04-real-browser-wakeup-and-web-access-vs-midscene.md)
- [05 - 浏览器桥接机制](notes/05-opencli-browser-bridge-mechanism.md)
- [08 - OpenCLI 使用指南（HOW-TO-USE）](notes/08-opencli-how-to-use-guide.md)

<!-- ob-index:start -->
## Obsidian 知识库

> 索引路径：`/Users/jiashengwang/jacky-github/jacky-obsidian/wiki/open-source/opencli-study/index.md`
> 渐进式加载：先读本概览，需要详情时读取索引文件，再读取具体文章。

| 文件 | 主题 | 何时读取 |
|------|------|----------|
| 06-browser-bridge-csp-troubleshooting.md | CSP 三层限制与排查 | 遇到 Chrome 扩展 CSP 限制时 |
| 07-opencli-demo-development-lessons.md | Demo 开发经验与教训 | 需要参考开发调试经验时 |
<!-- ob-index:end -->
