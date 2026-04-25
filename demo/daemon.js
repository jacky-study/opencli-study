/**
 * 最小化 Daemon — HTTP + WebSocket 中转
 *
 * 职责就一个：CLI 发来的命令，通过 WebSocket 转发给 Chrome 扩展执行
 *
 * 启动：node daemon.js
 */

import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = 19225;
const TIMEOUT_MS = 15000; // 15秒超时

// 扩展的 WebSocket 连接（同一时间只有一个）
let extWs = null;
// 等待结果的 CLI 请求
const pending = new Map();

// ── HTTP 服务：接收 CLI 的命令 ──────────────────────────────
const httpServer = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/status") {
    res.end(JSON.stringify({ ok: true, extensionConnected: !!extWs }));
    return;
  }

  if (req.method === "POST" && req.url === "/command") {
    const body = JSON.parse(await readBody(req));
    console.log(`📩 收到命令: ${body.action}`);

    if (!extWs) {
      console.log("   ✗ 扩展没连上，拒绝");
      res.end(JSON.stringify({ ok: false, error: "扩展没连上" }));
      return;
    }

    // 转发给 Chrome 扩展，等结果回来再响应 CLI
    const result = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(body.id);
        console.log(`   ⏱ 命令超时: ${body.action}`);
        resolve({ id: body.id, ok: false, error: `命令超时 (${TIMEOUT_MS / 1000}s)` });
      }, TIMEOUT_MS);

      pending.set(body.id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      extWs.send(JSON.stringify(body));
      console.log(`   → 已转发给扩展`);
    });

    console.log(`   ✓ 结果: ${result.ok ? "成功" : result.error}`);
    res.end(JSON.stringify(result));
    return;
  }

  res.end("opencli mini daemon");
});

// ── WebSocket 服务：等 Chrome 扩展连接 ──────────────────────
const wss = new WebSocketServer({ server: httpServer, path: "/ext" });

wss.on("connection", (ws) => {
  console.log("✅ Chrome 扩展已连接");
  extWs = ws;

  // 收到扩展的结果，转给对应的 CLI 请求
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  });

  ws.on("close", () => {
    console.log("❌ Chrome 扩展断开");
    extWs = null;
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Daemon 启动 http://127.0.0.1:${PORT}`);
  console.log("   等 Chrome 扩展连接...");
});

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
  });
}
