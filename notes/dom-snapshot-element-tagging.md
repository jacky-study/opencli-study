---
tags: [opencli, dom-snapshot, browser-automation, element-tagging, cdp]
type: concept
article_id: OBA-wj394cgy
created_at: 2026-04-25
source: conversation
---

# OpenCLI DOM 快照与元素打标机制

> 从对话中整理 · opencli-study

## 核心内容

OpenCLI 采用**纯 DOM 方案**（非截图/视觉识别）来感知和操作页面元素。通过 CDP（Chrome DevTools Protocol）注入 JS 到页面中，遍历 DOM 树完成元素识别、标注和序列化。

整体流程分三步：**DOM 快照生成 → 可交互性检测 → 打标 + 序列化**。

### 与其他方案的对比

| 维度 | OpenCLI（DOM 方案） | Midscene/AI 视觉方案 |
|------|---------------------|---------------------|
| 感知方式 | 遍历 DOM 树 | 截图 + AI 视觉理解 |
| 元素定位 | `data-opencli-ref` 属性 | 坐标/视觉特征 |
| 精确度 | 高（直接操作 DOM） | 依赖 AI 识别准确度 |
| 信息量 | 属性、文本、语义完整 | 受限于视觉信息 |

**注意**：OpenCLI 没有集成 Midscene，搜索源码无任何 midscene 引用。

## 关键要点

### 1. DOM 快照生成（13 步 pipeline）

核心文件：`src/browser/dom-snapshot.ts` 的 `generateSnapshotJs()` 函数，生成一段 JS 代码在浏览器页面内执行（via CDP `Runtime.evaluate`）。

Pipeline 步骤：遍历 DOM 树 → 裁剪不可见元素 → SVG 折叠 → Shadow DOM 遍历 → 同源 iframe 提取 → 包围盒父子去重 → 绘制顺序遮挡检测 → 属性白名单过滤 → 表格 Markdown 序列化 → 交互索引标注 → data-ref 注解 → 隐藏元素提示 → 增量 diff 标记。

### 2. 可交互性检测（多层启发式）

核心函数：`isInteractive()`，检测维度包括：

- **HTML 标签**：`a, button, input, select, textarea, details` 等
- **ARIA role**：`button, link, menuitem, textbox, combobox, switch` 等
- **原生事件**：`onclick, onmousedown, ontouchstart`
- **框架事件检测**：React（`__reactProps$`）、Vue 3（`_vei`）、Vue 2（`__vue__.$listeners`）、Angular（`ng-reflect-click`）
- **CSS 样式**：`cursor: pointer`
- **搜索启发式**：class/id 包含 search、magnify、glass 等关键词

### 3. 打标与操作定位

每个可交互元素获得：
- 递增索引号（如 `[1]`, `[2]`, `[3]`）
- DOM 上设置 `data-opencli-ref="42"` 属性
- 指纹存储到 `window.__opencli_ref_identity`（含 tag、role、text、ariaLabel、id、testId）

操作定位（`target-resolver.ts`）：通过 `querySelector('[data-opencli-ref="N"]')` 查找，并用指纹验证防止 stale ref。指纹不匹配时返回 `stale_ref` 错误，提示重新获取快照。

### 4. 快照二次格式化

`snapshotFormatter.ts` 对原始快照文本做 4-pass 处理：解析过滤 → 去重 → 剪枝空容器 → 折叠单子容器。产出更紧凑的文本供 LLM 消费。
