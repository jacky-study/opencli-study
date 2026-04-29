---
article_id: OBA-tl9k2mn4
created_at: 2026-04-29
tags: [browser, tab-lease, workspace, cdp, resource-management]
---

# Tab Leases 与 Workspace 绑定机制

> 关联教程：[explorer/02-opencli-guide.md](../explorer/02-opencli-guide.md)

## 问题

OpenCLI 新增了 Tab Leases 和 Workspace 绑定功能。这个浏览器标签页生命周期管理机制是如何设计的？

## 一、概念定义

### Tab Lease（标签页租赁）

Tab Lease 表示一个 workspace 对一个 browser tab 的**租约关系**。叫"lease"而非"session"的设计意图：

| 概念 | 含义 |
|------|------|
| **临时性** | lease 暗示有限期占用，非永久所有权 |
| **可回收** | 系统可在特定条件下（空闲超时）回收租赁 |
| **资源管理** | 就像资源租赁，管理浏览器标签页的分配和释放 |

### Workspace（工作空间）

Workspace 是**逻辑隔离单元**，每个 workspace 拥有或借用一个 Tab Lease。

**Workspace 类型**：

| 前缀 | 类型 | 说明 | 空闲超时 |
|------|------|------|----------|
| `default` | 自动化 | 默认 workspace | 30 秒 |
| `browser:*` | 自动化 | 浏览器操作 workspace | 10 分钟 |
| `operate:*` | 自动化 | 操作 workspace | 10 分钟 |
| `bound:*` | 绑定 | 借用用户的 tab | 无超时 |

## 二、核心数据结构

**TargetLease**（`extension/src/background.ts`）：

```typescript
type TargetLease = {
  windowId: number;              // Chrome 窗口 ID
  idleTimer: ReturnType<typeof setTimeout> | null;
  idleDeadlineAt: number;        // 空闲截止时间戳
  owned: boolean;                // true=拥有tab, false=借用tab
  preferredTabId: number | null;
  contextId: BrowserContextId;
  ownership: 'owned' | 'borrowed';
  lifecycle: 'ephemeral' | 'persistent' | 'pinned';
  surface: 'dedicated-container' | 'borrowed-user-tab';
};
```

**两种所有权**：
- **owned（拥有）**：Workspace 完全控制 tab，可自由导航、创建、关闭
- **borrowed（借用）**：使用用户已打开的 tab，受限操作

## 三、完整生命周期

### 1. 创建阶段

**Owned Lease**（自动化 workspace）：
```
ensureOwnedContainerWindow()
  → 共享自动化容器窗口（所有 owned workspace 共用一个窗口）
  → 复用已有 tab 或创建新 tab
  → setWorkspaceSession() 绑定
  → resetWindowIdleTimer() 启动超时
```

**Borrowed Lease**（bound workspace）：
```
handleBind()
  → 验证 workspace 以 "bound:" 开头
  → chrome.tabs.query() 查找用户当前活跃 tab
  → 绑定到用户 tab（owned: false）
  → 无空闲超时（pinned 生命周期）
```

### 2. 使用阶段

每次命令执行时，重置空闲计时器：

```typescript
function resetWindowIdleTimer(workspace: string): void {
  const timeout = getIdleTimeout(workspace);  // bound:* 返回 -1
  if (timeout <= 0) {
    session.idleTimer = null;  // bound:* 不设置定时器
    return;
  }
  session.idleDeadlineAt = Date.now() + timeout;
  session.idleTimer = setTimeout(async () => {
    await releaseWorkspaceLease(workspace, 'idle timeout');
  }, timeout);
}
```

### 3. 释放阶段

```typescript
async function releaseWorkspaceLease(workspace, reason) {
  if (session.owned) {
    // owned: 关闭 tab
    await chrome.tabs.remove(tabId);
  } else {
    // borrowed: 仅分离 CDP，不关闭用户 tab
    await safeDetach(session.preferredTabId);
  }
  automationSessions.delete(workspace);
  // 如果没有其他 owned lease，关闭共享容器窗口
  if (!stillHasOwnedLeases) {
    await chrome.windows.remove(ownedContainerWindowId);
  }
}
```

### 4. 资源回收

| 触发方式 | 实现机制 |
|---------|---------|
| 空闲超时 | `chrome.alarms` API（MV3 兼容，service worker 重启也能恢复） |
| Tab 关闭 | `chrome.tabs.onRemoved` 监听 |
| 窗口关闭 | `chrome.windows.onRemoved` 监听 |

## 四、与 Browser Bridge 的整合

### 命令路由架构

```
CLI 层 (src/cli.ts)
  → bindTab() 调用
Daemon Client 层 (src/browser/daemon-client.ts)
  → sendCommand('bind', { workspace })
Daemon 层 (src/daemon.ts)
  → WebSocket 传输
Extension 层 (extension/src/background.ts)
  → handleBind()
Chrome APIs (chrome.tabs, chrome.debugger)
  → CDP 协议
Target Page
```

### 安全限制

- Bound workspace **默认阻止导航**
- Bound workspace **禁止 tab 变异操作**（close、create）
- 需要显式 `--allow-navigate-bound` 才能导航

### 状态持久化

通过 `chrome.storage.local` 持久化 lease 状态：
```typescript
async function persistRuntimeState() {
  const leases = {};
  for (const [workspace, session] of automationSessions) {
    leases[workspace] = {
      windowId, owned, preferredTabId, idleDeadlineAt, ...
    };
  }
  await writeRegistry({ version: 1, ownedContainerWindowId, leases });
}
```

Service worker 重启后通过 `reconcileTargetLeaseRegistry()` 恢复：
- 验证窗口和 tab 是否还存在
- 重新设置空闲定时器（计算剩余时间）
- 已过期的 lease 立即释放

## 五、关键代码片段

### 1. 空闲超时计算

`extension/src/background.ts`：
```typescript
function getIdleTimeout(workspace: string): number {
  if (workspace.startsWith('bound:')) return -1;  // 无超时
  if (workspace.startsWith('browser:') || workspace.startsWith('operate:'))
    return 600000;  // 10 分钟
  return 30000;     // 30 秒（默认）
}
```

### 2. 共享自动化容器

`extension/src/background.ts`：
```typescript
async function ensureOwnedContainerWindow(initialUrl?) {
  // 复用已有容器窗口
  if (ownedContainerWindowId !== null) {
    try {
      await chrome.windows.get(ownedContainerWindowId);
      return { windowId: ownedContainerWindowId, initialTabId: findReusableTab() };
    } catch { ownedContainerWindowId = null; }
  }
  // 创建新容器
  const win = await chrome.windows.create({ width: 1280, height: 900 });
  ownedContainerWindowId = win.id;
  await persistRuntimeState();
  return { windowId: ownedContainerWindowId };
}
```

## 六、设计亮点

### 1. 资源池化

所有 owned workspace **共享一个自动化容器窗口**：
- 避免为每个 workspace 创建独立窗口
- 容器在没有 owned lease 时自动关闭
- Tab 复用：导航时先检查是否已有可复用的 tab

### 2. MV3 兼容

Chrome Manifest V3 的 service worker 会随时被杀死：
- 使用 `chrome.alarms` API（而非 setTimeout）实现持久超时
- 状态持久化到 `chrome.storage.local`
- 启动时 reconciliation 恢复状态

### 3. 安全隔离

- `bound:*` workspace 严格限制操作，防止破坏用户页面状态
- 导航和 tab 变异需要显式授权
- URL 验证只允许 http(s) 协议

### 4. 渐进式增强

- 复用已有 tab 而非总是创建新的
- 导航时先检查是否已在目标 URL（快速路径）
- Tab 漂移自动检测和恢复

## 关键发现

1. **"Lease" 的设计隐喻很精准**：临时占有 + 超时回收 + 自动续约，完美描述了浏览器标签页的生命周期管理
2. **资源池化是核心优化**：所有 owned workspace 共用一个容器窗口，避免了 N 个 workspace = N 个窗口的资源浪费
3. **Bound workspace 的"借用"模式**：不关闭用户 tab，只分离 CDP 连接，这种"轻触"设计尊重用户状态
4. **MV3 持久化方案**：`chrome.alarms` + `chrome.storage.local` + reconciliation 是 Chrome 扩展开发的标准模式
