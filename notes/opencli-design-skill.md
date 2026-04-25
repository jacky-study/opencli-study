---
article_id: OBA-7l53aosl
tags: [skill-template, cli-framework, adapter-pattern, pipeline, browser-automation]
created: 2026-04-20
source: jackwener/opencli
---

# Skill 模板：构建可扩展 CLI 工具框架

> 提炼自 OpenCLI 项目的核心设计模式，适用于构建任何需要插件化、多数据源、浏览器自动化的 CLI 工具

## 适用场景

当你需要构建以下类型的工具时，此模板适用：
- 需要支持多个网站/平台/API 的 CLI 工具
- 需要插件化扩展的命令行应用
- 需要浏览器自动化能力的工具
- 需要让 AI Agent 发现和使用的 CLI

## 核心架构模式

### 模式 1：注册表 + 发现机制

**问题**：如何让命令可以动态注册，支持内置 + 用户自定义 + 插件三种来源？

**OpenCLI 方案**：全局单例 Registry + 两级发现

```typescript
// registry.ts — 全局注册表
const _registry: Map<string, CliCommand> =
  globalThis.__opencli_registry__ ??= new Map<string, CliCommand>();

export function registerCommand(cmd: CliCommand) {
  const key = `${cmd.site}/${cmd.name}`;
  _registry.set(key, normalizeCommand(cmd));
}

// discovery.ts — 两级发现
export async function discoverClis() {
  // 1. 快速路径：预编译清单（延迟加载）
  if (existsSync('cli-manifest.json')) {
    return loadFromManifest();
  }
  // 2. 回退路径：文件系统扫描
  await scanDirectory('clis/');
  // 3. 插件路径
  await scanDirectory('~/.mycli/plugins/');
}
```

**覆盖优先级**：插件 > 用户 > 内置（后者覆盖前者）

**适用条件**：
- 命令数量 > 20
- 需要用户/第三方扩展
- 启动速度有要求（延迟加载）

---

### 模式 2：策略模式（5 级认证级联）

**问题**：不同目标平台需要不同的认证和访问方式，如何统一处理？

**OpenCLI 方案**：Strategy 枚举 + 自动策略选择

```typescript
enum Strategy {
  PUBLIC = 'public',      // 无需认证，直接 HTTP
  LOCAL = 'local',        // 本地二进制
  COOKIE = 'cookie',      // 复用浏览器 Cookie
  HEADER = 'header',      // 自定义请求头
  INTERCEPT = 'intercept', // 拦截浏览器请求
  UI = 'ui',              // DOM 自动化
}

// 命令定义时声明策略
cli({
  site: 'twitter',
  strategy: Strategy.UI,  // 自动走浏览器自动化
  // ...
});
```

**设计要点**：
- 每个命令声明自己的策略
- 框架根据策略自动决定是否启动浏览器
- 从快到慢排序（PUBLIC ~1s → UI ~15s+）
- AI Agent 无需理解认证细节

**适用条件**：
- 目标平台多样
- 认证方式不同
- 需要自动选择最优路径

---

### 模式 3：声明式 Pipeline 引擎

**问题**：大量简单的数据获取命令不需要写代码，如何用声明式方式定义？

**OpenCLI 方案**：YAML Pipeline + 步骤注册表 + 模板表达式

```yaml
# 声明式定义一个数据获取命令
pipeline:
  - fetch: "https://api.example.com/data"
  - map:
      expr: "${{ item }}"
      limit: "${{ args.limit }}"
  - select: ["title", "score", "url"]
```

```typescript
// 步骤注册表（可扩展）
const stepRegistry = new Map<string, StepHandler>();

stepRegistry.set('fetch', async (ctx, config) => { /* ... */ });
stepRegistry.set('map', async (ctx, config) => { /* ... */ });
stepRegistry.set('select', async (ctx, config) => { /* ... */ });

// 执行器
async function execute(pipeline: Step[], context: Context) {
  let data = null;
  for (const step of pipeline) {
    const handler = stepRegistry.get(step.type);
    data = await handler(context, step.config, data);
  }
  return data;
}
```

**模板引擎**：支持 `${{ expression }}` 语法
- 快速路径：字面量、简单路径
- 管道过滤器：`| upper`、`| default(0)`、`| truncate(50)`
- 复杂表达式：`node:vm` 沙箱执行

**适用条件**：
- 大量相似的数据获取/转换命令
- 非程序员需要定义命令
- 需要与编程式方案共存

---

### 模式 4：双通道浏览器抽象

**问题**：需要同时支持网站（Chrome 扩展）和 Electron 应用（CDP 直连），如何统一？

**OpenCLI 方案**：IPage 接口 + BasePage 基类 + 双工厂

```typescript
// 统一接口
interface IPage {
  goto(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  evaluate(fn: Function): Promise<any>;
  getCookies(): Promise<Cookie[]>;
}

// 基类抽象共享逻辑
abstract class BasePage implements IPage {
  async click(selector: string) {
    // 共享的 click 实现（200行）
  }
  abstract goto(url: string): Promise<void>;  // 子类实现
  abstract evaluate(fn: Function): Promise<any>;
}

// 工厂方法自动选择
function getBrowserFactory(target: string): IBrowserFactory {
  if (isElectronApp(target)) return new CDPBridge();
  return new BrowserBridge();
}
```

**适用条件**：
- 需要多种浏览器连接方式
- 上层代码不应关心底层传输
- 需要扩展新的连接方式

---

### 模式 5：SKILL.md — AI 可发现的工具描述

**问题**：如何让 AI Agent 自动发现和理解工具的使用方式？

**OpenCLI 方案**：SKILL.md 文件 + 结构化元数据 + 机器可读输出

```markdown
# SKILL.md 示例
---
name: my-tool-explorer
description: Use when creating a new adapter from scratch
tags: [cli, adapter, automation]
allowed-tools: Bash(my-tool:*), Read, Edit, Write
---

## 使用指南
1. 发现 API：`my-tool explore <url>`
2. 生成适配器：`my-tool generate <url>`
3. 验证结果：`my-tool <site> <command> --format json`
```

**关键设计**：
- `description` 告诉 AI "何时触发"
- `allowed-tools` 控制权限范围
- 所有命令输出支持 `--format json`（机器可读）
- `my-tool list -f yaml` 获取完整工具清单
- 标准 exit code（77=需认证, 75=可重试, 66=无数据）

**适用条件**：
- 构建 AI Agent 可用的工具
- 需要工具自描述
- 需要权限控制

---

### 模式 6：ref + 指纹 DOM 定位

**问题**：网页 DOM 频繁变化，如何可靠地定位和操作元素？

**OpenCLI 方案**：编号标注 + 身份指纹 + 三级回退

```typescript
// 1. 快照时标注编号
<div data-opencli-ref="3">Click Me</div>

// 2. 记录身份指纹
fingerprint = { tag: 'div', text: 'Click Me', role: 'button' }

// 3. 操作时验证指纹
async click(ref: number) {
  const el = findByRef(ref);
  if (!matchFingerprint(el, fingerprint)) throw new Error('页面已变化');
  el.click();
}

// 4. 三级点击回退
// Level 1: JS el.click()
// Level 2: CDP 精确坐标 + Input.dispatchMouseEvent
// Level 3: CDP DOM.getBoxModel 坐标计算
```

**适用条件**：
- 需要可靠的 DOM 自动化
- 目标页面可能变化
- 需要回退机制

---

## 架构决策清单

构建新 CLI 工具框架时，参考以下决策：

| 决策点 | OpenCLI 选择 | 替代方案 | 选择依据 |
|--------|-------------|---------|---------|
| 命令定义方式 | JS 函数 + YAML Pipeline | 纯装饰器 / 纯配置 | 灵活性 + 简单场景 |
| 浏览器控制 | Chrome 扩展 + CDP | Puppeteer / Playwright | 复用登录态 |
| 注册机制 | 全局 Map 单例 | 依赖注入 | 跨模块共享 |
| AI 集成 | SKILL.md + JSON 输出 | 内嵌 LLM | 零 Token 消耗 |
| 模板引擎 | node:vm 沙箱 | AST 解析器 | 安全 + 简单 |
| 错误处理 | Unix sysexits 规范 | 自定义错误码 | 机器可读 |
| 插件系统 | npm 包 + link | 自定义格式 | 生态复用 |

## 技术栈推荐

基于 OpenCLI 的验证，构建类似工具推荐：

| 类别 | 推荐 | 理由 |
|------|------|------|
| CLI 框架 | Commander.js | 成熟、灵活、TypeScript 友好 |
| 浏览器控制 | Chrome 扩展 + CDP | 复用登录态，无需额外依赖 |
| HTTP 客户端 | undici | 比 Node fetch 性能更好 |
| YAML 解析 | js-yaml | Pipeline 定义格式 |
| 终端渲染 | cli-table3 | 表格输出 |
| 模板引擎 | node:vm | 安全沙箱表达式求值 |
| 测试 | Vitest | ESM 原生支持 |
| 构建 | tsc | 保留模块结构，支持多入口 |

---

*提炼自 OpenCLI (jackwener/opencli) 项目研究*
