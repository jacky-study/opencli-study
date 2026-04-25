---
article_id: OBA-nl1gi17d
title: OpenCLI 真实浏览器唤起机制 + Web Access vs Midscene 对比
tags: [opencli, browser-automation, cdp, web-access, midscene]
created_at: 2026-04-21
updated_at: 2026-04-21
---

# OpenCLI 如何唤起“真实浏览器”

## 一句话结论
OpenCLI 不是每次新开一个 Playwright 无状态浏览器，而是通过 **本地 daemon + Chrome 扩展 Browser Bridge + CDP**，接入你日常使用中的 Chrome/Chromium，会话天然继承登录态。

## 关键调用链（从命令到浏览器）
1. 运行时入口选择 BrowserFactory：普通网站走 `BrowserBridge`，Electron 走 `CDPBridge`（`src/runtime.ts`）。
2. `browserSession()` 调用 `BrowserBridge.connect()`（`src/runtime.ts`）。
3. `BrowserBridge` 先做 daemon 健康检查：
   - 若 daemon + extension ready：直接复用
   - 若 daemon 存在但 extension 未连：等待或提示安装/启用扩展
   - 若 daemon 不存在：自动 spawn `daemon.ts`（`src/browser/bridge.ts`）
4. daemon 在 `localhost:19825` 提供 HTTP + WebSocket 桥接：CLI 发 `/command`，再转发给扩展（`src/daemon.ts`）。
5. 浏览器扩展后台脚本通过 `/ping` 探测 daemon，再连 WS；收到命令后调用 Chrome APIs / CDP 执行（`extension/src/background.ts`）。
6. 扩展维护独立 automation window + workspace 隔离 + idle 自动回收，减少对用户正在使用 tab 的干扰（`extension/src/background.ts`）。

## 为什么它属于“真实浏览器唤起”
- 直接绑定用户本机 Chrome 环境（非全新沙盒 profile）
- 可继承已有 Cookie/Session 登录态
- 支持在浏览器真实标签页上下文中操作
- 实际调度链路是 CLI → daemon → extension → CDP/Chrome APIs

---

# Web Access vs Midscene（结合你现有 Obsidian 结论）

## 两者本质差异
- Web Access：更像“Agent 联网策略层 + CDP 执行封装”。强调工具路由（Search/Fetch/curl/CDP）和登录态复用。
- Midscene：更像“视觉驱动的 UI Agent 执行引擎”。强调纯视觉定位、自然语言操作、跨 Web/Android/iOS/PC。

## 对比矩阵（面向你关注的真实浏览器自动化）
| 维度 | Web Access | Midscene |
|---|---|---|
| 真实浏览器接入 | 强，基于 Chrome remote debugging/CDP proxy，偏向复用日常 Chrome | 可接入（Bridge Mode/CDP），也可走 Puppeteer/Playwright 新实例 |
| 登录态继承 | 强（本地 Chrome 天然登录态） | 中（Puppeteer 模式通常新会话；CDP 模式可复用） |
| 执行范式 | 规则/策略 + 显式动作编排 | 视觉模型驱动的 Plan/Locate/Action 循环 |
| 操作精度（结构化表单） | 高（DOM/CDP 精确） | 中高（依赖视觉定位；长文本输入有误差风险） |
| 跨端能力 | 主要 Web | Web + Android + iOS + PC |
| 运行成本 | 低（CDP 操作为主，无每步视觉推理必需） | 高于前者（每步可能调用视觉模型） |
| 可观测性 | 截图/DOM/日志 | 内置 replay/report 能力较强 |

## 结合你已有笔记的场景建议
1. 需要“登录态网站 + 精确执行 + 成本可控”：优先 Web Access。
2. 需要“复杂 UI 感知 + 非 DOM 场景（canvas/移动端）”：优先 Midscene。
3. 最稳的工程组合：
   - Midscene 负责探索与视觉理解
   - Web Access 负责关键动作落地（提交、发布、高精度输入）

---

# 2026-04-21 快速结论
- OpenCLI 的真实浏览器唤起机制成熟：daemon 自动拉起 + extension 常驻连接 + workspace 窗口隔离。
- Web Access 与 Midscene 不是替代关系，更多是“策略执行层”与“视觉智能层”的互补。
- 你的 Obsidian 历史结论（公开页面 Midscene、登录/高精度场景 Web Access）与当前官方文档方向一致，可继续沿用。

