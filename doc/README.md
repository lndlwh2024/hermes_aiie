# Hermes AIIE 快速部署与使用指南

**适用对象**：希望把 Hermes 作为独立上下文服务，配合 Cursor/AI IDE 使用的新用户。  
**目标**：完成下载、安装、配置、启动、验证，并理解当前能力边界。

---

## 1. 项目定位

Hermes AIIE 是一个本地上下文与 Skill 服务层，用于帮助 Cursor/AI IDE：

- 记录项目经验。
- 检索历史复盘。
- 按需加载 Skill。
- 写回问题总结。
- 减少重复排障和上下文遗漏。

Hermes 不直接替代 Cursor。推荐分工：

- Cursor：代码阅读、修改、测试、提交。
- Hermes：上下文沉淀、经验检索、任务队列、Skill/MCP 服务。

---

## 2. 前置依赖：安装原始 Hermes Agent

`hermes_aiie` 不是原始 Hermes 安装包，而是基于原始 Hermes Agent 的扩展服务仓库。它依赖原始 Hermes 提供以下能力：

- Hermes Agent 主程序。
- Telegram/Gateway 消息入口。
- Skills runtime。
- MCP runtime。
- Hermes 配置、日志、会话和本机运行目录。

因此，新机器部署时应先安装并初始化原始 Hermes Agent，再 clone `hermes_aiie`。

### 2.1 安装前准备

建议环境：

- Windows 10/11。
- PowerShell。
- Git。
- Node.js 20+。
- Python 3.11+ 或原始 Hermes 安装包自带的 Python runtime。
- 可访问模型供应商 API 的网络环境。
- Telegram Bot Token，用于 Telegram Gateway。
- 至少一个可用模型供应商的 API key，例如 Gemini、OpenRouter 等。

检查基础命令：

```powershell
git --version
node --version
npm --version
python --version
```

如果某个命令不存在，应先安装对应工具，再继续。

### 2.2 安装原始 Hermes Agent

原始 Hermes Agent 的安装方式以其官方仓库或发布包为准。安装完成后，应确保 `hermes` 命令可在 PowerShell 中直接执行。

验证：

```powershell
hermes --help
```

预期：

- 能看到 Hermes CLI 帮助。
- 不提示 `hermes` 不是内部或外部命令。

如果命令不存在：

1. 确认原始 Hermes 是否已安装成功。
2. 确认 Hermes CLI 所在目录是否加入 `PATH`。
3. 关闭并重新打开 PowerShell 后再试。

### 2.3 原始 Hermes 默认路径

Windows 默认安装/运行目录通常为：

```text
C:\Users\<user>\AppData\Local\hermes
```

关键子目录：

```text
C:\Users\<user>\AppData\Local\hermes\skills   # Hermes runtime Skill 安装目录
C:\Users\<user>\AppData\Local\hermes\scripts  # 本机运行脚本
C:\Users\<user>\AppData\Local\hermes\logs     # Gateway/Agent 日志
C:\Users\<user>\AppData\Local\hermes\sessions # 会话数据
```

重要文件：

```text
C:\Users\<user>\AppData\Local\hermes\config.yaml # 主配置
C:\Users\<user>\AppData\Local\hermes\.env        # 密钥，不提交 Git
C:\Users\<user>\AppData\Local\hermes\SOUL.md     # Hermes 人设/规则
```

### 2.4 初始化模型配置

首次安装后运行：

```powershell
hermes setup
```

根据交互提示填写：

- 默认模型 provider。
- 模型名称。
- API key。
- base URL，如使用 OpenAI-compatible endpoint。

验证当前配置：

```powershell
hermes status
hermes model
```

预期：

- `hermes status` 能读取配置。
- `hermes model` 能显示当前默认模型。
- 简单对话能得到模型响应。

常见问题：

- Gemini/OpenRouter 等模型配置后响应慢，先确认代理、base URL 和模型名是否正确。
- 如果提示 URL 无效，应使用模型供应商要求的完整 base URL。
- `.env` 中的 key 不应写入 `H:\agent\hermes` 或项目仓库。

### 2.5 配置 Telegram Gateway

准备：

1. 在 Telegram 通过 BotFather 创建 bot。
2. 保存 bot token 到 Hermes `.env` 或 Hermes 配置。
3. 配置允许访问的用户 ID，避免陌生人调用 Hermes。

启动 Gateway：

```powershell
hermes gateway
```

或使用：

```powershell
hermes gateway run
```

验证：

- Telegram 给 bot 发消息，Hermes 能回复。
- `agent.log` 出现 `Connected to Telegram (polling mode)`。
- 如果没有响应，先检查代理、bot token、用户 allowlist。

### 2.6 验证 Skills 与 MCP 基础能力

查看 Hermes MCP：

```powershell
hermes mcp list
```

查看 Skills：

```powershell
hermes skills list
```

验证标准：

- `hermes --help` 能显示 CLI 帮助。
- `hermes status` 能读取当前配置。
- `hermes mcp list` 能正常执行。
- Telegram/Gateway 能启动，或后续可由 `HermesGateway` 计划任务常驻。
- `skills` 功能可列出已安装 Skill。

### 2.7 常见安装问题

`hermes` 命令不存在：

- 检查安装是否完成。
- 检查 `PATH`。
- 重新打开 PowerShell。

Telegram 没有响应：

- 检查 `agent.log`。
- 检查 `TELEGRAM_BOT_TOKEN`。
- 检查用户 ID allowlist。
- 检查代理是否可访问 Telegram。

Hermes 回复很慢：

- 检查模型供应商延迟。
- 检查代理。
- 检查是否启用了过多工具或过长 system prompt。

MCP 工具不可见：

- 运行 `hermes mcp list`。
- 运行 `hermes mcp test <server-name>`。
- 重启 Gateway，让 Hermes 重新 discovery 工具。

### 2.8 与 `hermes_aiie` 的边界

原始 Hermes 负责运行时：

- Agent/Gateway。
- Telegram 平台连接。
- runtime Skill 加载。
- MCP server 管理。
- 日志和会话。

`hermes_aiie` 负责扩展层：

- 项目上下文 MCP：`hermes-context`。
- 任务队列 MCP：`task-queue`。
- Gateway 守护脚本模板。
- 平台级自定义 Skill 源码。
- custom skills 同步脚本。
- 文档、测试与回滚说明。

部署顺序：

```text
先安装原始 Hermes Agent
  -> 初始化模型、Telegram、MCP 基础能力
  -> clone hermes_aiie 到 H:\agent\hermes
  -> 安装 hermes_aiie 依赖
  -> 注册 hermes_aiie 提供的 MCP 与脚本
```

---

## 3. 下载 `hermes_aiie`

```powershell
cd H:\agent
git clone https://github.com/lndlwh2024/hermes_aiie.git hermes
cd H:\agent\hermes
```

如果使用 SSH，请确保 GitHub SSH key 已配置。

---

## 4. 安装依赖

```powershell
npm install
```

验证：

```powershell
npm run typecheck
```

预期：无 TypeScript 错误。

---

## 5. 目录说明

```text
H:\agent\hermes\
  doc\                 # 平台文档
  memory\              # 全局短记忆
  skills\              # 平台级通用自定义 Skill 源码
  mcp\hermes-context\  # 上下文 MCP 服务
  src\                 # task-queue 服务
  scripts\             # 启动脚本
```

项目级上下文不建议保存在 `H:\agent\hermes`。每个项目应在自己的根目录建立：

```text
<project-root>\hermes\
  README.md
  profile\
  incidents\
  lessons\
  skills\
```

示例：

```text
H:\AIcode\Trae\news\hermes\
```

---

## 6. 配置项目

第一版通过 `hermes-context` MCP 的项目配置接入项目。

示例项目：

```text
project = news
projectRoot = H:\AIcode\Trae\news
contextRoot = H:\AIcode\Trae\news\hermes
```

新增项目时，需要：

1. 在目标项目根目录创建 `hermes/` 目录。
2. 补 `profile/project-profile.md`。
3. 在 `hermes-context` 项目配置中加入项目 key 与路径。
4. 运行 typecheck 和 MCP test。

---

## 7. 启动任务队列 Web

```powershell
cd H:\agent\hermes
npm start
```

默认地址：

```text
http://127.0.0.1:8787
```

健康检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/health
```

---

## 8. Hermes Gateway 常驻与健康守护

Windows 常驻任务：

```powershell
Start-ScheduledTask -TaskName HermesGateway
Stop-ScheduledTask -TaskName HermesGateway
```

健康守护任务：

```powershell
schtasks /Query /TN HermesGatewayHealth /FO LIST /V
```

守护脚本：

```text
C:\Users\lndlw\AppData\Local\hermes\scripts\Start-HermesGateway.ps1
C:\Users\lndlw\AppData\Local\hermes\scripts\Check-HermesGatewayHealth.ps1
C:\Users\lndlw\AppData\Local\hermes\scripts\Run-HermesGatewayHealthHidden.vbs
H:\agent\hermes\scripts\Start-HermesGateway.ps1
H:\agent\hermes\scripts\Check-HermesGatewayHealth.ps1
H:\agent\hermes\scripts\Run-HermesGatewayHealthHidden.vbs
```

`AppData\Local\hermes\scripts` 是 Windows 计划任务当前执行位置；`H:\agent\hermes\scripts` 是可版本化模板。

日志：

```text
C:\Users\lndlw\AppData\Local\hermes\logs\gateway-wrapper.log
C:\Users\lndlw\AppData\Local\hermes\logs\gateway-health.log
C:\Users\lndlw\AppData\Local\hermes\logs\agent.log
```

排障判断：

- 如果 Telegram 无响应，不能只看 `HermesGateway` 是否 Running，还要看是否存在真实 `hermes gateway run` 子进程。
- `gateway_state.json` 可能残留 `running`，应以真实进程和 `agent.log` 最新入站记录为准。
- `HermesGatewayHealth` 每分钟检查一次，发现真实 Gateway 子进程缺失会重启 `HermesGateway`。
- `HermesGatewayHealth` 使用 `wscript.exe` 调用 VBS 包装脚本，以避免交互桌面每分钟弹出 PowerShell/CMD 窗口。

---

## 9. 注册 MCP

任务队列 MCP：

```powershell
hermes mcp add task-queue --command H:\agent\hermes\scripts\Run-TaskQueueMcp.cmd
```

上下文 MCP：

```powershell
hermes mcp add hermes-context --command H:\agent\hermes\mcp\hermes-context\scripts\Run-HermesContextMcp.cmd
```

验证：

```powershell
hermes mcp list
hermes mcp test task-queue
hermes mcp test hermes-context
```

预期：

- `task-queue` enabled。
- `hermes-context` enabled。
- `hermes-context` 可发现上下文工具。

### 9.1 Cursor/AI IDE 直接对接 Hermes MCP

如果目标是让 Cursor 新窗口直接调用 Hermes 上下文能力，需要把 `hermes-context` 注册到 Cursor 的 MCP 配置。Windows 全局配置文件通常为：

```text
C:\Users\<user>\.cursor\mcp.json
```

示例配置：

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

如果同一文件中已有其他 MCP server，应只在 `mcpServers` 下追加 `hermes-context`，不要覆盖已有配置。

验证命令：

```powershell
$env:PYTHONIOENCODING='utf-8'
hermes mcp test hermes-context
```

预期：

- `Connected`。
- `Tools discovered: 16`。
- 可看到 `get_current_context`、`list_issues`、`upsert_issue`、`close_issue` 等工具。

Cursor 新窗口验证建议：

```text
请先使用 Hermes MCP 读取 news 项目的 current-context，并列出 open/investigating issues。
```

注意：

- 已打开的 Cursor 聊天窗口通常不会动态刷新 MCP 工具列表；新开窗口或执行 `Developer: Reload Window` 后再验证。
- `hermes-context` 是直接暴露给 Cursor 的项目上下文 MCP；`hermes-local` 是 Hermes Agent 自身的 MCP serve 入口，两者职责不同，可以同时存在。
- `hermes-context` 不提供 terminal/file/code_execution/database/deploy 权限，只能按工具边界读写受控目录。

---

## 10. 常用能力

### 10.1 功能总览

| 功能 | 能力说明 | 建议使用方式 |
| --- | --- | --- |
| Task Queue | 接收 Telegram/Hermes 消息，写入本地 JSONL 队列，并通过 Web 看板观察状态。 | 用于验证远程入口是否收到消息；不要把它当成自动执行器。 |
| Project Profile | 读取某个项目的短摘要。 | 处理项目前先读取，控制在 800-1200 字以内。 |
| Context Sources | 列出某个项目可检索的上下文文档。 | 排查“为什么没检索到历史”时使用。 |
| Context Router | 判断当前请求是否需要检索历史，并给出推荐 query/category。 | 在复杂问题前先调用，避免 Skill 软触发漏检。 |
| Context Search | 按项目检索 `hermes/` 下的 profile、incidents、lessons、skills。 | 只在需要历史时调用，不要每次默认检索。 |
| Lesson Writeback | 将已验证经验写回项目 `hermes/`。 | 仅在根因确认、修复验证后写回。 |
| Audit Trail | 将 Hermes 工作日志写入 runtime 专用目录，并在成功后发送 Telegram 短通知。 | 用于记录已完成动作；不需要 Python、terminal、file、code_execution。 |
| Current Context | 写入、读取、归档当前上下文快照。 | Cursor 在任务阶段结束或切新会话前调用，用于替代旧会话上下文。 |
| Issue Ledger | 维护进行中问题台账，记录版本、时间、影响、状态、优先级、当前结论、方案和验证结果。 | 适合未关闭问题、跨窗口交接问题；关闭后可再沉淀为 incidents 复盘。 |
| Action Notification | MCP 落盘成功后直接调用 Telegram Bot API 发通知。 | 不经过 Hermes LLM，不增加 Gemini 成本。 |
| Safety Scan | 阻断明显密钥、token、私钥等敏感内容写入。 | 写回前自动生效；命中后应改写为脱敏描述。 |
| Skills | 把可复用流程封装成按需加载能力。 | 用于复用排障流程；不要把长历史直接塞进 Skill。 |
| find-skill | 查找或评估是否已有合适 Skill。 | 用户询问“有没有技能/能否扩展能力”时使用。 |

### 10.2 任务队列

- `queue_create_task`
- `queue_list_tasks`
- `queue_update_task_status`

用途：接收 Telegram/Hermes 消息，显示在本地 Web 看板。

建议：

- 测试 Telegram 通道时先用 `queue_create_task`。
- 看板只监听 `127.0.0.1`，默认不暴露公网。
- 队列数据属于运行数据，不建议提交到 Git。

### 10.3 上下文服务

计划能力：

- `get_project_profile`
- `list_context_sources`
- `route_context_need`
- `search_context`
- `append_lesson`
- `append_audit_entry`
- `list_audit_entries`
- `summarize_daily_audit`
- `write_current_context`
- `get_current_context`
- `list_current_context_versions`
- `archive_current_context`
- `upsert_issue`
- `get_issue`
- `list_issues`
- `close_issue`

用途：

- 读取项目 profile。
- 列出项目上下文。
- 判断是否需要检索历史。
- 检索历史复盘。
- 写回新经验。
- 写入、读取和汇总 Hermes 工作日志。
- 写入、读取和归档当前上下文快照。
- 写入、读取、筛选和关闭进行中问题台账。

建议：

- 简单问候、常识问题不调用上下文检索。
- 涉及“之前修过、又出现、回滚后、历史问题”时先调用 `route_context_need`。
- `search_context` 返回片段，不返回全文，避免 token 膨胀。
- `append_lesson` 只写入已验证结论，不写猜测。
- `append_audit_entry` 仅写入 `AppData\Local\hermes\audit-trail`，不接受任意路径。
- `write_current_context` 用于覆盖当前状态快照，并自动归档旧版本。
- `upsert_issue` 用于记录当前仍需跟踪的问题；`close_issue` 只在修复和验证完成后调用。

### 10.4 工作日志

工作日志属于 Hermes runtime 运行数据，不进入平台仓库或项目仓库。

默认目录：

```text
C:\Users\<user>\AppData\Local\hermes\audit-trail\
  global\
  projects\
```

工具：

- `append_audit_entry`：追加一条工作日志。
- `list_audit_entries`：读取某天日志。
- `summarize_daily_audit`：汇总某天日志。

通知流程：

```text
append_audit_entry 成功
  -> hermes-context MCP 直接调用 Telegram Bot API 发送短摘要
```

通知只作为即时反馈，权威记录仍以 `audit-trail` 目录下的 Markdown/JSONL 文件为准。

通知字段：

```text
项目：news
触发类型：audit-trail（工作日志）
发起者：cursor
Skill/MCP：mcp_hermes_context_append_audit_entry（工作日志写入）
结果：success
路径：C:\Users\<user>\AppData\Local\hermes\audit-trail\projects\news\YYYY-MM-DD.md
风险：low
时间戳：2026-05-12T00:00:00.000Z
```

其中字段标题只使用中文；`触发类型` 与 `Skill/MCP` 的值包含英文标识和中文说明。

安全边界：

- 不需要 Python 权限。
- 不需要 `terminal`。
- 不需要 `file`。
- 不需要 `code_execution`。
- 不允许任意路径读写。
- 自动阻断密钥、token、JWT、私钥等敏感内容。
- Telegram 通知不发送长日志全文，也不发送敏感信息。

### 10.5 当前上下文

`current-context` 是 Cursor 新会话接续旧会话的最小上下文快照，目标是替代旧会话上下文，而不是在旧会话里继续叠加上下文。

目标文件：

```text
H:\AIcode\Trae\news\hermes\state\current-context.md
H:\AIcode\Trae\news\hermes\state\current-context.json
H:\AIcode\Trae\news\hermes\state\archive\YYYY-MM-DDTHH-MM-SS-current-context.md
```

工具：

- `write_current_context`：覆盖写入最新当前上下文，并归档上一版。
- `get_current_context`：读取当前上下文。
- `list_current_context_versions`：列出归档版本。
- `archive_current_context`：手动归档当前上下文。

写入触发：

- Cursor 准备切新会话。
- 一个阶段性任务完成。
- 用户要求“整理当前上下文/交接/压缩上下文”。
- 关键决策、已确认事实、风险、下一步动作发生变化。

分工：

- Cursor 掌握 Cursor 会话的一手上下文，因此由 Cursor 总结内容。
- Hermes MCP 负责校验、脱敏、落盘、归档和通知。
- Telegram Hermes 不二次总结 Cursor 内部上下文。

写入成功后，MCP 直接发送 Telegram 通知：

```text
项目：news
触发类型：current-context（当前上下文）
发起者：cursor
Skill/MCP：mcp_hermes_context_write_current_context（当前上下文写入）
结果：success
路径：H:\AIcode\Trae\news\hermes\state\current-context.md
风险：low
时间戳：...
```

### 10.6 进行中问题台账

`issues` 用于记录当前仍需追踪的问题，不替代 `incidents` 的完整复盘。

目标文件：

```text
H:\AIcode\Trae\news\hermes\issues\<issue-id>.md
H:\AIcode\Trae\news\hermes\issues\index.json
```

工具：

- `upsert_issue`：创建或更新问题，记录版本、时间、影响、状态、优先级、风险、当前结论、方案和验证项。
- `get_issue`：读取单个问题。
- `list_issues`：按状态或优先级列出问题。
- `close_issue`：写入最终修复和验证结果，并标记为 closed。

字段建议：

```json
{
  "project": "news",
  "issueId": "stable-short-id",
  "title": "问题标题",
  "status": "investigating",
  "priority": "P1",
  "version": "git-sha-or-release",
  "occurredAt": "2026-05-12T14:00:00+08:00",
  "impact": "影响范围",
  "owner": "main",
  "summary": "当前问题摘要",
  "currentConclusion": "当前判断，未确认时要明确写未确认",
  "proposedSolution": "拟定解决方案",
  "nextValidation": ["下一步验证项"],
  "relatedFiles": ["相关文件或模块"],
  "evidence": ["日志、截图、命令结果摘要"],
  "risk": "medium"
}
```

写入触发：

- 当前问题仍未解决，但需要跨窗口或跨 Agent 延续。
- 用户要求记录当前问题和解决方案。
- 新发现的问题需要后续验证，不能只保存在聊天上下文里。
- 问题修复并验证完成，需要关闭台账。

推荐工作流：

```text
发现问题
  -> upsert_issue(status=open 或 investigating)
  -> 新窗口启动时 get_current_context + list_issues(status=open/investigating)
  -> 修复过程中继续 upsert_issue 更新 currentConclusion/proposedSolution/nextValidation
  -> 修复验证完成后 close_issue
  -> 如问题具有长期复盘价值，再 append_lesson(category=incidents)
```

写入成功后，MCP 直接发送 Telegram 通知：

```text
项目：news
触发类型：issues（进行中问题）
发起者：cursor
Skill/MCP：mcp_hermes_context_upsert_issue（问题台账写入）
结果：success
路径：H:\AIcode\Trae\news\hermes\issues\<issue-id>.md
风险：medium
时间戳：...
```

读取用法：

- 新窗口启动：优先 `get_current_context`，再 `list_issues status=open` 和 `list_issues status=investigating`。
- 只查一个问题：用 `get_issue issueId=<issue-id>`。
- 列出高优先级问题：用 `list_issues priority=P0/P1`。
- 关闭问题：必须提供 `finalFix` 和 `verificationResult`，不要只把状态手工改成 closed。

### 10.7 当前功能与权限矩阵

当前建议配置：

| 功能/权限 | 状态 | 说明 | 风险判断 |
| --- | --- | --- | --- |
| `messaging` | 开启 | Telegram/Gateway 消息入口。 | 必要入口，保留。 |
| `memory` | 开启 | 短偏好和稳定事实。 | 低风险，注意不写密钥。 |
| `session_search` | 开启 | 检索历史会话。 | 中低风险，避免过度召回。 |
| `skills` | 开启 | 按需加载 Skill。 | 中低风险，Skill 不应要求高危权限。 |
| `browser` | 开启 | 浏览公开网页。 | 中风险，默认不访问私有地址。 |
| `cronjob` | 开启 | 计划任务能力。 | 中风险，仅用于低危提醒/汇总。 |
| `task-queue MCP` | 开启 | 本地任务队列。 | 低风险，本地服务。 |
| `hermes-context MCP` | 开启 | 上下文检索、写回、工作日志、当前上下文、问题台账、动作通知。 | 低到中风险，工具固定边界。 |
| `terminal` | 关闭 | 执行系统命令。 | 高风险，不为 Telegram Hermes 开启。 |
| `file` | 关闭 | 任意文件读写/搜索。 | 高风险，不为工作日志开启。 |
| `code_execution` | 关闭 | 运行代码/Python。 | 高风险，不为工作日志开启。 |
| `delegation` | 关闭 | 子代理/任务委派。 | 当前不需要。 |

原则：如某个功能可通过受限 MCP 完成，不开启更大的通用权限。

### 10.8 跨项目接入模板

每个新项目需要准备自己的上下文目录和触发关键词，不复用 `news` 的业务关键词。

项目目录模板：

```text
<project-root>\hermes\
  README.md
  profile\
    project-profile.md
    project-rules-summary.md
  incidents\
  lessons\
  skills\
```

项目 profile 至少包含：

- 项目名称和根目录。
- 技术栈。
- 关键业务流程。
- 常见风险。
- 触发上下文检索的关键词。

示例触发关键词：

```text
项目名、核心模块名、部署、数据库、鉴权、监控、回滚、之前、又出现、历史、复盘
```

如果是新项目，应先建立项目自己的 Skill，例如：

```text
<project-root>\hermes\skills\<project>-debug.md
```

Skill 应定义：

- 触发条件。
- 需要读取的 profile/incident/lesson。
- 禁止事项。
- 写回规则。

### 10.8 平台层与项目层边界

平台层 `H:\agent\hermes` 保存：

- MCP 服务代码。
- 全局文档。
- 全局短 Memory。
- 全局 Skills。
- 审计日志。

项目层 `<project-root>\hermes` 保存：

- 项目 profile。
- 项目故障复盘。
- 项目经验。
- 项目专属 Skill。

不建议把具体项目长历史保存在平台层，否则多项目接入后会造成上下文污染。

### 10.9 Skill 部署与运行边界

Hermes Skill 有三层目录，职责不同：

```text
C:\Users\<user>\AppData\Local\hermes\skills\
```

Hermes 本机 runtime 安装目录。Hermes 官方/内置 Skill 和已安装的通用自定义 Skill 在这里运行。不要把该目录视为 `hermes_aiie` 的源码单源。

```text
H:\agent\hermes\skills\
```

Hermes AIIE 平台级自定义 Skill 源码目录。只保存跨项目复用能力，例如：

- `global\find-skill`
- `global\context-recall`
- `software-development\audit-trail`

这些 Skill 可通过安装/同步脚本复制到 Hermes runtime 目录。

同步命令：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File H:\agent\hermes\scripts\Sync-HermesCustomSkills.ps1
```

预演同步范围：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File H:\agent\hermes\scripts\Sync-HermesCustomSkills.ps1 -WhatIf
```

同步脚本只同步平台级白名单目录，默认包括：

- `global`
- `software-development`

它会跳过 `news` 等项目专属目录。

```text
<project-root>\hermes\skills\
```

项目专属 Skill/流程说明目录。只服务该项目，随项目 Git 管理，默认不同步到 Hermes runtime，避免污染 Hermes 全局 Skill 空间。

同步规则：

- 同步平台级白名单目录：`global`、`software-development`。
- 不同步项目目录：`news`、任何 `<project-root>\hermes\skills`。
- 项目 Skill 若要变成 Hermes 独立服务能力，必须先提升为平台级通用 Skill。

已清理的历史问题：

```text
H:\agent\hermes\skills\news\
```

该目录曾是平台化改造前遗留的 `news` 项目专属 Skill 目录，不应保留在 Hermes 平台仓库，当前已从平台仓库清理。对应项目单源为：

```text
H:\AIcode\Trae\news\hermes\skills\
```

同步脚本应持续避免同步 `news` 等项目专属目录。

---

## 11. Hermes 当前工作职责清单

本清单用于让 Telegram Hermes 明确自己当前能做什么、读写哪些文件、应调用哪些 MCP/工具，以及哪些行为禁止执行。

### 11.1 工作日志记录

职责：

- 记录 Hermes 已完成且可验证的工作。
- 将工作日志写入 Hermes runtime。
- 写入成功后向当前 Telegram 发送短摘要。

读写文件：

```text
C:\Users\<user>\AppData\Local\hermes\audit-trail\projects\<project>\YYYY-MM-DD.md
C:\Users\<user>\AppData\Local\hermes\audit-trail\projects\<project>\YYYY-MM-DD.jsonl
C:\Users\<user>\AppData\Local\hermes\audit-trail\global\YYYY-MM-DD.md
C:\Users\<user>\AppData\Local\hermes\audit-trail\global\YYYY-MM-DD.jsonl
```

使用工具：

- `mcp_hermes_context_append_audit_entry`
- `mcp_hermes_context_list_audit_entries`
- `mcp_hermes_context_summarize_daily_audit`

限制：

- 不使用 Python。
- 不使用 terminal。
- 不使用 file。
- 不使用 code_execution。
- 不把运行日志写入 `H:\agent\hermes` 或项目仓库。
- Telegram 通知由 MCP 内部直接调用 Telegram Bot API 完成，不需要额外调用 Hermes LLM。

### 11.2 项目上下文检索

职责：

- 当用户问到历史问题、故障复盘、曾经修复、回滚后问题时，检索项目上下文。
- 返回相关片段，帮助 Cursor/Hermes 减少凭空判断。

读取文件：

```text
H:\AIcode\Trae\news\hermes\profile\project-profile.md
H:\AIcode\Trae\news\hermes\incidents\*.md
H:\AIcode\Trae\news\hermes\lessons\*.md
H:\AIcode\Trae\news\hermes\skills\*.md
H:\AIcode\Trae\news\hermes\issues\*.md
H:\AIcode\Trae\news\hermes\state\current-context.md
```

使用工具：

- `mcp_hermes_context_route_context_need`
- `mcp_hermes_context_search_context`
- `mcp_hermes_context_get_project_profile`
- `mcp_hermes_context_list_context_sources`

限制：

- 检索类任务默认不写文件。
- 简单问候、普通常识问题不检索长历史。

### 11.3 当前上下文维护

职责：

- 维护 Cursor 新会话接续旧会话的最小上下文快照。
- 由掌握一手上下文的 Cursor 生成结构化内容。
- 由 Hermes MCP 负责校验、脱敏、覆盖写入、归档旧版本并发送 Telegram 通知。

写入文件：

```text
H:\AIcode\Trae\news\hermes\state\current-context.md
H:\AIcode\Trae\news\hermes\state\current-context.json
H:\AIcode\Trae\news\hermes\state\archive\*-current-context.md
```

使用工具：

- `mcp_hermes_context_write_current_context`
- `mcp_hermes_context_get_current_context`
- `mcp_hermes_context_list_current_context_versions`
- `mcp_hermes_context_archive_current_context`

触发条件：

- Cursor 准备切新会话。
- 阶段性任务完成。
- 用户要求整理/交接/压缩当前上下文。
- 关键决策、已确认事实、风险、下一步动作发生变化。

限制：

- Hermes Telegram 不二次总结 Cursor 内部上下文。
- 不写完整聊天记录，只写最小接续上下文。
- 写入成功后由 MCP 自动通知 Telegram。

### 11.4 项目经验写回

职责：

- 当问题已确认根因、修复方案、验证结果后，将经验沉淀到项目自己的 `hermes/` 目录。

写入文件：

```text
H:\AIcode\Trae\news\hermes\lessons\*.md
H:\AIcode\Trae\news\hermes\incidents\*.md
H:\AIcode\Trae\news\hermes\profile\project-profile.md
```

使用工具：

- `mcp_hermes_context_append_lesson`

限制：

- 只写已验证结论。
- 不写猜测。
- 不写密钥、token、JWT、私钥。
- 不直接改项目代码。
- 写入成功后由 MCP 自动通知 Telegram。

### 11.5 进行中问题台账维护

职责：

- 当问题尚未关闭、需要跨窗口延续或需要后续验证时，维护项目问题台账。
- 问题关闭时写入最终修复、验证结果和后续事项。

读写文件：

```text
H:\AIcode\Trae\news\hermes\issues\<issue-id>.md
H:\AIcode\Trae\news\hermes\issues\index.json
```

使用工具：

- `mcp_hermes_context_upsert_issue`
- `mcp_hermes_context_get_issue`
- `mcp_hermes_context_list_issues`
- `mcp_hermes_context_close_issue`

触发条件：

- 用户要求“记录当前问题/解决方案/问题台账”。
- 发现问题仍未解决或仍需验证。
- 新窗口需要继承当前问题状态。
- 问题已完成修复和验证，需要关闭台账。

限制：

- 不把未验证的最终结论写成 incidents 复盘。
- 不记录密钥、token、JWT、私钥。
- 写入成功后由 MCP 自动通知 Telegram。

### 11.6 Skill 使用与能力说明

职责：

- 当用户要求流程化能力时，按需加载对应 Skill。
- 不默认读取所有长文档。

读取文件：

```text
C:\Users\<user>\AppData\Local\hermes\skills\software-development\audit-trail\SKILL.md
H:\agent\hermes\skills\software-development\audit-trail\SKILL.md
```

使用工具：

- `skill_view`
- `skills_list`
- `mcp_hermes_context_search_context`

限制：

- Skill 是流程说明，不是任意执行权限。
- Skill 不得要求开启 Python、terminal、file、code_execution。

### 11.7 平台新开发 Skill 列表

| Skill | 功能 | 服务对象 | 触发条件 | 主要工具/文件 |
| --- | --- | --- | --- | --- |
| `audit-trail` | 工作日志记录、落盘、通知。 | Telegram Hermes / Hermes 平台工作。 | 用户要求记录、总结、审计工作；Hermes 完成自测/排障。 | `append_audit_entry`、`list_audit_entries`、`summarize_daily_audit`。 |
| `context-recall` | 按需检索历史上下文。 | Hermes/Cursor 作为上下文使用者。 | 涉及历史决策、事故、经验、用户偏好。 | `route_context_need`、`search_context`、`get_project_profile`。 |
| `incident-review` | 事故/故障复盘流程。 | Hermes 自己参与的故障；Cursor 可参考流程。 | bug、宕机、部署失败、反复排障。 | `append_lesson` 写 incident/lesson。 |
| `mcp-safety-review` | MCP 权限和安全审查。 | Hermes/Cursor 的 MCP 管理。 | 新增 MCP、新工具、新权限。 | 读 schema、分类权限、定义 allow/deny、审计和回滚。 |
| `find-skill` | 查找或评估已有 Skill。 | Hermes 平台能力管理。 | 用户问“有没有技能/如何扩展能力”。 | 读取平台 Skill 和项目 Skill。 |

平台 Skill 源码目录：

```text
H:\agent\hermes\skills\
```

runtime Skill 目录：

```text
C:\Users\<user>\AppData\Local\hermes\skills\
```

### 11.8 任务队列与消息确认

职责：

- 接收、登记、查询任务状态。
- 用于确认 Telegram/Hermes 通道是否正常。

读写位置：

```text
Hermes task-queue 本地运行数据
```

使用工具：

- `mcp_task_queue_queue_create_task`
- `mcp_task_queue_queue_list_tasks`
- `mcp_task_queue_queue_update_task_status`

限制：

- task-queue 不是自动执行器。
- 不用它绕过用户确认执行开发或部署。

### 11.9 Telegram 通知

职责：

- 在 MCP 完成落盘动作后，把短摘要发送回 Telegram。

使用工具：

- MCP 内部 Telegram Bot API 通知模块。

使用场景：

- 工作日志已落盘。
- 当前上下文已写入。
- 项目经验/故障复盘已写入。
- 用户要求发送结果。
- 任务状态需要反馈。

限制：

- 不发送长日志全文。
- 不发送密钥、token、JWT、私钥。
- Telegram 通知不是权威记录，权威记录以本地 Markdown/JSON/JSONL 文件为准。
- 通知不经过 Hermes LLM，不增加 Gemini API 成本。

### 11.10 浏览器与公开信息查询

职责：

- 必要时查询公开网页信息。

使用工具：

- `browser`

限制：

- 不访问私有地址。
- 不抓取敏感后台。
- 不把网页信息直接当事实，应说明来源和不确定性。

### 11.11 Cronjob 计划任务

职责：

- 用于低风险提醒或定时汇总。

使用工具：

- `cronjob`

限制：

- 不用 cronjob 代替工作日志写入。
- 不创建高频任务。
- 不执行代码、部署、数据库操作。

### 11.12 明确禁止的职责

Hermes 当前不得执行：

- 不直接修改 `news` 项目代码。
- 不直接部署前端、后端、数据库。
- 不执行 SQL。
- 不运行 shell 命令。
- 不运行 Python。
- 不读取任意本机文件。
- 不写入任意路径。
- 不保存密钥、token、JWT、私钥。
- 不把项目专属上下文写入 `H:\agent\hermes`。

### 11.13 当前项目路径

```text
项目名：news
项目根目录：H:\AIcode\Trae\news
项目上下文目录：H:\AIcode\Trae\news\hermes
Hermes 平台目录：H:\agent\hermes
Hermes runtime 目录：C:\Users\<user>\AppData\Local\hermes
```

---

## 12. 使用示例

### 12.1 检索历史

```text
请调用 search_context：
project=news
query=R2 failure fallback Markdown
limit=5
```

预期：返回项目 `hermes/` 中相关片段。

### 12.2 写回经验

```text
请调用 append_lesson：
project=news
category=lessons
title=一次已验证的问题总结
content=## Summary
...
```

预期：写入目标项目 `hermes/lessons/`。

### 12.3 判断是否需要检索

```text
请调用 route_context_need：
project=news
request=模式2 R2失败为什么应该展示 Markdown？
```

预期：返回是否需要检索、推荐 query 和 category。

---

## 13. 预期效果

部署成功后，应具备：

- Telegram/Hermes 消息可进入本地任务队列。
- Cursor/Hermes 可读取项目 profile。
- Cursor/Hermes 可按需检索项目历史。
- Cursor/Hermes 可写回经验总结。
- 敏感信息写入会被阻断。
- 长历史不会默认加载，减少 token 浪费。

---

## 14. 当前不足

- `route_context_need` 属于规划能力，需在 v0.3 实施后生效。
- 检索第一版为关键词检索，不是语义向量检索。
- Skill 自动命中仍依赖 Agent 调度，需要通过规则和工具提示增强。
- 多项目配置第一版需要手工登记。
- 不提供自动 Git commit/push。

---

## 15. 后续优化

- 增加项目配置文件 `projects.json`。
- 增强中文分词、标题权重和去重。
- 增加重复写入检测。
- 增加 find-skill 全局 Skill。
- 增加更多项目模板。
- 评估是否引入轻量语义检索。

---

## 16. 安全原则

- 不存密钥。
- 不写数据库。
- 不部署。
- 不自动 git push。
- 高风险动作必须由 Cursor/用户单独确认。
- 项目历史只能读写已登记项目目录。
