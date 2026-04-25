/**
 * 最小化 CLI — 发命令给 Daemon，拿到结果后打印表格
 *
 * 用法：node cli.js bilibili hot --limit 5
 */

const PORT = 19225;
const DAEMON = `http://127.0.0.1:${PORT}`;

// ── 命令定义（对应 OpenCLI 的 clis/bilibili/hot.js）──────────
const COMMANDS = {
  "bilibili/hot": {
    description: "B站热门视频",
    columns: ["rank", "title", "author", "play"],
    // 这就是 OpenCLI pipeline 里的 navigate + evaluate 两步
    steps: [
      // 第1步：打开 bilibili.com（获取 cookie 上下文）
      { action: "navigate", url: "https://www.bilibili.com" },
      // 第2步：在浏览器里执行 fetch（这是关键——借浏览器之手调 API）
      {
        action: "evaluate",
        code: `
          const res = await fetch(
            "https://api.bilibili.com/x/web-interface/popular?ps=\${limit}&pn=1",
            { credentials: "include" }
          );
          const data = await res.json();
          return (data?.data?.list || []).map((item, i) => ({
            rank: i + 1,
            title: item.title,
            author: item.owner?.name,
            play: item.stat?.view,
          }));
        `,
      },
    ],
  },
};

// ── 主流程 ──────────────────────────────────────────────────
async function main() {
  const site = process.argv[2] || "bilibili";
  const name = process.argv[3] || "hot";
  const limit = parseInt(process.argv[5]) || 5;
  const key = `${site}/${name}`;
  const cmd = COMMANDS[key];

  if (!cmd) {
    console.log(`未知命令: ${key}`);
    console.log(`可用: ${Object.keys(COMMANDS).join(", ")}`);
    return;
  }

  console.log(`  ${key}\n`);

  // 依次执行每一步
  let result;
  for (const step of cmd.steps) {
    const res = await fetch(`${DAEMON}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: `${Date.now()}_${Math.random()}`,
        action: step.action,
        url: step.url,
        code: step.code?.replace("${limit}", limit),
      }),
    });
    const json = await res.json();
    if (!json.ok && step.action === "evaluate") {
      console.error("执行失败:", json.error);
      return;
    }
    if (json.data) result = json.data;
  }

  // 打印表格
  if (!result || !result.length) {
    console.log("无数据");
    return;
  }

  printTable(cmd.columns, result);
  console.log(`\n${result.length} items · ${key}`);
}

function printTable(columns, rows) {
  // 计算每列最大宽度
  const widths = columns.map((col) =>
    Math.max(col.length, ...rows.map((r) => String(r[col]).length))
  );

  // 表头
  const header = columns.map((c, i) => c.padEnd(widths[i])).join("  ");
  const sep = widths.map((w) => "─".repeat(w)).join("──");

  console.log(`  ${sep}`);
  console.log(`  ${header}`);
  console.log(`  ${sep}`);
  rows.forEach((row) => {
    const line = columns.map((c, i) => String(row[c]).padEnd(widths[i])).join("  ");
    console.log(`  ${line}`);
  });
  console.log(`  ${sep}`);
}

main().catch(console.error);
