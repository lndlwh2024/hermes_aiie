# TDD: Hermes + Cursor 上下文沉淀体系详细设计

**版本**: v0.2  
**日期**: 2026-05-09  
**状态**: 已确认，待开发

---

## 更新日志

| 日期 | 版本 | 摘要 |
| --- | --- | --- |
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
  -> 如命中，由 Skill 决定是否通过 MCP 检索 Context Docs
  -> Cursor 执行分析或开发
  -> 如产生可复用经验，写回 Hermes Context Docs 或 Memory
```

### 1.2 长历史读取路径

```text
任务触发 Skill
  -> Skill 识别项目与问题类型
  -> MCP search_context(project, topic, query)
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
Project news uses Supabase Edge Functions and separates staging/production.
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
# Skill: news-pipeline-debug

## 触发条件
## 前置读取
## 排查流程
## 禁止事项
## 写回规则
```

---

## 3. MCP 接口设计

### 3.1 `search_context`

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
      "source": "contexts/news/supabase-lessons.md",
      "title": "Mode 1 production llm_configs missing",
      "summary": "生产环境缺少 active LLM config 导致 analysis-ticker 500。",
      "snippet": "..."
    }
  ]
}
```

### 3.2 `append_lesson`

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

- 默认写入 Hermes 主沉淀区。
- 项目级内容需要同步到项目镜像目录。
- 写入前做敏感信息扫描。

### 3.3 `get_project_profile`

用途：读取项目极短摘要。

输出应控制在 800-1200 字以内。

### 3.4 `list_context_sources`

用途：列出项目当前可用上下文源，便于审计。

---

## 4. 项目镜像同步规则

项目级内容的同步规则：

- `project-profile.md` 双写到 Hermes 与项目目录。
- 故障复盘按类别写入 `incidents/`。
- 可复用经验写入 `lessons/`。
- 项目专属 Skill 文档写入 `skills/`。

`news` 项目镜像目录：

```text
H:\AIcode\Trae\news\hermes\
```

同步约束：

- 不写入密钥。
- 不写入生产 URL 中的敏感 token。
- 不写入完整用户隐私数据。
- 可跟随 Git 备份，但是否提交由用户另行确认。

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
2. 长复盘：写 Hermes Context Docs 和项目镜像目录。
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

## 9. 第二阶段技术实现：`hermes-context` MCP

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

### 9.1 `get_project_profile`

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

### 9.2 `list_context_sources`

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

### 9.3 `search_context`

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
- 同时检索 Hermes 主沉淀区和项目镜像区。
- 返回 source 时使用 `context:` 或 `mirror:` 前缀标记来源。
- 标题、文件名、一级/二级标题加权。
- 返回片段而不是全文。
- 默认 `limit=5`，最大 `limit=10`。
- 单条 snippet 默认不超过 1200 字。

### 9.4 `append_lesson`

输入：

```json
{
  "project": "news",
  "category": "incidents",
  "title": "Mode 1 production llm_configs missing",
  "content": "## Summary\n...\n## Root Cause\n...",
  "mirror": true
}
```

写入规则：

- `category` 只允许 `profile`、`incidents`、`lessons`、`skills`。
- 文件名由标题 slug 生成。
- 追加前执行敏感信息扫描。
- 不覆盖已有文件；同名则追加时间戳。
- 写入后记录 audit。

### 9.5 `sync_project_mirror`

输入：

```json
{
  "project": "news",
  "dryRun": true
}
```

规则：

- `dryRun=true` 时只列计划。
- `dryRun=false` 时才写入镜像目录。
- 不执行 Git add/commit/push。

### 9.6 安全扫描

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

### 9.7 项目隔离

所有工具必须要求 `project` 参数。第一版只允许：

```text
news
```

未来扩展新项目时，需要显式加入项目配置，不允许任意路径读取。

### 9.8 注册方式

计划注册 Hermes MCP server：

```text
hermes-context
```

运行脚本：

```text
H:\agent\hermes\mcp\hermes-context\scripts\Run-HermesContextMcp.cmd
```
