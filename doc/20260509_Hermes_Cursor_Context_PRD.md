# PRD: Hermes + Cursor 上下文沉淀体系

**版本**: v0.2  
**日期**: 2026-05-09  
**状态**: 已确认，待开发  
**归属**: Hermes 独立 Agent 基础设施，服务多个 Cursor 项目

---

## 更新日志

| 日期 | 版本 | 摘要 |
| --- | --- | --- |
| 2026-05-09 | v0.2 | 增加第二阶段 `hermes-context` MCP 闭环：按项目检索上下文、写回复盘、同步项目镜像、敏感信息阻断与审计。 |
| 2026-05-09 | v0.1 | 定义 Cursor Rules、Hermes Memory、Skills + MCP、Hermes Context Docs 的分层架构和第一阶段工具启用范围。 |

---

## 1. 背景

当前 Cursor 与 Hermes 已具备基础通信能力，但还没有形成稳定的“经验沉淀 -> 按需检索 -> 反馈写回”闭环。用户希望 Hermes 的核心价值从 Telegram 通道转向结构化上下文、问题总结和经验沉淀，从而帮助 Cursor 在处理项目时减少幻觉、减少重复排障、降低上下文遗漏。

---

## 2. 目标

1. 建立 Cursor 与 Hermes 的上下文分层体系。
2. 将硬规则、短记忆、可复用能力、长历史复盘分层管理。
3. 项目级沉淀既保存在 Hermes 独立目录，也同步到项目目录，便于随 Git 备份。
4. 通过 Skills + MCP 实现按需加载和按需检索，避免每次读取长文档导致 token 增加。
5. 第一阶段恢复 Hermes 必要能力：`memory`、`session_search`、`skills`、`browser`、`cronjob`，并保留 `messaging`、`task-queue`。

---

## 3. 范围

### 3.1 本期范围

- 设计并建立文档架构。
- 明确全局级与项目级沉淀边界。
- 明确 Cursor Rules、Hermes Memory、Skills + MCP、Hermes Context Docs 的职责与优先级。
- 定义 `news` 项目级文档镜像目录结构。
- 定义第一阶段工具开启清单、验证标准和回滚路径。

### 3.2 非范围

- 不让 Hermes 直接修改 `news` 项目代码。
- 不让 Hermes 直接部署、写数据库、执行生产操作。
- 不开启 `terminal`、`file`、`code_execution` 等高风险执行能力。
- 不默认加载全部 Hermes Context Docs。
- 不把 Telegram 作为核心需求；Telegram 只是可选入口。

---

## 4. 用户价值

- Cursor 在处理项目时能先读取稳定规则与关键事实，减少凭空推断。
- 历史故障和解决方案可沉淀到项目内并随 Git 备份。
- 长文档只在 Skill 判断需要时才回溯，减少 token 浪费。
- 后续多个项目可复用全局规则、全局 Skill 和统一 MCP。

---

## 5. 成功标准

- 文档架构清晰区分全局级和项目级。
- `news/hermes/` 作为项目级沉淀镜像目录被纳入设计。
- 第一阶段 Hermes 必要工具可开启并验证。
- Cursor 不会默认读取长复盘文档。
- 冲突时 Cursor Rules 优先于 Hermes 历史沉淀。
- 出现性能或行为异常时可回滚到当前瘦身状态。

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
- 支持将项目级内容同步到 `news/hermes` 镜像目录。
- 支持基础敏感信息扫描和写入审计。

### 6.2 第二阶段非范围

- 不自动修改业务代码。
- 不执行数据库写入。
- 不部署前端、后端或数据库。
- 不接入外部云记忆服务。
- 不做复杂向量检索；第一版使用本地文件关键词检索。
- 不默认读取全部历史文档。

### 6.3 第二阶段成功标准

- `get_project_profile` 能返回 `news` 项目短摘要。
- `list_context_sources` 能列出 `news` 可用上下文文件。
- `search_context` 能根据关键词返回相关片段，而非全文。
- `append_lesson` 能写入 Hermes 主沉淀区。
- `sync_project_mirror` 能将项目级文档同步到 `H:\AIcode\Trae\news\hermes`。
- 写入时能阻断明显密钥内容。
- 误操作可回滚到仅文档骨架状态。
