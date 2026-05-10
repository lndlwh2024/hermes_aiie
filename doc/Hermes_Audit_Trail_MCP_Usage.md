# Hermes 工作日志 MCP 使用与测试说明

**适用对象**：Telegram 侧 Hermes Agent  
**目标**：验证 Hermes 可以记录、读取、汇总工作日志，且不需要 Python、terminal、file、code_execution 权限。

---

## 1. 核心原则

- 不申请 Python 权限。
- 不申请 terminal 权限。
- 不申请 file 权限。
- 不申请 code_execution 权限。
- 只通过 `hermes-context` MCP 的受限工作日志工具落盘。
- 工作日志落盘成功后，使用 `send_message` 给当前 Telegram 发送短摘要。
- Telegram 通知不是权威记录，权威记录以本地 audit-trail 文件为准。
- 工作日志只保存到 Hermes runtime 目录：

```text
C:\Users\<user>\AppData\Local\hermes\audit-trail
```

---

## 2. 可用工具

### 2.1 `mcp_hermes_context_append_audit_entry`

用途：追加一条工作日志。

参数：

```json
{
  "scope": "project",
  "project": "news",
  "actionType": "verification",
  "target": "audit-trail MCP",
  "summary": "验证 Hermes 工作日志 MCP 是否可用。",
  "result": "已调用 MCP 追加工作日志。",
  "risk": "low",
  "evidence": "Telegram Hermes manual test",
  "followUp": "none"
}
```

字段说明：

- `scope`: `project` 或 `global`。
- `project`: 当 `scope=project` 时必填，例如 `news`。
- `actionType`: 只能是 `analysis`、`doc_update`、`code_change`、`test`、`config_change`、`verification`、`rollback`、`other`。
- `target`: 影响对象，例如文件、文档、服务、子系统。
- `summary`: 一句话概括动作。
- `result`: 结果和证据。
- `risk`: `low`、`medium`、`high`。
- `evidence`: 日志、测试、用户确认、命令结果等。
- `followUp`: 后续动作，没有则写 `none`。

成功标准：

- 返回 `ok=true`。
- 返回 `writtenTo.markdown` 和 `writtenTo.jsonl`。
- 路径应在：

```text
C:\Users\<user>\AppData\Local\hermes\audit-trail\projects\news\
```

写入成功后，应继续调用 `send_message`，向当前 Telegram 发送短摘要。

推荐消息：

```text
工作日志已记录

项目：news
类型：verification
目标：audit-trail MCP
结果：已调用 MCP 追加工作日志
风险：low
路径：<writtenTo.markdown>
```

如果 `append_audit_entry` 成功但 `send_message` 失败，请明确回复：

```text
工作日志已落盘，但 Telegram 通知失败。
错误：<原始错误文本>
路径：<writtenTo.markdown>
```

### 2.2 `mcp_hermes_context_list_audit_entries`

用途：读取某一天的工作日志。

参数：

```json
{
  "scope": "project",
  "project": "news",
  "date": "2026-05-10",
  "limit": 20
}
```

成功标准：

- 返回 `entries` 数组。
- 能看到刚才写入的 `summary`。

### 2.3 `mcp_hermes_context_summarize_daily_audit`

用途：汇总某一天的工作日志。

参数：

```json
{
  "scope": "project",
  "project": "news",
  "date": "2026-05-10"
}
```

成功标准：

- 返回 `total >= 1`。
- `byActionType.verification >= 1`。
- 如果存在 `followUp != none`，应出现在 `unresolvedFollowUps`。

---

## 3. 全局日志测试

如果记录 Hermes 平台自身工作，而不是某个项目：

```json
{
  "scope": "global",
  "actionType": "verification",
  "target": "Hermes platform audit trail",
  "summary": "验证全局工作日志是否可写入。",
  "result": "MCP 返回 ok=true。",
  "risk": "low",
  "evidence": "Telegram Hermes manual test",
  "followUp": "none"
}
```

成功路径应在：

```text
C:\Users\<user>\AppData\Local\hermes\audit-trail\global\
```

---

## 4. 安全测试

### 4.1 敏感内容阻断

敏感阻断测试必须把阻断样本原样放入 MCP 参数中，不能改写成“包含敏感信息”“测试敏感内容”等普通描述，否则不会触发阻断规则。

调用 `mcp_hermes_context_append_audit_entry`，参数如下：

```json
{
  "scope": "project",
  "project": "news",
  "actionType": "verification",
  "target": "sensitive content block test",
  "summary": "测试敏感内容阻断。",
  "result": "GOOGLE_API_KEY=abc123",
  "risk": "low",
  "evidence": "Telegram Hermes manual test",
  "followUp": "none"
}
```

预期：

- 工具应拒绝写入。
- 返回错误包含 `SENSITIVE_CONTENT_BLOCKED`。
- 不应在 `audit-trail\projects\news\YYYY-MM-DD.md` 或 `.jsonl` 中新增这条记录。

错误示例：

```json
{
  "summary": "测试敏感内容阻断。",
  "result": "包含敏感信息。"
}
```

这个错误示例不会触发阻断，因为它没有包含任何真实阻断模式，只是普通中文描述。

### 4.2 Telegram 通知安全

通知内容必须是短摘要，不得包含：

- 密钥。
- token。
- JWT。
- 私钥。
- cookie。
- 长日志全文。

如果日志内容包含敏感信息并被 MCP 阻断，不要调用 `send_message` 发送“记录成功”通知，只能报告阻断结果。

### 4.3 非法项目名阻断

尝试：

```json
{
  "scope": "project",
  "project": "..\\..",
  "actionType": "verification",
  "target": "path safety",
  "summary": "测试非法 project。",
  "result": "应被拒绝。",
  "risk": "low"
}
```

预期：

- 工具拒绝写入。
- 返回 `PROJECT_INVALID`。

---

## 5. 禁止事项

测试时不要做以下动作：

- 不要请求开启 Python。
- 不要请求开启 terminal。
- 不要请求开启 file。
- 不要请求开启 code_execution。
- 不要尝试读取或写入任意路径。
- 不要把密钥、token、JWT、私钥写入日志。
- 不要创建 cron job 来替代 MCP 写日志。

---

## 6. 推荐测试顺序

1. 调用 `append_audit_entry` 写入一条 `project=news` 的 `verification` 记录。
2. 写入成功后调用 `send_message`，给当前 Telegram 发送“工作日志已记录”的短摘要。
3. 调用 `list_audit_entries` 确认记录存在。
4. 调用 `summarize_daily_audit` 确认统计正确。
5. 调用 `append_audit_entry scope=global` 写入一条全局记录。
6. 调用敏感内容测试，确认被阻断，且不发送成功通知。
7. 调用非法项目名测试，确认被阻断。

测试完成后，请输出：

- 成功调用了哪些工具。
- 写入路径是否位于 `AppData\Local\hermes\audit-trail`。
- Telegram 是否收到短通知。
- 如通知失败，完整错误是什么，日志是否已落盘。
- 是否出现要求 Python/terminal/file/code_execution 的情况。
- 敏感内容是否使用了 `GOOGLE_API_KEY=abc123` 原样样本，并确认被阻断。
- 非法项目名是否被阻断。
