# SDD: Hermes + Cursor 上下文沉淀体系概要设计

**版本**: v0.2  
**日期**: 2026-05-09  
**状态**: 已确认，待开发

---

## 更新日志

| 日期 | 版本 | 摘要 |
| --- | --- | --- |
| 2026-05-09 | v0.2 | 增加 `hermes-context` MCP 概要设计：工具清单、检索流、写回流、安全边界、审计与 Skill 协作关系。 |
| 2026-05-09 | v0.1 | 定义全局能力 + 项目级沉淀的混合架构。 |

---

## 1. 总体架构

采用“全局能力 + 项目级沉淀”的混合架构。

```text
Cursor Rules
  -> Hermes Memory
  -> Skills + MCP
  -> Hermes Context Docs
```

核心原则：

- 硬规则优先。
- 短事实常驻。
- 流程能力按需加载。
- 长历史按需检索。
- 项目级内容双写：Hermes 独立目录 + 项目 Git 目录。

---

## 2. 文档架构

### 2.1 Hermes 全局文档区

```text
H:\agent\hermes\
  doc\
    20260509_Hermes_Cursor_Context_PRD.md
    20260509_Hermes_Cursor_Context_SDD.md
    20260509_Hermes_Cursor_Context_TDD.md
    20260509_Hermes_Cursor_Context_Test_And_Rollback.md

  memory\
    global-user-profile.md
    global-stable-facts.md

  contexts\
    news\
      project-profile.md
      incident-log.md
      deployment-lessons.md
      supabase-lessons.md
      hermes-lessons.md

  skills\
    global\
      context-recall\
      incident-review\
      mcp-safety-review

    news\
      news-pipeline-debug
      supabase-prod-staging-check
      report-ui-regression-check

  mcp\
    hermes-context\
      search_context
      append_lesson
      get_project_profile
      list_context_sources
```

### 2.2 `news` 项目级镜像文档区

项目级沉淀需要同步到 `news` 项目目录，便于随 Git 备份。

```text
H:\AIcode\Trae\news\
  hermes\
    README.md

    profile\
      project-profile.md
      project-rules-summary.md

    incidents\
      mode1-analysis-ticker.md
      mode2-mode3-report-pipeline.md
      supabase-prod-staging.md
      vercel-deployment.md
      hermes-gateway.md

    lessons\
      database-migration-lessons.md
      monitoring-lessons.md
      report-ui-lessons.md
      cursor-collaboration-lessons.md

    skills\
      news-pipeline-debug.md
      supabase-prod-staging-check.md
      report-ui-regression-check.md
```

说明：

- `H:\agent\hermes\contexts\news\` 是 Hermes 主沉淀区。
- `H:\AIcode\Trae\news\hermes\` 是项目镜像区，可被 Git 备份。
- 两侧内容可以不完全一致，但关键复盘、项目事实和项目专属 Skill 必须同步。

---

## 3. 分层职责

### 3.1 Cursor Rules

职责：硬规则、门禁、优先级、安全边界。

特点：

- 优先级最高。
- 不记录长历史。
- 不被 Hermes Memory 或 Context Docs 覆盖。

### 3.2 Hermes Memory

职责：短小关键偏好和稳定事实。

适合内容：

- 用户偏好。
- 长期有效的项目事实。
- 工具环境稳定约束。

不适合内容：

- 长日志。
- 一次性排障过程。
- 大段文档。

### 3.3 Skills + MCP

职责：可复用流程能力 + 按需检索/写回通道。

Skill 负责：

- 判断任务类型。
- 决定是否需要读取历史。
- 定义输出结构。
- 规定何时写回复盘。

MCP 负责：

- 检索 Hermes Context Docs。
- 返回相关片段。
- 写回新经验。
- 列出当前项目可用上下文源。

### 3.4 Hermes Context Docs

职责：较长的项目历史、故障复盘、详细经验。

加载策略：

- 默认不加载。
- 仅由 Skill 或 MCP 判断需要时检索。
- 每次只返回相关片段，不返回全文。

---

## 4. 第一阶段 Hermes 工具清单

开启：

- `memory`
- `session_search`
- `skills`
- `browser`
- `cronjob`
- `messaging`
- `task-queue`

暂不开启：

- `terminal`
- `file`
- `code_execution`
- `delegation`
- `moa`
- `image_gen`
- `tts`
- `rl`

原因：第一阶段目标是上下文沉淀和辅助检索，不是让 Hermes 直接执行代码或系统命令。

---

## 5. 优先级规则

冲突时按以下顺序执行：

1. 系统/开发者/用户当前明确指令。
2. Cursor Rules。
3. 项目级 Cursor Rules、AGENTS 或 agents 指令。
4. Hermes Memory。
5. Skills + MCP 检索结果。
6. Hermes Context Docs 历史内容。
7. 模型推断。

如 Hermes 历史内容与高优先级规则冲突，必须提示冲突并执行高优先级规则。

---

## 6. 第二阶段架构：`hermes-context` MCP

`hermes-context` 是本地 MCP server，负责把 Hermes 上下文沉淀目录暴露为安全、可检索、可写回的工具接口。

```text
Cursor / Hermes Agent
  -> Skill 判断任务类型
  -> MCP Tool Call
  -> hermes-context MCP
  -> H:\agent\hermes\contexts\<project>
  -> H:\AIcode\Trae\<project>\hermes
```

设计原则：

- 只读优先。
- 按项目隔离。
- 默认返回片段，不返回全文。
- 写入必须审计。
- 项目镜像同步不自动提交 Git。

### 6.1 项目配置

第一版内置静态项目配置：

```json
{
  "news": {
    "contextRoot": "H:\\agent\\hermes\\contexts\\news",
    "mirrorRoot": "H:\\AIcode\\Trae\\news\\hermes",
    "profileFile": "project-profile.md"
  }
}
```

后续可迁移为 `projects.json`。

### 6.2 MCP 工具

- `get_project_profile`：返回项目短摘要，适合任务早期读取。
- `list_context_sources`：列出某项目可检索的上下文文档。
- `search_context`：按项目、关键词、类别检索相关上下文片段。
- `append_lesson`：追加经验、故障复盘或短总结到指定项目上下文文档。
- `sync_project_mirror`：将 Hermes 主沉淀目录中适合备份的内容同步到项目镜像目录。

`search_context` 的检索范围包括：

- Hermes 主沉淀区：`H:\agent\hermes\contexts\<project>`
- 项目镜像区：`H:\AIcode\Trae\<project>\hermes`

返回结果需标记来源前缀：`context:` 或 `mirror:`。

### 6.3 检索流

```text
用户请求
  -> Skill 命中
  -> 调用 search_context(project, query, category)
  -> MCP 扫描项目 Context Docs
  -> 返回 top N 片段
  -> Cursor 结合当前代码判断
```

### 6.4 写回流

```text
问题解决
  -> Cursor 生成结构化复盘
  -> 调用 append_lesson
  -> MCP 扫描敏感信息
  -> 写入主沉淀目录
  -> 记录 audit log
  -> 如需要，调用 sync_project_mirror
```

### 6.5 安全边界

允许：

- 读取 Hermes 上下文文档。
- 写入 Hermes 上下文文档。
- 同步项目镜像文档。

禁止：

- 执行业务代码。
- 删除文件。
- 写数据库。
- 部署。
- 自动 Git commit 或 push。
- 写入明显密钥。

### 6.6 审计

审计日志建议位置：

```text
H:\agent\hermes\logs\hermes-context-mcp.jsonl
```

每条记录包含时间、工具名、project、输入摘要、写入目标、命中源、结果状态和错误摘要。

### 6.7 与 Skill 的关系

Skill 和 MCP 共同组成按需加载能力：

- Skill 负责判断何时需要上下文、读什么、怎么用。
- MCP 负责读取、检索和写回上下文。
