---
article_id: OBA-qxq1fy8v
title: OpenCLI 仓库导读指南
tags: [opencli, guide, survey]
---

# OpenCLI 仓库导读指南

> **这是什么**：一份帮助你在 10 分钟内理解 OpenCLI 代码库的指南。
> **适合谁**：想要阅读源码、贡献代码、或深入理解实现原理的开发者。
> **如何使用**：按顺序阅读，每节引用具体文件路径，可直接跳转。

---

## 一、项目概况

**OpenCLI** — AI 原生的浏览器自动化工具，将网站、桌面应用、本地工具统一为 CLI 命令。

| 基本信息 | 值 |
|----------|-----|
| 版本 | v1.7.8 |
| 语言 | TypeScript (ES Modules) |
| 运行时 | Node.js >= 21 / Bun >= 1.0 |
| 适配器数 | 90+ 站点 |
| 核心模块 | 81 个 TypeScript 文件 |

---

## 二、5 分钟理解核心架构

### 启动流程（从入口到命令执行）

```
opencli bilibili video BV1xx...
  │
  ├─ [1] src/main.ts
  │     快速路径判断 → 走完整启动
  │
  ├─ [2] src/discovery.ts
  │     读取 cli-manifest.json → 毫秒级发现命令
  │
  ├─ [3] src/registry.ts
  │     注册到全局命令表 (globalThis.__opencli_registry__)
  │
  ├─ [4] src/commanderAdapter.ts
  │     桥接到 Commander.js CLI 框架
  │
  └─ [5] src/execution.ts
        参数验证 → 浏览器会话 → 执行 → 输出
```

### 核心数据流

```
clis/bilibili/video.js    →   discovery   →   registry   →   execution   →   output
       适配器定义              命令发现        命令注册       命令执行        格式化输出
```

---

## 三、目录地图

```
opencli/
├── src/                          # 核心源码 ← 理解架构从这里开始
│   ├── main.ts                   # [入口] 启动优化、快速路径
│   ├── registry.ts               # [核心] 全局命令注册表 + 策略枚举
│   ├── discovery.ts              # [核心] CLI 发现、manifest 加载
│   ├── execution.ts              # [核心] 命令执行引擎
│   ├── commanderAdapter.ts       # [桥接] 注册表 → Commander.js
│   ├── analysis.ts               # [智能] 认证推断、字段检测
│   ├── daemon.ts                 # [浏览器] Daemon 守护进程管理
│   ├── plugin.ts                 # [扩展] 插件管理
│   ├── hooks.ts                  # [生命周期] 钩子系统
│   ├── types.ts                  # [类型] IPage 接口定义
│   ├── constants.ts              # [常量] 字段语义映射
│   ├── browser/                  # [浏览器] 操作抽象层（49个文件）
│   │   ├── cdp.ts                #   CDP 客户端实现
│   │   └── runtime.ts            #   浏览器会话管理
│   ├── pipeline/                 # [管道] YAML 声明式执行引擎
│   │   ├── executor.ts           #   步骤执行器（支持重试）
│   │   ├── registry.ts           #   步骤注册表
│   │   └── template.ts           #   模板变量渲染
│   ├── download/                 # [下载] 下载功能模块
│   └── commands/                 # [命令] 内置命令实现
│
├── clis/                         # 适配器目录 ← 90+ 站点定义
│   ├── twitter/                  #   Twitter/X 适配器
│   ├── bilibili/                 #   Bilibili 适配器
│   ├── reddit/                   #   Reddit 适配器
│   └── ...                       #   107 个站点子目录
│
├── extension/                    # Chrome 扩展 ← Browser Bridge 核心
│   ├── manifest.json             #   扩展配置（权限、Service Worker）
│   └── src/background.ts         #   Service Worker（WebSocket 通信）
│
├── skills/                       # AI Agent Skills ← AI 集成
│   ├── opencli-adapter-author/   #   适配器编写指导
│   ├── opencli-autofix/          #   自动修复
│   ├── opencli-browser/          #   浏览器参考
│   └── smart-search/             #   能力搜索
│
├── docs/                         # VitePress 文档站
│   ├── guide/                    #   用户指南
│   ├── adapters/                 #   适配器文档
│   ├── developer/                #   开发者指南
│   └── advanced/                 #   高级主题
│
├── tests/                        # 测试套件
│   ├── e2e/                      #   端到端测试
│   └── smoke/                    #   冒烟测试
│
├── cli-manifest.json             # 预编译命令清单 ← 冷启动优化关键
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
└── vitest.config.ts              # 测试配置（多项目）
```

---

## 四、关键设计决策

### 决策 1：为什么用 Manifest 预编译？

**问题**：90+ 适配器 × 动态 import = 秒级启动

**方案**：构建时扫描 `clis/` 目录，提取元数据到 `cli-manifest.json`（一个 JSON 文件）

**效果**：启动时间从秒级降到毫秒级，读取一个 JSON vs 动态 import 892 个文件

### 决策 2：为什么用 globalThis 做注册表？

**问题**：ES Modules 中模块间共享状态需要 import，可能导致循环依赖

**方案**：使用 `globalThis.__opencli_registry__` 作为全局单例

**效果**：任何模块都能直接访问注册表，无需 import 依赖链

### 决策 3：为什么 Daemon 不常驻？

**问题**：常驻进程占用端口和内存

**方案**：按需启动 → 空闲计时 → 超时退出

**效果**：不使用时零资源占用，Chrome 扩展指数退避重连保证可用性

### 决策 4：为什么双引擎（Pipeline + TypeScript）？

**问题**：简单场景写 TypeScript 太重，复杂场景 YAML 不够用

**方案**：Pipeline（声明式）处理简单场景，TypeScript（编程式）处理复杂场景

**效果**：适配器编写门槛低（公开 API 几行 YAML），同时不限制上限

---

## 五、如何阅读源码

### 推荐阅读路径

**第 1 站（10 分钟）— 理解启动**：
1. `src/main.ts` — 入口和快速路径
2. `src/discovery.ts` — 命令发现
3. `src/registry.ts` — 命令注册

**第 2 站（15 分钟）— 理解执行**：
1. `src/execution.ts` — 命令执行引擎
2. `src/commanderAdapter.ts` — CLI 框架桥接
3. `clis/bilibili/video.js` — 一个真实的适配器示例

**第 3 站（20 分钟）— 理解浏览器**：
1. `src/types.ts` — IPage 接口定义
2. `src/browser/cdp.ts` — CDP 客户端
3. `src/browser/runtime.ts` — 会话管理
4. `extension/src/background.ts` — Chrome 扩展

**第 4 站（15 分钟）— 理解管道**：
1. `src/pipeline/executor.ts` — 步骤执行器
2. `src/pipeline/registry.ts` — 步骤注册表
3. `src/pipeline/template.ts` — 模板变量

**第 5 站（10 分钟）— 理解 AI 集成**：
1. `skills/opencli-adapter-author/` — 适配器编写 Skill
2. `src/analysis.ts` — 认证推断和字段检测
3. `src/constants.ts` — 语义映射常量

### 调试技巧

```bash
# 启用调试输出
OPENCLI_VERBOSE=1 opencli bilibili video BV1xx...

# 使用 CDP 直接连接（跳过 Daemon）
OPENCLI_CDP_ENDPOINT=http://localhost:9222 opencli bilibili video BV1xx...

# 保持浏览器窗口活跃（调试用）
opencli bilibili video BV1xx... --live

# 自动聚焦浏览器窗口
opencli bilibili video BV1xx... --focus
```

---

## 六、适配器编写速查

### TypeScript 适配器模板

```javascript
// clis/{site}/{command}.js
const { cli, Strategy } = require('../src/registry');

cli({
  site: 'example',
  name: 'search',
  strategy: Strategy.COOKIE,  // 认证策略
  description: '搜索内容',
  args: [
    { name: 'keyword', required: true, description: '搜索关键词' },
    { name: '--limit', type: 'number', default: 10, description: '结果数量' },
  ],
  func: async (page, kwargs) => {
    // page: IPage 接口（浏览器操作）
    // kwargs: 解析后的参数对象

    await page.goto(`https://example.com/search?q=${kwargs.keyword}`);

    // 拦截网络请求（INTERCEPT 策略）
    await page.installInterceptor('**/api/search');
    await page.click('.search-button');
    const requests = await page.getInterceptedRequests();

    // 返回结构化数据
    return requests.map(r => r.response.body.items);
  }
});
```

### 关键接口

| 接口 | 方法 | 说明 |
|------|------|------|
| IPage | `goto(url)` | 导航 |
| IPage | `click(selector)` | 点击 |
| IPage | `typeText(selector, text)` | 输入 |
| IPage | `snapshot()` | DOM 快照 |
| IPage | `evaluate(fn)` | 执行 JS |
| IPage | `installInterceptor(pattern)` | 拦截请求 |
| IPage | `getInterceptedRequests()` | 获取拦截数据 |

---

## 七、相关笔记

| 笔记 | 路径 | 内容 |
|------|------|------|
| 完整架构分析 | `explorer/01-opencli-architecture-and-core-design.md` | 产品认知、核心概念、代码原理的深入分析 |

---

*生成日期：2026-04-27 | 基于 v1.7.8（commit 54ffc88）*
