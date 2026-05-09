# 测试与回滚: Hermes + Cursor 上下文沉淀体系

**版本**: v0.5  
**日期**: 2026-05-10  
**状态**: 过度召回抑制与 Gateway 守护验证已实现

---

## 更新日志

| 日期 | 版本 | 摘要 |
| --- | --- | --- |
| 2026-05-10 | v0.5 | 增加 Hermes Gateway 守护验证：真实子进程检查、wrapper 自动拉起、`HermesGatewayHealth` 健康任务和回滚步骤。 |
| 2026-05-10 | v0.4 | 增加 `search_context` 过度召回测试：无匹配词、仅泛词、泛词+随机词必须返回空数组；真实关键词仍应命中。 |
| 2026-05-10 | v0.3 | 平台化测试调整：项目上下文单源在 `<project>/hermes/`；废弃 `sync_project_mirror`；增加 `route_context_need`、find-skill、Cursor 侧与 Telegram 侧完整测试矩阵。 |
| 2026-05-09 | v0.2 | 增加 `hermes-context` MCP 测试与回滚：工具发现、profile、sources、search、append、mirror、安全阻断、性能与禁用回滚。 |
| 2026-05-09 | v0.1 | 定义第一阶段工具启用、Memory、Session Search、Skills、Browser、Cronjob、项目镜像和性能验证。 |

---

## 1. 验证目标

验证第一阶段配置与文档体系是否满足以下目标：

- Hermes 必要工具开启。
- Telegram/Gateway 通道不明显劣化。
- Cursor 不默认读取长历史。
- Skill 可作为调度入口。
- MCP 后续可按需检索和写回上下文。
- 项目级文档单源存放在 `<project>/hermes/` 并随项目 Git 备份。

---

## 2. 工具启用验证

### 2.1 预期启用项

```text
clarify
messaging
memory
session_search
skills
browser
cronjob
task-queue MCP
```

### 2.2 预期禁用项

```text
terminal
file
code_execution
delegation
moa
image_gen
tts
rl
```

### 2.3 通过标准

- Hermes 工具列表显示目标启用项为 enabled。
- `task-queue` MCP 保持 enabled。
- 未启用高风险执行工具。

---

## 3. Memory 验证

测试内容：

1. 写入一条短用户偏好。
2. 新会话中确认该偏好可被注入或检索。
3. 写入超长内容应被拒绝或要求压缩。

通过标准：

- 短事实可保留。
- 长复盘不进入 Memory。
- 不写入密钥或敏感信息。

---

## 4. Session Search 验证

测试内容：

1. 查询近期 Hermes/Gemini 慢响应排障记录。
2. 查询不存在的问题。

通过标准：

- 存在记录时返回相关摘要。
- 不存在记录时明确说明未找到，不编造。

---

## 5. Skills 验证

测试内容：

1. 创建或登记一个 `news-pipeline-debug` Skill 设计稿。
2. 用 Mode 1 或 Supabase 故障描述触发。
3. 验证 Skill 只加载必要流程，不读取全部历史。

通过标准：

- Skill 能识别任务类型。
- Skill 能说明需要读取哪些上下文。
- Skill 不直接执行高风险动作。

---

## 6. Browser 验证

测试内容：

1. 请求 Hermes 读取公开文档页面。
2. 禁止其提交表单、登录后台或执行风险操作。

通过标准：

- 可读取公开网页。
- 不执行写操作。
- 响应时间无明显异常。

---

## 7. Cronjob 验证

测试内容：

1. 创建一个低风险提醒类任务设计。
2. 验证不会执行部署、数据库写入或代码修改。

通过标准：

- Cronjob 仅用于提醒或低风险维护。
- 不触发高风险动作。

---

## 8. 项目镜像目录验证

目标目录：

```text
H:\AIcode\Trae\news\hermes\
```

测试内容：

1. 创建 `README.md` 和 `profile/project-profile.md`。
2. 创建一条故障复盘文档。
3. 确认可被 Git 识别为项目文件。

通过标准：

- 文档目录结构清晰。
- 不包含密钥。
- 可随 Git 备份，但不自动提交。

---

## 9. 性能验证

测试内容：

1. 发送简单 Telegram 问候。
2. 发送一个需要 Skill 判断的问题。
3. 发送一个需要历史检索的问题。

通过标准：

- 简单问候不因长历史读取显著变慢。
- Skill 判断类请求不默认读取全部 Context Docs。
- 需要历史检索时只返回相关片段。

---

## 10. 回滚方案

如出现响应明显变慢、工具误触发或上下文污染，按以下顺序回滚：

1. 关闭 `browser`。
2. 关闭 `cronjob`。
3. 关闭 `skills`。
4. 关闭后续新增的 `hermes-context` MCP。
5. 保留 `memory`、`session_search`、`messaging`、`task-queue`。
6. 如仍异常，恢复到当前瘦身状态：

```text
enabled:
  clarify
  messaging
  task-queue MCP

disabled:
  web
  browser
  terminal
  file
  code_execution
  vision
  image_gen
  moa
  tts
  skills
  todo
  memory
  session_search
  delegation
  cronjob
  rl
  homeassistant
```

---

## 11. 放行标准

进入开发/配置实施前，必须满足：

- 用户确认 PRD。
- 用户确认概要设计。
- 用户确认详细设计。
- 用户确认测试与回滚方案。
- 用户明确输入放行口令。

---

## 12. 第二阶段 `hermes-context` MCP 验证

### 12.1 基础启动测试

类型检查：

```text
npm run typecheck
```

MCP 启动测试：

```text
hermes mcp test hermes-context
```

预期发现工具：

- `get_project_profile`
- `list_context_sources`
- `route_context_need`
- `search_context`
- `append_lesson`

### 12.2 `get_project_profile`

输入：

```json
{ "project": "news" }
```

期望：

- 返回 `news` 项目摘要。
- 输出长度不超过 1200 字。
- 包含 source 路径。

### 12.3 `list_context_sources`

输入：

```json
{ "project": "news" }
```

期望：

- 返回 `project-profile.md`、`supabase-lessons.md`、`hermes-lessons.md` 等文件。
- 不返回项目外路径。

### 12.4 `route_context_need`

输入：

```json
{
  "project": "news",
  "request": "模式2 R2失败为什么应该展示 Markdown？"
}
```

期望：

- `needsContext=true`。
- 返回推荐 query 和 category。

### 12.5 `search_context`

输入：

```json
{
  "project": "news",
  "query": "R2 failure fallback Markdown",
  "limit": 5
}
```

期望：

- 返回和 Mode 2/3 fallback 相关片段。
- 不返回全文。
- 无匹配时返回空数组。
- 返回 `matchedTerms` 和 `ignoredTerms`，用于审计命中原因。
- 仅命中 `context/project/history/test` 等泛词时返回空数组。

过度召回回归用例：

| 用例 | query | 期望 |
| --- | --- | --- |
| 无匹配随机词 | `zzzxxyyqqq998877` | `matches=[]` |
| 仅英文泛词 | `context project history test` | `matches=[]` |
| 泛词 + 随机词 | `zzzxxyy-no-such-context-998877` | `matches=[]` |
| 仅中文泛词 | `上下文 项目 测试 历史` | `matches=[]` |
| 真实报告链路 | `R2 failure fallback Markdown` | 命中报告链路相关文档 |
| 单词弱命中 | `R2 failure fallback Markdown` | 不返回仅命中 `failure` 的弱相关文档 |

### 12.6 `append_lesson`

输入：

```json
{
  "project": "news",
  "category": "lessons",
  "title": "Test lesson",
  "content": "## Summary\nThis is a test lesson."
}
```

期望：

- 写入 `H:\AIcode\Trae\news\hermes\lessons`。
- 生成 audit 记录。

### 12.7 `sync_project_mirror`

该工具已废弃。测试目标是确认工具列表中不再出现该工具，或调用时返回废弃说明。

---

## 13. 第二阶段安全测试

### 13.1 密钥阻断

输入内容包含：

```text
GOOGLE_API_KEY=...
```

期望：

- `append_lesson` 返回 `SENSITIVE_CONTENT_BLOCKED`。
- 不写入目标文件。
- audit 不记录完整密钥。

### 13.2 越权路径阻断

输入：

```json
{ "project": "..\\.." }
```

期望：

- 返回 `PROJECT_NOT_ALLOWED`。
- 不读取任意路径。

### 13.3 高风险动作阻断

确认 MCP 不提供以下工具：

- command execution
- file deletion
- database write
- deploy
- git commit
- git push

---

## 14. 第二阶段性能测试

- `get_project_profile` 应快速返回。
- `search_context` 在 `news` 当前文档规模下应在 1 秒内返回。
- 返回内容应按 `limit` 和 snippet 长度裁剪。
- 简单请求不触发 `search_context`。

---

## 15. Cursor 侧完整测试矩阵

1. MCP 注册状态：确认 `hermes-context` 与 `task-queue` enabled。
2. 类型检查：`npm run typecheck` 通过。
3. 项目 profile：`get_project_profile project=news` 返回 `news/hermes/profile/project-profile.md` 内容。
4. 上下文源：`list_context_sources project=news` 只返回项目 `hermes/` 文件。
5. 路由判断：`route_context_need` 对 Mode/Supabase/Vercel/Hermes/历史关键词返回 `needsContext=true`。
6. 简单问候路由：`route_context_need request=你好` 返回 `needsContext=false`。
7. 上下文检索：`search_context query="R2 failure fallback Markdown"` 命中 `incidents/mode2-mode3-report-pipeline.md`，并返回 `matchedTerms`。
8. 空结果检索：随机字符串、仅泛词、泛词+随机词均返回空数组，不编造。
9. 写回经验：`append_lesson category=lessons` 写入项目 `hermes/lessons`。
10. 写回后检索：用标题关键词能检索到刚写入内容。
11. 重复写入：重复 title/content 返回去重提示或生成明确结果。
12. 敏感阻断：`GOOGLE_API_KEY=...` 被 `SENSITIVE_CONTENT_BLOCKED` 阻断。
13. 越权项目：`project=../../` 返回 `PROJECT_NOT_ALLOWED`。
14. 审计日志：记录工具名、project、状态，不记录密钥。
15. Git 状态：项目 `hermes/` 只出现预期文档，不出现运行数据或密钥。

---

## 16. Telegram Hermes 侧完整测试矩阵

1. 队列入站：调用 `queue_create_task`，返回 task id。
2. 队列读取：调用 `queue_list_tasks limit=5`，能看到刚写入任务。
3. 项目 profile：调用 `mcp_hermes_context_get_project_profile project=news`。
4. 上下文源：调用 `mcp_hermes_context_list_context_sources project=news`。
5. 路由判断：调用 `mcp_hermes_context_route_context_need`，验证历史类问题返回 `needsContext=true`。
6. 简单问候：验证 `route_context_need` 返回 `needsContext=false`，不触发 search。
7. 历史检索：调用 `search_context query="Mode 1 active LLM configuration"`。
8. UI 回归检索：调用 `search_context query="report UI JSON Markdown fallback"`。
9. 安全写回：调用 `append_lesson` 写入普通测试经验。
10. 写回后检索：用标题关键词检索刚写入内容。
11. 敏感阻断：`TELEGRAM_BOT_TOKEN=xxx` 被阻断。
12. 非法项目：`project=other_project` 被拒绝。
13. Skill 软触发测试：直接问“模式2 R2失败为什么展示 Markdown”，观察 Hermes 是否主动调用 route/search。
14. find-skill 测试：询问“有没有用于 Supabase 排障的 skill”，验证能列出或推荐相关 Skill。

测试顺序建议：

- 先 Cursor 本地确定性测试。
- 再 Telegram 端到端测试。
- 读类测试可并行；写回类测试应串行，并使用唯一 title。

---

## 17. 第二阶段回滚方案

如开发后出现错误或性能问题，按以下顺序回滚：

### 17.1 Hermes Gateway 守护回滚

如果 `HermesGatewayHealth` 或加固后的 wrapper 引入异常：

1. 停止健康任务：

```powershell
Disable-ScheduledTask -TaskName HermesGatewayHealth
```

2. 停止 Gateway 任务：

```powershell
Stop-ScheduledTask -TaskName HermesGateway
```

3. 将 `C:\Users\lndlw\AppData\Local\hermes\scripts\Start-HermesGateway.ps1` 回退到修改前版本，或临时改回仅执行 `hermes gateway run` 的最小循环。
4. 重新启动 Gateway：

```powershell
Start-ScheduledTask -TaskName HermesGateway
```

守护验证标准：

- `HermesGateway` 任务为 `Running`。
- 进程树中存在真实 `hermes gateway run` 子进程。
- `agent.log` 出现 `Connected to Telegram (polling mode)`。
- 人为停止 Gateway 子进程后，wrapper 能在约 10 秒后拉起新子进程。
- `Check-HermesGatewayHealth.ps1` 正常状态返回 `0`，异常状态会记录 `gateway-health.log` 并请求重启任务。

### 17.2 hermes-context MCP 回滚

1. 在 Hermes 中禁用 `hermes-context` MCP。
2. 停止 `Run-HermesContextMcp.cmd` 相关进程。
3. 保留已生成的文档，不删除历史沉淀。
4. 如写入了测试文档，删除测试文件。
5. 恢复到第一阶段状态：仅使用文档骨架、Skill 草案、`task-queue` MCP。
6. 如已写入测试文档，从对应项目 `hermes/` 目录删除测试文件。

不需要回滚第一阶段工具，除非确认它们造成性能或安全问题。
