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

### 2.1 原始 Hermes 默认路径

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

### 2.2 初始化与验证

安装原始 Hermes 后，建议先运行：

```powershell
hermes --help
hermes setup
hermes status
hermes model
```

如需 Telegram/Gateway：

```powershell
hermes gateway
```

如需 MCP：

```powershell
hermes mcp list
```

验证标准：

- `hermes --help` 能显示 CLI 帮助。
- `hermes status` 能读取当前配置。
- `hermes mcp list` 能正常执行。
- Telegram/Gateway 能启动，或后续可由 `HermesGateway` 计划任务常驻。

### 2.3 与 `hermes_aiie` 的边界

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

用途：

- 读取项目 profile。
- 列出项目上下文。
- 判断是否需要检索历史。
- 检索历史复盘。
- 写回新经验。
- 写入、读取和汇总 Hermes 工作日志。

建议：

- 简单问候、常识问题不调用上下文检索。
- 涉及“之前修过、又出现、回滚后、历史问题”时先调用 `route_context_need`。
- `search_context` 返回片段，不返回全文，避免 token 膨胀。
- `append_lesson` 只写入已验证结论，不写猜测。
- `append_audit_entry` 仅写入 `AppData\Local\hermes\audit-trail`，不接受任意路径。

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
  -> send_message 给当前 Telegram 发送短摘要
```

通知只作为即时反馈，权威记录仍以 `audit-trail` 目录下的 Markdown/JSONL 文件为准。

安全边界：

- 不需要 Python 权限。
- 不需要 `terminal`。
- 不需要 `file`。
- 不需要 `code_execution`。
- 不允许任意路径读写。
- 自动阻断密钥、token、JWT、私钥等敏感内容。
- Telegram 通知不发送长日志全文，也不发送敏感信息。

### 10.5 当前功能与权限矩阵

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
| `hermes-context MCP` | 开启 | 上下文检索、写回、工作日志。 | 低到中风险，工具固定边界。 |
| `terminal` | 关闭 | 执行系统命令。 | 高风险，不为 Telegram Hermes 开启。 |
| `file` | 关闭 | 任意文件读写/搜索。 | 高风险，不为工作日志开启。 |
| `code_execution` | 关闭 | 运行代码/Python。 | 高风险，不为工作日志开启。 |
| `delegation` | 关闭 | 子代理/任务委派。 | 当前不需要。 |

原则：如某个功能可通过受限 MCP 完成，不开启更大的通用权限。

### 10.6 跨项目接入模板

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

### 10.7 平台层与项目层边界

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

### 10.8 Skill 部署与运行边界

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

## 11. 使用示例

### 11.1 检索历史

```text
请调用 search_context：
project=news
query=R2 failure fallback Markdown
limit=5
```

预期：返回项目 `hermes/` 中相关片段。

### 11.2 写回经验

```text
请调用 append_lesson：
project=news
category=lessons
title=一次已验证的问题总结
content=## Summary
...
```

预期：写入目标项目 `hermes/lessons/`。

### 11.3 判断是否需要检索

```text
请调用 route_context_need：
project=news
request=模式2 R2失败为什么应该展示 Markdown？
```

预期：返回是否需要检索、推荐 query 和 category。

---

## 12. 预期效果

部署成功后，应具备：

- Telegram/Hermes 消息可进入本地任务队列。
- Cursor/Hermes 可读取项目 profile。
- Cursor/Hermes 可按需检索项目历史。
- Cursor/Hermes 可写回经验总结。
- 敏感信息写入会被阻断。
- 长历史不会默认加载，减少 token 浪费。

---

## 13. 当前不足

- `route_context_need` 属于规划能力，需在 v0.3 实施后生效。
- 检索第一版为关键词检索，不是语义向量检索。
- Skill 自动命中仍依赖 Agent 调度，需要通过规则和工具提示增强。
- 多项目配置第一版需要手工登记。
- 不提供自动 Git commit/push。

---

## 14. 后续优化

- 增加项目配置文件 `projects.json`。
- 增强中文分词、标题权重和去重。
- 增加重复写入检测。
- 增加 find-skill 全局 Skill。
- 增加更多项目模板。
- 评估是否引入轻量语义检索。

---

## 15. 安全原则

- 不存密钥。
- 不写数据库。
- 不部署。
- 不自动 git push。
- 高风险动作必须由 Cursor/用户单独确认。
- 项目历史只能读写已登记项目目录。
