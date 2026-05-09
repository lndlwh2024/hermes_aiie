import http from "node:http";
import { createTask, getTasksFilePath, listTasks, updateTaskStatus, type TaskStatus } from "./queue.js";
import { normalizeHermesPayload } from "./hermes-adapter.js";

const HOST = process.env.HERMES_QUEUE_HOST || "127.0.0.1";
const PORT = Number(process.env.HERMES_QUEUE_PORT || 8787);
const VALID_STATUSES = new Set<TaskStatus>(["queued", "processing", "done", "failed"]);

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function sendHtml(res: http.ServerResponse, html: string): void {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(html);
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

function renderDashboard(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hermes Telegram Queue</title>
  <style>
    :root { color-scheme: dark; font-family: "Segoe UI", Arial, sans-serif; }
    body { margin: 0; background: #0f172a; color: #e5e7eb; }
    header { padding: 20px 28px; border-bottom: 1px solid #1f2937; background: #111827; }
    main { padding: 20px 28px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .muted { color: #94a3b8; font-size: 13px; }
    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    button { border: 1px solid #334155; background: #1e293b; color: #e5e7eb; border-radius: 8px; padding: 8px 10px; cursor: pointer; }
    button:hover { background: #334155; }
    .grid { display: grid; gap: 14px; }
    .card { border: 1px solid #334155; border-radius: 12px; background: #111827; padding: 14px; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px; color: #94a3b8; font-size: 12px; margin-bottom: 10px; }
    .text { white-space: pre-wrap; line-height: 1.6; }
    .status { border-radius: 999px; padding: 2px 8px; font-weight: 600; }
    .queued { background: #1d4ed8; color: white; }
    .processing { background: #b45309; color: white; }
    .done { background: #15803d; color: white; }
    .failed { background: #b91c1c; color: white; }
    .empty { color: #94a3b8; border: 1px dashed #334155; padding: 24px; border-radius: 12px; }
    code { color: #93c5fd; }
  </style>
</head>
<body>
  <header>
    <h1>Hermes Telegram Queue</h1>
    <div class="muted">本地队列看板：Telegram 消息是否已收到、当前状态、处理记录。只监听 <code>127.0.0.1:${PORT}</code>。</div>
  </header>
  <main>
    <div class="toolbar">
      <button onclick="loadTasks()">刷新</button>
      <span class="muted" id="summary">加载中...</span>
    </div>
    <section id="tasks" class="grid"></section>
  </main>
  <script>
    async function setStatus(id, status) {
      await fetch('/api/tasks/' + id + '/status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status })
      });
      await loadTasks();
    }

    async function copyText(text) {
      await navigator.clipboard.writeText(text);
    }

    async function loadTasks() {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      const root = document.getElementById('tasks');
      const summary = document.getElementById('summary');
      summary.textContent = data.tasks.length + ' 条任务，数据文件：' + data.file;
      if (!data.tasks.length) {
        root.innerHTML = '<div class="empty">暂无任务。向 <code>POST /api/tasks</code> 写入消息后会显示在这里。</div>';
        return;
      }
      root.innerHTML = data.tasks.map(task => {
        const safeText = escapeHtml(task.text);
        return '<article class="card">' +
          '<div class="meta">' +
            '<span class="status ' + task.status + '">' + task.status + '</span>' +
            '<span>ID: ' + task.id + '</span>' +
            '<span>来源: ' + escapeHtml(task.source || '-') + '</span>' +
            '<span>用户: ' + escapeHtml(task.user || '-') + '</span>' +
            '<span>会话: ' + escapeHtml(task.chatId || '-') + '</span>' +
            '<span>更新时间: ' + escapeHtml(task.updatedAt) + '</span>' +
          '</div>' +
          '<div class="text">' + safeText + '</div>' +
          '<div class="toolbar" style="margin:12px 0 0">' +
            '<button onclick=' + JSON.stringify('copyText(' + JSON.stringify(task.text) + ')') + '>复制正文</button>' +
            '<button onclick="setStatus(\\'' + task.id + '\\', \\'processing\\')">处理中</button>' +
            '<button onclick="setStatus(\\'' + task.id + '\\', \\'done\\')">完成</button>' +
            '<button onclick="setStatus(\\'' + task.id + '\\', \\'failed\\')">失败</button>' +
          '</div>' +
        '</article>';
      }).join('');
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      }[char]));
    }

    loadTasks();
    setInterval(loadTasks, 5000);
  </script>
</body>
</html>`;
}

async function route(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (req.method === "GET" && url.pathname === "/") {
    sendHtml(res, renderDashboard());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "hermes-task-queue", file: getTasksFilePath() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/tasks") {
    sendJson(res, 200, { tasks: await listTasks(), file: getTasksFilePath() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/tasks") {
    const task = await createTask(normalizeHermesPayload(await readBody(req)));
    sendJson(res, 201, { task });
    return;
  }

  const statusMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/status$/);
  if (req.method === "POST" && statusMatch) {
    const body = (await readBody(req)) as { status?: TaskStatus; note?: string };
    if (!body.status || !VALID_STATUSES.has(body.status)) {
      sendJson(res, 400, { error: "Invalid status." });
      return;
    }
    const task = await updateTaskStatus(statusMatch[1], body.status, body.note);
    sendJson(res, 200, { task });
    return;
  }

  sendJson(res, 404, { error: "Not found." });
}

const server = http.createServer((req, res) => {
  route(req, res).catch((error) => {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Hermes task queue listening at http://${HOST}:${PORT}`);
  console.log(`Task file: ${getTasksFilePath()}`);
});
