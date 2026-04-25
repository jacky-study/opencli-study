/**
 * 最小化 Chrome 扩展 — 连接 Daemon，接收命令并执行
 *
 * 就干两件事：
 * 1. 启动时连上 Daemon 的 WebSocket
 * 2. 收到命令 → 在浏览器里执行 → 把结果发回去
 */

const DAEMON_WS = "ws://127.0.0.1:19225/ext";
let ws;

function connect() {
  ws = new WebSocket(DAEMON_WS);

  ws.onopen = () => console.log("[ext] 已连上 Daemon");

  ws.onmessage = async (event) => {
    const cmd = JSON.parse(event.data);

    try {
      let data;

      if (cmd.action === "navigate") {
        // 打开一个新标签页
        const tab = await chrome.tabs.create({ url: cmd.url, active: false });
        // 等页面加载完
        await new Promise((r) => chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            r();
          }
        }));
        data = { url: cmd.url, tabId: tab.id };
      }

      if (cmd.action === "evaluate") {
        // 找到最后一个标签页
        const tabs = await chrome.tabs.query({});
        const tab = tabs[tabs.length - 1];

        // 用 CDP 执行 JS，绕过所有 CSP 限制（真正的 OpenCLI 也是这么做的）
        await chrome.debugger.attach({ tabId: tab.id }, "1.3");
        try {
          const res = await chrome.debugger.sendCommand(
            { tabId: tab.id },
            "Runtime.evaluate",
            {
              expression: `(async () => { ${cmd.code} })()`,
              awaitPromise: true,
              returnByValue: true,
            }
          );
          if (res.exceptionDetails) {
            throw new Error(res.exceptionDetails.exception?.description || "执行出错");
          }
          data = res.result?.value;
        } finally {
          await chrome.debugger.detach({ tabId: tab.id });
        }

        // 执行完关掉标签页
        await chrome.tabs.remove(tab.id);
      }

      // 结果发回 Daemon
      ws.send(JSON.stringify({ id: cmd.id, ok: true, data }));
    } catch (err) {
      ws.send(JSON.stringify({ id: cmd.id, ok: false, error: err.message }));
    }
  };

  ws.onclose = () => {
    console.log("[ext] 断开，3秒后重连...");
    setTimeout(connect, 3000);
  };
}

connect();
