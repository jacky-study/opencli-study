---
article_id: OBA-arc6p9w1
tags: [opencli, cheatsheet, architecture, core-design]
type: cheatsheet
created_at: 2026-04-27
---

# OpenCLI 架构速查卡

> 从 18,290 行源码中提炼的核心架构要素，帮你快速定位关键代码和设计决策。

---

## 核心架构图

```
用户输入
  │
  ▼
┌──────────────────┐     ┌────────────────────┐
│  CLI 入口层       │     │  YAML Pipeline 引擎 │
│  (src/cli.mjs)    │────▶│  (src/processor/)   │
└──────────────────┘     └────────┬───────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
              ┌──────────┐ ┌──────────┐  ┌────────────┐
              │ 适配器层  │ │ 浏览器桥接 │  │ AI Agent  │
              │ (clis/)  │ │ (Bridge)  │  │ (LLM 调用) │
              └──────────┘ └──────────┘  └────────────┘
```

---

## 关键数据

| 项目 | 值 |
|------|-----|
| 版本 | v1.7.8 |
| 语言 | TypeScript (ES Modules) |
| 运行时 | Node.js >= 21 / Bun >= 1.0 |
| 核心模块 | 81 个 TS 文件 |
| 适配器数 | 90+ 站点 |
| 常驻进程 | Daemon (端口 19825) |

---

## 核心模块速查

| 模块 | 路径 | 职责 |
|------|------|------|
| CLI 入口 | `src/cli.mjs` | 解析命令行参数，路由到处理器 |
| 命令处理器 | `src/processor/` | Pipeline 引擎：步骤解析、执行、输出 |
| 适配器目录 | `clis/` | 每个网站一个子目录（zhihu/、bilibili/ 等） |
| 浏览器桥接 | `src/browser-bridge/` | BrowserBridge + CDPBridge 双通道 |
| Daemon | `src/daemon/` | HTTP + WebSocket 常驻进程，端口 19825 |
| AI 集成 | `src/agent/` | LLM 调用、Tool Use 协议 |
| DOM 打标 | `src/dom-snapshot/` | data-opencli-ref 编号注入 |

---

## 双引擎架构

| 引擎 | 格式 | 适用场景 | 扩展方式 |
|------|------|----------|----------|
| **YAML Pipeline** | `.yaml` 配置文件 | 标准化网站（有 API） | 写 YAML 定义步骤 |
| **TypeScript 适配器** | `.js/.ts` 脚本 | 复杂交互（需 Cookie/UI） | 写代码实现逻辑 |

---

## 浏览器双通道架构

| 通道 | 类 | 用途 | 连接方式 |
|------|-----|------|----------|
| BrowserBridge | `BrowserBridge` | 基础操作（fetch/evaluate） | Chrome 扩展 → Daemon |
| CDPBridge | `CDPBridge` | 底层控制（网络拦截/截图） | CDP 协议直连 |

**IPage 统一抽象**：上层代码不关心用哪个 Bridge，统一调用 IPage 接口。

---

## Daemon 安全设计

| 措施 | 说明 |
|------|------|
| 随机端口 | 避免固定端口被探测 |
| 本地绑定 | 只监听 127.0.0.1 |
| 请求验证 | 验证来源合法性 |

---

## Pipeline 引擎核心流程

```yaml
# 典型 Pipeline 定义（以知乎热榜为例）
steps:
  - name: navigate          # 步骤 1：导航到页面
    url: https://www.zhihu.com

  - name: evaluate          # 步骤 2：执行 JS 获取数据
    expression: fetch(apiUrl, {credentials: 'include'})

  - name: map               # 步骤 3：转换数据格式
    fields: [title, url, hot_value]

  - name: limit             # 步骤 4：限制输出数量
    count: 10
```

**执行顺序**：navigate → evaluate → map → limit → output

---

## DOM 打标机制

```
页面加载 → content_script 注入 → 遍历可见元素 → 注入 data-opencli-ref="N"
                                                        │
                              state 命令读取 ◀──────────┘
```

**关键**：每次页面变化（导航、点击、滚动）后编号会**重新分配**，必须重新 `state`。

---

## 快速定位代码

| 想了解... | 看这个文件 |
|-----------|-----------|
| 命令如何注册 | `src/cli.mjs` + `clis/*/index.yaml` |
| Pipeline 如何执行 | `src/processor/pipeline.mjs` |
| 浏览器如何连接 | `src/browser-bridge/browser-bridge.mjs` |
| Cookie 如何获取 | `src/browser-bridge/cookie-manager.mjs` |
| DOM 快照如何生成 | `src/dom-snapshot/snapshot.mjs` |
| Daemon 如何启动 | `src/daemon/server.mjs` |
| AI 如何调用 | `src/agent/agent.mjs` |

---

> [!seealso] 相关笔记
> - 架构详解 → [[01-opencli-architecture-and-core-design|架构与核心设计]]
> - 导读指南 → [[02-opencli-guide|OpenCLI 仓库导读指南]]
> - 架构笔记 → [[01-architecture|整体架构概览]]
> - CLI 引擎 → [[03-cli-transform-engine|CLI 转换引擎]]
> - 浏览器命令 → [[browser-commands-cheat-sheet|Browser 命令速查卡]]
