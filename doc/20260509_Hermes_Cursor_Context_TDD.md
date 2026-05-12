# TDD: Hermes + Cursor 上下文沉淀体系详细设计

**版本**: v0.10  
**日期**: 2026-05-12  
**状态**: current-context + issue ledger + MCP 动作通知已实现

---

## 更新日志

| 日期 | 版本 | 摘要 |
| --- | --- | --- |
| 2026-05-12 | v0.10 | 增加 `issue-store.ts`：提供问题台账 upsert/get/list/close，写入 `<project-root>\hermes\issues\`，维护 `index.json`，并复用 MCP 动作通知。 |
| 2026-05-12 | v0.9 | 增加 `current-context-store.ts` 与 `notify.ts`：提供 current-context 写入/读取/归档/版本列表工具，MCP 内部直接发送 Telegram 动作通知，并支持 `HTTP_PROXY`/`HTTPS_PROXY` 代理环境。 |
| 2026-05-10 | v0.8 | 增加 `audit-trail` Skill 双写流程：MCP 写入成功后调用 `send_message`，向 Telegram 发送短摘要；不改 Hermes Agent 核心。 |
| 2026-05-10 | v0.7 | 增加受限工作日志 MCP 技术实现：`audit-trail-store.ts` 固定写入 Hermes runtime `audit-trail` 目录，提供追加、列表和日汇总工具，不依赖 Python。 |
| 2026-05-10 | v0.6 | 增加 `Run-HermesGatewayHealthHidden.vbs` 技术设计；`HermesGatewayHealth` 计划任务改为 `wscript.exe` 调用 VBS，再隐藏执行 PowerShell 健康检查。 |
| 2026-05-10 | v0.5 | 增加 Skill 安装/同步技术边界：平台级通用 Skill 可同步到 Hermes runtime，项目专属 Skill 仅保留在 `<project>\hermes\skills`；确认 `skills\news` 为待清理遗留目录。 |
| 2026-05-10 | v0.4 | 增加 `search_context` 过度召回抑制实现：停用词集合、有效关键词、最低相关分、`matchedTerms`/`ignoredTerms` 审计字段。 |
| 2026-05-10 | v0.3 | 平台化调整：项目上下文从 `H:\agent\hermes\contexts\<project>` 迁移为 `<project-root>\hermes` 单源；废弃 `sync_project_mirror`；新增 `route_context_need` 和 find-skill 详细设计。 |
| 2026-05-09 | v0.2 | 增加 `hermes-context` MCP 详细设计：TypeScript 结构、工具入参出参、检索策略、安全扫描、项目隔离和注册方式。 |
| 2026-05-09 | v0.1 | 定义上下文流转、数据分类、MCP 预设接口、项目镜像同步、写回策略和性能控制。 |

---

## 1. 上下文流转

### 1.1 默认路径

```text
用户请求
  -> Cursor Rules 判断硬约束
  -> 读取少量 Hermes Memory 或项目 profile 摘要
  -> 判断是否命中 Skill
  -> 如命中，由 Skill 或 route_context_need 决定是否通过 MCP 检索 Context Docs
  -> Cursor 执行分析或开发
  -> 如产生可复用经验，写回 Hermes Context Docs 或 Memory
```

### 1.2 长历史读取路径

```text
任务触发 Skill
  -> Skill 识别项目与问题类型
  -> MCP route_context_need(project, request)
  -> MCP search_context(project, query, category)
  -> 返回相关片段
  -> Cursor 结合当前代码和规则判断
```

长历史不进入默认上下文。

---

## 2. 数据分类

### 2.1 Memory 条目

要求：

- 单条短小。
- 长期有效。
- 可跨会话复用。
- 不含密钥。

示例：

```text
User prefers Chinese responses unless English is explicitly requested.
Project-specific facts belong in that project's hermes/ directory.
```

### 2.2 Context Docs 条目

要求：

- 可长文。
- 可包含背景、症状、根因、修复、验证、回滚。
- 必须标注项目、日期、环境、影响范围。

建议结构：

```text
# 事件标题

## 摘要
## 环境
## 症状
## 根因
## 修复
## 验证
## 回滚
## 后续注意
```

### 2.3 Skill 条目

要求：

- 描述触发条件。
- 描述读取哪些上下文。
- 描述执行流程。
- 描述写回规则。

建议结构：

```text
# Skill: <project-skill>

## 触发条件
## 前置读取
## 排查流程
## 禁止事项
## 写回规则
```

Skill 存放边界：

- Hermes runtime Skill：`C:\Users\<user>\AppData\Local\hermes\skills`。
- Hermes AIIE 平台级 Skill 源码：`H:\agent\hermes\skills`，只保存跨项目通用能力。
- 项目专属 Skill：`<project-root>\hermes\skills`，随项目 Git 管理，默认由 `hermes-context` 检索，不安装为全局 runtime Skill。

安装/同步脚本设计约束：

```text
sync allowed:
  H:\agent\hermes\skills\global\
  H:\agent\hermes\skills\software-development\

sync denied:
  H:\agent\hermes\skills\news\
  <project-root>\hermes\skills\
```

如需让项目 Skill 进入 Hermes runtime，必须先人工评审并提升为平台级通用 Skill，再从 `H:\agent\hermes\skills\<category>` 同步。

### 2.4 Issue 条目

用途：记录进行中的问题、当前结论、修复方案和下一步验证，避免跨窗口或跨 Agent 时丢失问题状态。

存储：

```text
<project-root>\hermes\issues\
  <issue-id>.md
  index.json
```

核心字段：

```json
{
  "project": "news",
  "issueId": "mode3-r2-timeout",
  "title": "模式3 R2 超时",
  "status": "investigating",
  "priority": "P1",
  "version": "a4ed8e4",
  "occurredAt": "2026-05-12T13:00:00+08:00",
  "impact": "模式3 JSON 报告无法生成",
  "owner": "main",
  "summary": "...",
  "currentConclusion": "...",
  "proposedSolution": "...",
  "nextValidation": ["..."],
  "relatedFiles": ["..."],
  "evidence": ["..."],
  "risk": "medium"
}
```

设计约束：

- `issue-store.ts` 写入 Markdown 文件，并在 HTML 注释块内保存结构化 JSON。
- `index.json` 从 Markdown 中的结构化 JSON 重建，避免索引与正文长期分叉。
- `upsert_issue` 与 `close_issue` 成功后触发 Telegram 动作通知。
- 写入前统一调用 `assertSafeContent()`。

已知遗留目录：

```text
H:\agent\hermes\skills\news\
```

该目录包含 `news` 专属 Skill，并引用已废弃的 `H:\agent\hermes\contexts\news\...`。后续开发清理时应删除该目录，不应同步到 runtime。

---

## 3. MCP 接口设计

### 3.1 `route_context_need`

用途：判断当前请求是否需要检索项目上下文，降低 Skill 软触发漏检。

输入：

```json
{
  "project": "news",
  "request": "模式2 R2失败为什么应该展示 Markdown？"
}
```

输出：

```json
{
  "project": "news",
  "needsContext": true,
  "reason": "Request mentions Mode 2 and R2 fallback, which is a known project-history-sensitive area.",
  "query": "Mode 2 R2 fallback Markdown",
  "category": "incidents"
}
```

### 3.2 `search_context`

用途：按项目和主题检索 Hermes Context Docs。

输入：

```json
{
  "project": "news",
  "query": "Mode 1 No active LLM configuration found",
  "topic": "supabase",
  "limit": 5
}
```

输出：

```json
{
  "matches": [
    {
      "source": "incidents/mode1-analysis-ticker.md",
      "score": 8,
      "matchedTerms": ["mode", "llm", "configuration"],
      "ignoredTerms": [],
      "snippet": "..."
    }
  ]
}
```

过度召回抑制：

- `tokenize()` 将查询拆成去重 token。
- `STOP_WORDS` 过滤低价值泛词，例如 `context`、`project`、`history`、`test`、`上下文`、`项目`、`测试`。
- 过滤后没有有效关键词时，`scoreContent()` 返回 `null`。
- 只有有效关键词在内容、路径或标题中命中，且分数达到 `MIN_RELEVANCE_SCORE`，才返回结果。
- 当查询包含三个及以上有效关键词时，至少需要命中两个有效关键词，避免单个高频词造成过度召回。
- 返回 `matchedTerms` 和 `ignoredTerms`，用于排查为何召回或为何未召回。

### 3.3 `append_lesson`

用途：写回新的项目经验或故障复盘。

输入：

```json
{
  "project": "news",
  "category": "incidents",
  "title": "Hermes Gemini proxy bypass",
  "content": "..."
}
```

要求：

- 直接写入项目 `<project-root>\hermes\`。
- 写入前做敏感信息扫描。
- 不执行 Git 操作。

### 3.4 `get_project_profile`

用途：读取项目极短摘要。

输出应控制在 800-1200 字以内。

### 3.5 `list_context_sources`

用途：列出项目当前可用上下文源，便于审计。

### 3.6 `upsert_issue`

用途：创建或更新进行中问题台账。

输入：

```json
{
  "project": "news",
  "issueId": "mode3-r2-timeout",
  "title": "模式3 R2 超时",
  "status": "investigating",
  "priority": "P1",
  "version": "a4ed8e4",
  "occurredAt": "2026-05-12T13:00:00+08:00",
  "impact": "模式3报告生成失败",
  "owner": "main",
  "summary": "...",
  "currentConclusion": "...",
  "proposedSolution": "...",
  "nextValidation": ["验证 R2 超时配置"],
  "relatedFiles": ["supabase/functions/..."],
  "evidence": ["Edge Function timeout log"],
  "risk": "medium",
  "initiator": "cursor"
}
```

输出：

```json
{
  "ok": true,
  "created": true,
  "writtenTo": "<project-root>\\hermes\\issues\\mode3-r2-timeout.md",
  "notification": {
    "ok": true
  }
}
```

### 3.7 `get_issue` / `list_issues` / `close_issue`

用途：

- `get_issue`：按 `issueId` 读取单个问题。
- `list_issues`：按 `status` 或 `priority` 过滤问题列表。
- `close_issue`：写入 `finalFix`、`verificationResult`、`followUp`，并将状态置为 `closed`。

要求：

- `get_issue` 和 `list_issues` 只读，不触发 Telegram 通知。
- `close_issue` 是写操作，成功后触发 Telegram 通知。
- `list_issues` 每次从 Markdown 结构化 JSON 重建 `index.json`，保证索引可恢复。

---

## 4. 项目上下文单源规则

项目级内容只写入项目自身目录：

- 故障复盘按类别写入 `incidents/`。
- 可复用经验写入 `lessons/`。
- 项目专属 Skill 文档写入 `skills/`。
- 进行中问题台账写入 `issues/`。

通用目录：

```text
<project-root>\hermes\
```

同步约束：

- 不写入密钥。
- 不写入生产 URL 中的敏感 token。
- 不写入完整用户隐私数据。
- 可跟随 Git 备份，但是否提交由用户另行确认。
- `H:\agent\hermes` 不保存具体项目长历史。

---

## 5. 工具启用设计

第一阶段启用命令对应的目标状态：

```text
enabled:
  clarify
  messaging
  memory
  session_search
  skills
  browser
  cronjob
  task-queue MCP

disabled:
  terminal
  file
  code_execution
  delegation
  moa
  image_gen
  tts
  rl
```

说明：

- `browser` 仅用于网页读取和辅助分析，不用于自动提交表单或高风险操作。
- `cronjob` 仅用于定时提醒或低风险维护任务，不用于自动部署或数据库写入。
- 代码修改仍由 Cursor 执行。

---

## 6. 写回策略

写回分三类：

1. 短事实：写 Hermes Memory。
2. 长复盘：写项目 `<project-root>\hermes` Context Docs。
3. 可复用流程：沉淀为 Skill 文档。

写回前必须判断：

- 是否长期有效。
- 是否已存在重复内容。
- 是否包含敏感信息。
- 是否与高优先级规则冲突。

---

## 7. 冲突处理

当检索到的历史经验与当前规则冲突：

1. 停止直接采用历史经验。
2. 明确指出冲突来源。
3. 按高优先级规则执行。
4. 如历史经验已过期，写入修订说明。

---

## 8. 性能控制

- 默认不读取 `incidents/` 全文。
- MCP 检索返回数量默认不超过 5 条。
- 单条 snippet 默认不超过 1200 字。
- 项目 profile 控制在 800-1200 字。
- Skill 文档只在命中触发条件时加载。

---

## 9. Gateway 健康任务隐藏执行设计

运行时脚本：

```text
C:\Users\<user>\AppData\Local\hermes\scripts\Run-HermesGatewayHealthHidden.vbs
```

仓库模板：

```text
H:\agent\hermes\scripts\Run-HermesGatewayHealthHidden.vbs
```

脚本职责：

```vbscript
Set shell = CreateObject("WScript.Shell")
scriptPath = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\hermes\scripts\Check-HermesGatewayHealth.ps1"
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & scriptPath & """"
shell.Run command, 0, False
```

计划任务动作：

```text
wscript.exe C:\Users\<user>\AppData\Local\hermes\scripts\Run-HermesGatewayHealthHidden.vbs
```

设计约束：

- VBS 只做隐藏窗口包装，不改变健康检查逻辑。
- `Check-HermesGatewayHealth.ps1` 继续负责检测真实 `hermes gateway run` 子进程、清理 stale state、重启 `HermesGateway`。
- `shell.Run command, 0, False` 表示隐藏窗口且不阻塞计划任务。
- 若 VBS 出现问题，可将计划任务动作回退为直接执行 PowerShell 健康检查。

---

## 10. 第二阶段技术实现：`hermes-context` MCP

沿用现有 `H:\agent\hermes` Node.js/TypeScript 技术栈：

- TypeScript
- `@modelcontextprotocol/sdk`
- `zod`
- Node.js `fs/promises`

实现目录：

```text
H:\agent\hermes\mcp\hermes-context\
  src\
    config.ts
    index.ts
    context-store.ts
    search.ts
    audit.ts
    safety.ts
  scripts\
    Run-HermesContextMcp.cmd
```

第一版复用 `H:\agent\hermes` 根项目依赖，避免重复安装。

### 10.1 受限工作日志工具

实现文件：

```text
H:\agent\hermes\mcp\hermes-context\src\audit-trail-store.ts
```

默认根目录：

```text
C:\Users\<user>\AppData\Local\hermes\audit-trail
```

可通过环境变量覆盖：

```text
HERMES_AUDIT_TRAIL_ROOT
```

但生产使用应保持在 Hermes runtime 目录下。

工具：

- `append_audit_entry`
- `list_audit_entries`
- `summarize_daily_audit`

安全约束：

- 不调用 Python。
- 不调用 terminal。
- 不暴露任意文件读写路径。
- `scope` 只能是 `global` 或 `project`。
- `project` 只能包含字母、数字、下划线和短横线。
- `actionType` 和 `risk` 使用枚举。
- 单字段最大 2000 字符。
- 写入前调用 `assertSafeContent` 阻断密钥、JWT、私钥等敏感内容。
- 每条记录同时写入 Markdown 和 JSONL，便于人工审阅和结构化查询。

动作通知由 MCP 内部编排，不再要求 Skill 额外调用 `send_message`：

```text
mcp_hermes_context_append_audit_entry
  -> 返回 writtenTo.markdown / writtenTo.jsonl
  -> notify.ts 调用 Telegram Bot API
  -> Telegram 收到短摘要
```

这样可以避免再次经过 Hermes LLM，减少 token/API 成本；通知失败不回滚已完成落盘。

网络代理：

- `notify.ts` 通过 `undici` 的 `ProxyAgent` 支持 `HTTPS_PROXY` / `HTTP_PROXY`。
- 代理变量可来自 MCP 进程环境，或 Hermes runtime `.env`。
- 若代理环境存在但未接入，Telegram API 会出现 `fetch failed`，落盘成功但通知失败。

通知模板：

```text
项目：<project|global>
触发类型：audit-trail（工作日志）
发起者：<cursor|hermes|other>
Skill/MCP：mcp_hermes_context_append_audit_entry（工作日志写入）
结果：success
路径：<writtenTo.markdown>
风险：<risk>
时间戳：<iso timestamp>
```

错误处理：

- `append_audit_entry` 失败：不发送 Telegram 成功通知，直接报告失败原因。
- `append_audit_entry` 成功但通知失败：返回 `notification.ok=false` 和错误摘要。
- Telegram 通知不得包含密钥、token、JWT、私钥或长日志全文。

### 10.2 `current-context` 工具

实现文件：

```text
H:\agent\hermes\mcp\hermes-context\src\current-context-store.ts
H:\agent\hermes\mcp\hermes-context\src\notify.ts
```

目标路径：

```text
<project-root>\hermes\state\current-context.md
<project-root>\hermes\state\current-context.json
<project-root>\hermes\state\archive\*-current-context.md
```

工具：

- `write_current_context`
- `get_current_context`
- `list_current_context_versions`
- `archive_current_context`

`write_current_context` 输入包含：

```json
{
  "project": "news",
  "initiator": "cursor",
  "currentGoal": "...",
  "currentProject": "...",
  "confirmedFacts": [],
  "decisions": [],
  "completedWork": [],
  "modifiedFiles": [],
  "openRisks": [],
  "nextActions": [],
  "doNotRepeat": [],
  "minimalStartupPrompt": "...",
  "risk": "low"
}
```

写入流程：

```text
write_current_context
  -> 校验 project
  -> assertSafeContent
  -> 若 current-context.md 已存在则复制到 archive
  -> 覆盖写入 current-context.md/json
  -> notify.ts 发送 Telegram 动作通知
```

限制：

- 不写完整聊天记录。
- 单字段最大 6000 字符，数组最多 30 项。
- Hermes MCP 不推断 Cursor 隐藏上下文，只维护 Cursor 提供的结构化摘要。

### 10.3 `get_project_profile`

输入：

```json
{ "project": "news" }
```

输出：

```json
{
  "project": "news",
  "profile": "...",
  "source": "H:\\agent\\hermes\\contexts\\news\\project-profile.md"
}
```

限制：输出不超过 1200 字；项目不存在时返回明确错误。

### 10.4 `list_context_sources`

输入：

```json
{ "project": "news" }
```

输出：

```json
{
  "project": "news",
  "sources": [
    {
      "path": "supabase-lessons.md",
      "category": "lessons",
      "size": 1200
    }
  ]
}
```

### 10.5 `route_context_need`

输入：

```json
{
  "project": "news",
  "request": "模式2 R2失败为什么应该展示 Markdown？"
}
```

输出：

```json
{
  "project": "news",
  "needsContext": true,
  "reason": "...",
  "query": "Mode 2 R2 fallback Markdown",
  "category": "incidents"
}
```

路由规则：

- 命中项目名、Mode 1/2/3、Supabase、Vercel、Hermes、监控、报告 UI 时，建议检索。
- 命中“之前、又出现、回滚后、曾经修过、历史、复盘”等词时，建议检索。
- 简单问候、无项目背景的常识问题，不建议检索。

### 10.6 `search_context`

输入：

```json
{
  "project": "news",
  "query": "Mode 2 R2 fallback Markdown",
  "category": "incidents",
  "limit": 5
}
```

输出：

```json
{
  "project": "news",
  "query": "Mode 2 R2 fallback Markdown",
  "matches": [
    {
      "source": "mode2-mode3-report-pipeline.md",
      "score": 8,
      "snippet": "R2 failure should fall back to R1-2 Markdown..."
    }
  ]
}
```

检索策略：

- 第一版使用关键词匹配和简单评分。
- 只检索项目 `<project-root>\hermes` 单源目录。
- 返回 source 时使用项目内相对路径。
- 标题、文件名、一级/二级标题加权。
- 返回片段而不是全文。
- 默认 `limit=5`，最大 `limit=10`。
- 单条 snippet 默认不超过 1200 字。

### 10.7 `append_lesson`

输入：

```json
{
  "project": "news",
  "category": "incidents",
  "title": "Mode 1 production llm_configs missing",
  "content": "## Summary\n...\n## Root Cause\n...",
  "dedupe": true
}
```

写入规则：

- `category` 只允许 `profile`、`incidents`、`lessons`、`skills`。
- 文件名由标题 slug 生成。
- 追加前执行敏感信息扫描。
- 不覆盖已有文件；同名则追加时间戳。
- 支持基础重复检测，重复内容返回明确提示。
- 写入后记录 audit。

### 10.8 `sync_project_mirror`

废弃。平台化后项目上下文只写入项目自身 `hermes/` 目录，不再需要主沉淀区到项目镜像区的同步。

### 10.9 安全扫描

第一版使用规则扫描并阻断以下内容：

- `sk-`
- `service_role`
- `SUPABASE_SERVICE_ROLE`
- `TELEGRAM_BOT_TOKEN`
- `GOOGLE_API_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`
- `-----BEGIN`
- JWT 形态长 token

命中时返回 `SENSITIVE_CONTENT_BLOCKED`，不写入目标文件，audit 不记录完整敏感内容。

### 10.10 项目隔离

所有工具必须要求 `project` 参数。第一版只允许：

```text
news
```

未来扩展新项目时，需要显式加入项目配置，不允许任意路径读取。

### 10.11 find-skill Skill

实现位置：

```text
H:\agent\hermes\skills\global\find-skill\SKILL.md
```

触发条件：

- 用户问“有没有 skill”。
- 用户问“如何扩展能力”。
- 用户要求搜索、安装、评估 Skill。

执行规则：

- 先列出本地已有 Skill。
- 说明匹配度。
- 外部 Skill 只做候选推荐，不自动安装。

### 10.12 新项目接入实现

新增项目时，不修改平台路由硬编码业务关键词，而是通过项目文件提供配置。

项目 profile 示例：

```markdown
# Project Profile

## Project Key
example

## Root
H:\AIcode\Example

## Stack
...

## Context Trigger Keywords
- auth
- billing
- deployment
- rollback
- previous incident

## Key Skills
- example-debug
```

项目 Skill 示例：

```markdown
# Skill: example-debug

## Trigger
- auth failure
- billing mismatch
- deployment rollback

## Context Sources
- profile/project-profile.md
- incidents/
- lessons/
```

`route_context_need` 实现要求：

- 读取项目 profile 的 `Context Trigger Keywords`。
- 读取项目 `skills/` 中的 `Trigger` 区块。
- 合并平台通用历史关键词。
- 输出 `needsContext`、`reason`、`query`、`category`。

### 10.13 注册方式

计划注册 Hermes MCP server：

```text
hermes-context
```

运行脚本：

```text
H:\agent\hermes\mcp\hermes-context\scripts\Run-HermesContextMcp.cmd
```
