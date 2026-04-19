---
tags: [opencli, cli, ai-agent, browser-automation]
created: 2026-04-20
---

# OpenCLI 使用指南

> 让任何网站和工具变成 CLI 命令的 AI 原生运行时，16k+ Stars

## 📌 项目概览

**核心价值**：将网站、Electron 应用、本地二进制转化为标准化 CLI 命令，让 AI Agent 可以像调用 API 一样使用命令行工具。

**技术特征**：
- 零 LLM Token 消耗，纯确定性算法
- 101 个网站适配器，846 个命令文件
- Daemon + Chrome 扩展架构，复用用户已登录浏览器

**代码规模**：约 18,290 行核心代码，60 个源文件，101 个站点适配器

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────┐
│                  用户 / AI Agent                  │
│            opencli <site> <cmd> [args]           │
└───────────────────────┬─────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          v             v             v
    ┌──────────┐  ┌──────────┐  ┌───────────┐
    │ Registry │  │Pipeline  │  │ Discovery │
    │ 全局注册表 │  │ 流水线引擎 │  │ 适配器发现 │
    └────┬─────┘  └────┬─────┘  └─────┬─────┘
         └──────────────┼──────────────┘
                        │
          ┌─────────────┼─────────────┐
          v                           v
    ┌───────────┐               ┌───────────┐
    │BrowserBridge│              │ CDPBridge │
    │ Daemon+扩展 │              │ CDP直连    │
    │ (网站)      │              │ (Electron) │
    └───────────┘               └───────────┘
```

### 核心数据流（以发推为例）

```
用户输入 → 命令路由 → 策略选择(UI) → 启动浏览器 → DOM操作 → 格式化输出
opencli twitter post "Hello"
→ registry 查找 twitter/post
→ 启动 BrowserBridge → Chrome 扩展 → CDP
→ page.goto(x.com/compose) → 粘贴文本 → 点击发送
→ JSON 输出 { status: "success" }
```

### 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| CLI 框架 | Commander.js | 命令解析 |
| 浏览器控制 | CDP + Chrome 扩展 | DOM 自动化 |
| 流水线 | 自研 YAML Pipeline | 声明式数据获取 |
| HTTP | undici | 高性能请求 |
| 模板 | node:vm 沙箱 | 表达式求值 |

## 🗺️ 关键文件地图

| 优先级 | 文件路径 | 行数 | 职责 | 何时阅读 |
|--------|---------|------|------|---------|
| ⭐⭐⭐ | `src/main.ts` | ~200 | 入口，三层启动路径 | 第一个读 |
| ⭐⭐⭐ | `src/registry.ts` | ~300 | 命令注册中心 | 理解命令定义 |
| ⭐⭐⭐ | `src/pipeline/executor.ts` | ~400 | 流水线执行核心 | 理解数据处理 |
| ⭐⭐ | `src/browser/bridge.ts` | ~350 | 浏览器桥接 | 理解网站自动化 |
| ⭐⭐ | `src/browser/cdp.ts` | ~400 | CDP 直连 | 理解 Electron 控制 |
| ⭐⭐ | `src/execution.ts` | ~300 | 命令执行引擎 | 理解执行流程 |
| ⭐ | `src/plugin.ts` | ~1571 | 插件系统 | 理解扩展机制 |
| ⭐ | `clis/twitter/post.js` | ~100 | 典型适配器示例 | 学习写适配器 |

### ⚠️ 高风险文件

| 文件 | 风险 | 说明 |
|------|------|------|
| `src/plugin.ts` | 复杂度高 | 1571 行，管理插件全生命周期 |
| `src/cli.ts` | 注册密集 | 1466 行，所有命令注册逻辑 |
| `src/browser/cdp.ts` | 状态管理 | CDP 连接生命周期复杂 |

## 💡 核心设计决策

| 问题 | 方案 | 原因 |
|------|------|------|
| 为什么不用 Puppeteer？ | Daemon + Chrome 扩展 | 复用用户已登录浏览器，无需重新登录 |
| 为什么不用 LLM？ | 纯确定性算法 | 零 Token 消耗，结果可复现 |
| 如何处理认证？ | 5 级策略级联 | 自动从 PUBLIC → COOKIE → UI 选择最优路径 |
| 如何定位 DOM？ | ref + 指纹系统 | 兼顾速度和可靠性 |
| 如何定义命令？ | 声明式 + 编程式 | pipeline 适合简单场景，func 适合复杂逻辑 |

## 🚀 本地搭建（5 步内）

### 前置条件

| 工具 | 要求 | 说明 |
|------|------|------|
| Node.js | >= 21.0 | 使用 styleText() 和顶层 await |
| npm/bun | 任意 | 包管理 |
| Chrome | 最新版 | 浏览器自动化需要 |

### 安装步骤

1. **克隆仓库**：`git clone https://github.com/jackwener/opencli.git && cd opencli`
2. **安装依赖**：`npm install`
3. **构建**：`npm run build`
4. **链接全局**：`npm link`
5. **验证**：`opencli --version` + `opencli hackernews hot`

## 🐛 调试指南

### 各组件调试入口

| 组件 | 打开方式 | 说明 |
|------|---------|------|
| 命令执行 | `--verbose` 标志 | 显示详细执行日志 |
| 浏览器会话 | `--debug` 标志 | 保持浏览器窗口打开 |
| 适配器诊断 | `OPENCLI_DIAGNOSTIC=1` | 获取结构化错误上下文 |

### 常见问题排查

**问题：浏览器命令无响应**
→ 原因：Chrome 扩展未安装或 daemon 未启动
→ 排查：`opencli doctor` 检查环境状态

**问题：Cookie 策略失效**
→ 原因：目标网站未在 Chrome 中登录
→ 排查：先在 Chrome 中手动登录目标网站

## 🎯 适合谁用

| 角色 | 场景 |
|------|------|
| AI Agent 开发者 | 让 Agent 通过 CLI 操控网站 |
| 自动化工程师 | 无需 API 即可自动化网站操作 |
| CLI 爱好者 | 用命令行操作社交媒体、工具 |
| 框架研究者 | 学习浏览器自动化 + CLI 设计 |

## 📖 进阶阅读

→ [整体架构与核心设计](01-architecture.md) — 设计模式、技术栈、代码质量
→ [AI Agent 集成机制](02-ai-agent-integration.md) — SKILL.md、发现、执行、自修复
→ [CLI 转换引擎](03-cli-transform-engine.md) — Adapter、浏览器控制、DOM 映射
