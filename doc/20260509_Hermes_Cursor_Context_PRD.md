# PRD: Hermes + Cursor 上下文沉淀体系

**版本**: v0.10  
**日期**: 2026-05-12  
**状态**: current-context + issue ledger + MCP 动作通知方案已实现  
**归属**: Hermes 独立 Agent 基础设施，服务多个 Cursor 项目

---

## 更新日志

| 日期 | 版本 | 摘要 |
| --- | --- | --- |
| 2026-05-12 | v0.10 | 增加 `issues` 进行中问题台账：提供 `upsert_issue`、`get_issue`、`list_issues`、`close_issue`，按项目写入 `<project-root>\hermes\issues\`，记录版本、时间、影响、状态、优先级和验证结论。 |
| 2026-05-12 | v0.9 | 增加 `current-context` 当前上下文快照工具；将落盘成功通知改为 `hermes-context` MCP 内部直接调用 Telegram Bot API，不再要求 Hermes 额外调用 `send_message`。 |
| 2026-05-10 | v0.8 | 增加工作日志 Telegram 通知要求：`audit-trail` Skill 在 MCP 落盘成功后调用 `send_message` 发送短摘要，不新增 Python/terminal/file/code_execution 权限。 |
| 2026-05-10 | v0.7 | 增加受限工作日志能力：不为 Hermes 开启 Python/terminal/file/code_execution 权限，由 `hermes-context` MCP 将工作日志写入 Hermes runtime 的 `audit-trail` 专用目录。 |
| 2026-05-10 | v0.6 | 增加原始 Hermes Agent 安装前置说明；确认 `HermesGatewayHealth` 通过 VBS + `wscript.exe` 隐藏窗口运行，避免交互桌面周期性弹窗。 |
| 2026-05-10 | v0.5 | 明确 Hermes 平台级 Skill、Hermes runtime Skill、项目专属 Skill 的边界；确认 `H:\agent\hermes\skills\news` 属于平台化遗留目录，应清理并以 `<project>\hermes\skills` 为项目单源。 |
| 2026-05-10 | v0.4 | 增加 `search_context` 过度召回抑制要求：过滤低价值泛词、要求有效关键词命中、返回命中词用于审计，避免无关历史污染判断。 |
| 2026-05-10 | v0.3 | 平台化调整：项目级上下文单源存放在各项目 `<project>/hermes/`，`news` 仅作为示例项目；废弃 `sync_project_mirror`；增加 `route_context_need` 与 find-skill 能力规划。 |
| 2026-05-09 | v0.2 | 增加第二阶段 `hermes-context` MCP 闭环：按项目检索上下文、写回复盘、同步项目镜像、敏感信息阻断与审计。 |
| 2026-05-09 | v0.1 | 定义 Cursor Rules、Hermes Memory、Skills + MCP、Hermes Context Docs 的分层架构和第一阶段工具启用范围。 |

---

## 1. 背景

当前 Cursor 与 Hermes 已具备基础通信能力，但还没有形成稳定的“经验沉淀 -> 按需检索 -> 反馈写回”闭环。用户希望 Hermes 的核心价值从 Telegram 通道转向结构化上下文、问题总结和经验沉淀，从而帮助 Cursor 在处理项目时减少幻觉、减少重复排障、降低上下文遗漏。

---

## 2. 目标

1. 建立 Cursor 与 Hermes 的上下文分层体系。
2. 将硬规则、短记忆、可复用能力、长历史复盘分层管理。
3. 项目级沉淀单源保存在各项目目录的 `hermes/` 下，便于随项目 Git 备份。
4. 通过 Skills + MCP 实现按需加载和按需检索，避免每次读取长文档导致 token 增加。
5. 第一阶段恢复 Hermes 必要能力：`memory`、`session_search`、`skills`、`browser`、`cronjob`，并保留 `messaging`、`task-queue`。
6. 支持未来多个项目无缝接入 Hermes 平台服务。
7. 确保 Gateway 健康守护可长期后台运行，不在交互桌面周期性弹出 CMD/PowerShell 窗口。
8. 支持 Hermes 记录工作日志，但不得为此开启 Python、terminal、file 或 code_execution 等高风险权限。
9. 工作日志写入成功后，应通过 Telegram 发送简短状态通知，方便用户即时确认。
10. 支持 `current-context` 当前上下文快照：由 Cursor 总结一手上下文，Hermes MCP 负责校验、落盘、归档、读取和通知，用于新 Cursor 会话替代旧会话上下文。
11. 支持 `issues` 进行中问题台账：记录仍未关闭或需要后续验证的问题，包含版本号、时间、影响、状态、优先级、风险、当前结论、解决方案和验证项。

---

## 3. 范围

### 3.1 本期范围

- 设计并建立文档架构。
- 明确全局级与项目级沉淀边界。
- 明确 Cursor Rules、Hermes Memory、Skills + MCP、Hermes Context Docs 的职责与优先级。
- 定义通用项目级 `hermes/` 文档目录规范，并以 `news` 作为示例项目。
- 定义第一阶段工具开启清单、验证标准和回滚路径。
- 设计 `route_context_need` 路由工具和 find-skill 能力入口。
- 补充原始 Hermes Agent 安装前置说明，明确 `hermes_aiie` 与原始 Hermes runtime 的边界。
- 将 `HermesGatewayHealth` 计划任务切换为 VBS 隐藏包装方式运行。
- 增加受限工作日志 MCP 工具，日志仅写入 `C:\Users\<user>\AppData\Local\hermes\audit-trail`。
- 更新 `audit-trail` Skill：写入日志后检查 MCP 返回的 `notification` 字段，不再额外调用 `send_message`。
- 增加 `write_current_context`、`get_current_context`、`list_current_context_versions`、`archive_current_context` 工具。
- 增加 MCP 内部动作通知：`append_audit_entry`、`append_lesson`、`write_current_context`、`archive_current_context` 落盘成功后直接通知 Telegram。
- 增加 `upsert_issue`、`get_issue`、`list_issues`、`close_issue` 工具，问题台账写入 `<project-root>\hermes\issues\`，并在写入/关闭成功后直接通知 Telegram。

### 3.2 非范围

- 不让 Hermes 直接修改接入项目代码。
- 不让 Hermes 直接部署、写数据库、执行生产操作。
- 不开启 `terminal`、`file`、`code_execution` 等高风险执行能力。
- 不默认加载全部 Hermes Context Docs。
- 不把 Telegram 作为核心需求；Telegram 只是可选入口。
- 不为了工作日志开启 Python 脚本执行能力。
- 不把 Telegram 通知作为权威日志；权威记录仍以本地 audit-trail 文件为准。
- 不让 Telegram Hermes 二次总结 Cursor 隐藏上下文；Cursor 仍是一手上下文总结者。

---

## 4. 用户价值

- Cursor 在处理项目时能先读取稳定规则与关键事实，减少凭空推断。
- 历史故障和解决方案可沉淀到项目内并随 Git 备份。
- 长文档只在 Skill 判断需要时才回溯，减少 token 浪费。
- 后续多个项目可复用全局规则、全局 Skill 和统一 MCP。
- Hermes 平台服务可独立交付，项目专属 Skill 不混入平台仓库，避免多项目上下文污染。

---

## 5. 成功标准

- 文档架构清晰区分全局级和项目级。
- `<project>/hermes/` 作为项目级上下文单源目录被纳入设计。
- 第一阶段 Hermes 必要工具可开启并验证。
- Cursor 不会默认读取长复盘文档。
- 冲突时 Cursor Rules 优先于 Hermes 历史沉淀。
- 出现性能或行为异常时可回滚到当前瘦身状态。
- `HermesGatewayHealth` 每分钟健康检查不再在桌面弹出可见窗口。
- Hermes 可通过 MCP 写入和读取工作日志，且日志工具不能访问任意文件路径。
- Hermes 完成一次工作日志写入后，可在 Telegram 收到一条短通知；通知失败时应明确说明“日志已落盘但通知失败”。

---

## 6. 第二阶段目标：Hermes Context MCP 闭环

第一阶段已完成工具启用、上下文文档骨架、项目镜像目录和 Skill 草案。第二阶段目标是把“Skills + MCP 检索/写回沉淀内容”从文档约定升级为正式工具闭环。

闭环目标：

```text
Cursor Rules
  -> Skill 判断任务类型
  -> hermes-context MCP 检索项目上下文
  -> Cursor 使用相关片段处理任务
  -> 问题解决后 hermes-context MCP 写回复盘
  -> 同步到项目镜像目录
```

### 6.1 第二阶段范围

- 开发本地 `hermes-context` MCP server。
- 支持按项目读取短 profile。
- 支持列出上下文源。
- 支持关键词检索项目 Context Docs。
- 支持追加经验、故障复盘或短总结。
- 支持将项目级内容直接写入对应项目的 `hermes/` 目录。
- 支持先通过 `route_context_need` 判断是否需要检索上下文。
- 支持 `search_context` 过度召回抑制，避免仅因 `context/project/test/history` 等泛词命中而返回无关历史。
- 支持基础敏感信息扫描和写入审计。

### 6.2 第二阶段非范围

- 不自动修改业务代码。
- 不执行数据库写入。
- 不部署前端、后端或数据库。
- 不接入外部云记忆服务。
- 不做复杂向量检索；第一版使用本地文件关键词检索。
- 不默认读取全部历史文档。

### 6.3 第二阶段成功标准

- `get_project_profile` 能按项目配置返回项目短摘要。
- `list_context_sources` 能列出目标项目可用上下文文件。
- `search_context` 能根据关键词返回相关片段，而非全文。
- `search_context` 对无匹配、仅泛词、泛词+随机词应返回空结果，并在有效命中时返回命中词供审计。
- `route_context_need` 能判断是否需要检索上下文，并给出建议 query/category。
- `append_lesson` 能直接写入项目 `hermes/` 目录。
- `sync_project_mirror` 被废弃，不作为正常能力。
- 写入时能阻断明显密钥内容。
- 误操作可回滚到仅文档骨架状态。

---

## 7. 平台化定位

Hermes 服务本身不保存具体项目的长历史。平台层只保存：

- 全局文档。
- 全局 Memory。
- 全局 Skills。
- MCP 服务代码与审计日志。
- 项目注册配置。
- 平台级通用自定义 Skill。

每个接入项目保存自己的上下文：

```text
<project-root>\hermes\
  README.md
  profile\
  incidents\
  lessons\
  skills\
```

`news` 是当前第一个示例项目，不应写死为平台唯一项目。后续新增项目时，只需要新增项目配置并在项目根目录创建 `hermes/` 目录。

### 7.1 Skill 目录边界

Hermes Skill 分三类：

```text
C:\Users\<user>\AppData\Local\hermes\skills\
```

Hermes runtime Skill 安装目录。Hermes 官方/内置 Skill 和已安装的自定义通用 Skill 可在此运行。该目录是本机运行目录，不作为 `hermes_aiie` 的源码单源。

```text
H:\agent\hermes\skills\
```

Hermes AIIE 平台级自定义 Skill 源码目录。只保存可跨项目复用的通用 Skill，例如 `global`、`software-development` 类能力。该目录进入 `hermes_aiie` Git，并可通过安装/同步脚本安装到 runtime 目录。

```text
<project-root>\hermes\skills\
```

项目专属 Skill/流程说明目录。仅保存该项目的上下文触发、排障流程和经验规则，随项目 Git 管理。默认不安装到 Hermes runtime，避免多个项目的专属流程污染 Hermes 全局 Skill 空间。

边界要求：

- `H:\agent\hermes\skills\news` 属于平台化前遗留目录，不应继续保留。
- `news` 项目专属 Skill 单源应为 `H:\AIcode\Trae\news\hermes\skills`。
- 后续安装/同步脚本只同步平台级白名单目录，例如 `global`、`software-development`。
- 后续安装/同步脚本不得同步 `news`、`<project>\hermes\skills` 或其他项目专属目录。
