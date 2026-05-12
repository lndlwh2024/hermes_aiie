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

## AI IDE 对接规范

平台级 AI IDE 角色定义与主 agent 调度流程保存在：

```text
H:\agent\hermes\aiide\
```

核心文件：

```text
aiide\orchestration\main-agent-pm-workflow.md
aiide\orchestration\delivery-gates.md
aiide\orchestration\document-update-policy.md
aiide\agents\pd.md
aiide\agents\ui.md
aiide\agents\as.md
aiide\agents\dev.md
aiide\agents\qa.md
aiide\agents\ad.md
aiide\agents\pm.md
```

默认规则：

- 主 agent 承担 PM 调度中枢职能。
- 用户无需 `@pm`。
- 标准新需求流程为 `pd -> ui(如涉及UI) -> as -> dev -> qa -> 确认开发 -> 开发 -> qa测试报告`。
- `pm` 角色文件仅作为参考模板或独立流程审计使用，不默认独立调用。
- `ad` 仅在投研、宏观、行业、报告质量审计等场景按需调用。

这些文件不是 Hermes runtime Skill，也不是 MCP 工具；它们是 Cursor、Trae 等 AI IDE 对接 Hermes AIIE 时可复制或引用的角色模板与流程规范。

## Cursor 直接对接 Hermes MCP

Cursor 新窗口如需直接读取 Hermes 项目上下文，应在 Cursor 全局 MCP 配置中注册 `hermes-context`。

配置文件：

```text
C:\Users\<user>\.cursor\mcp.json
```

示例：

```json
{
  "mcpServers": {
    "hermes-context": {
      "command": "cmd",
      "args": [
        "/c",
        "H:\\agent\\hermes\\mcp\\hermes-context\\scripts\\Run-HermesContextMcp.cmd"
      ],
      "trust": true,
      "allowTools": true,
      "harnessEngineeringEnabled": true
    }
  }
}
```

验证：

```powershell
$env:PYTHONIOENCODING='utf-8'
hermes mcp test hermes-context
```

预期可发现 `get_current_context`、`list_issues`、`upsert_issue`、`close_issue` 等工具。已打开的 Cursor 窗口可能不会动态刷新 MCP 工具列表，建议新开窗口或执行 `Developer: Reload Window`。

新窗口启动建议：

```text
请先使用 Hermes MCP 读取 news 项目的 current-context，并列出 open/investigating issues。
```

## Issues MCP

`hermes-context` 提供进行中问题台账能力：

- `upsert_issue`：创建或更新问题，字段包含版本号、时间、影响、状态、优先级、风险、当前结论、方案和验证项。
- `get_issue`：读取单个问题。
- `list_issues`：按状态或优先级列出问题。
- `close_issue`：写入最终修复和验证结果，并关闭问题。

默认写入：

```text
<project-root>\hermes\issues\<issue-id>.md
<project-root>\hermes\issues\index.json
```

`upsert_issue` 和 `close_issue` 成功后会由 MCP 直接发送 Telegram 动作通知；通知是即时反馈，权威记录仍以 `hermes\issues\` 文件为准。

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
