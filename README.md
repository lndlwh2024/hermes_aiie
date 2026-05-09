# Hermes Telegram Task Queue

为 AI IDE 提供结构化上下文和 Skill 服务；同时包含 Telegram/Hermes 本地任务队列能力。

独立本地服务，用于把 Telegram/Hermes 消息写入统一任务队列，并通过 Web 看板确认消息是否已收到。

## 当前状态

- Hermes Gateway 已配置为 Windows 常驻服务。
- Telegram 中文回复已通过 `SOUL.md` 和 channel prompt 修复。
- Gemini 慢响应的主要根因已定位并修复：自定义 `httpx` transport 绕过代理、Gemini OpenAI-compatible 认证方式错误、辅助模型自动探测开销和 `SOUL.md` BOM 阻断。
- 当前保留完整 system prompt；如继续优化速度，优先评估 MCP 注册开销和 prompt 裁剪。

详细排障记录、验证结果、更新日志和回滚方案见：

```text
H:\agent\hermes\doc\Hermes_Telegram_Cursor_MCP_Integration.md
```

## 边界

- 不属于 `news` 项目。
- 不合入 `news` 的 `master`。
- 不自动改代码、不部署、不执行数据库写入。
- 首版仅做收消息、看板展示、状态标记和本地队列文件。

## 启动

```powershell
cd H:\agent\hermes
npm install
npm start
```

或：

```powershell
powershell -ExecutionPolicy Bypass -File H:\agent\hermes\scripts\Start-HermesTaskQueue.ps1
```

默认看板：

```text
http://127.0.0.1:8787
```

## API

健康检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/health
```

写入任务：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/tasks `
  -Method Post `
  -ContentType 'application/json' `
  -Body '{"source":"telegram","chatId":"<telegram_chat_id>","user":"test","text":"测试消息"}'
```

查询任务：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/tasks
```

更新状态：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/tasks/<id>/status `
  -Method Post `
  -ContentType 'application/json' `
  -Body '{"status":"done"}'
```

## 数据文件

```text
H:\agent\hermes\data\tasks.jsonl
```

Cursor 可以直接读取该文件来确认 Telegram 消息已入队。

## Hermes 使用建议

优先使用已注册的 Hermes MCP 工具：

```text
请调用 queue_create_task，把这条消息写入本地任务队列。text=这里填写我要处理的内容，source=telegram。
```

也可以要求 Hermes 调用本地 HTTP 接口：

```text
请把这条消息写入本地任务队列：POST http://127.0.0.1:8787/api/tasks，JSON 字段包含 source=telegram、chatId、user、text。
```

已注册 MCP Server：

```text
task-queue
```

MCP 工具：

- `queue_create_task`
- `queue_list_tasks`
- `queue_update_task_status`

重新检测 MCP：

```powershell
hermes mcp test task-queue
```

## 停止

在运行服务的 PowerShell 窗口按 `Ctrl+C`。

## 回滚

- 停止服务。
- 从 Hermes 移除 MCP：`hermes mcp remove task-queue`
- 删除 `H:\agent\hermes` 目录或仅删除 `data\tasks.jsonl`。
- 若未来配置了 Windows 自启动任务，再删除对应任务。
