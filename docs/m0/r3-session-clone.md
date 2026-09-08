# M0-3 会话克隆恢复 spike（结论草案）

> 对应任务：docs/TASKS.md `M0-3`。核心问题：他人分享的会话如何在接收者本地重建为「记录/轨迹一致、可打开、可继续」的会话（PRD §14 R2）。
> 状态：初稿——「恢复原语」已一手核验并指向 Route B；等 M0-3 全量调研（research-sub）并入后定稿。

## 结论（草案）

- **恢复原语已找到，且天然支持续写**：DSH 的 session **fork**（`dsh-api-session-controller`）就是「以既有会话事件为种子新建一个可继续的本地会话」。克隆恢复只需复用同一组 host 服务：
  - `ctx.agents.create({ sessionId: <新 uuid>, seed: <全量事件数组>, inheritedEventCount: <len>, meta: { cwd?, parentSession?: 源id, isSeeded: true, agentPreset? }, agentOptions: {provider, model}, setup? })`
  - `ctx.workspaceRegistry` → workspace `.attachSession(childId)`（fork 内 `workspace.attachSession`）。
  - 证据：`packages/api/session-controller/src/commands.ts:188-281`（`fork` 主体，`agents.create` 于 247-261，attach 于 269-279）；注入清单 `packages/api/session-controller/src/index.ts:85-95`：`agentDefaultModel / agents / attachments / llm / sessions / sessionProjections / sessionQuery / typert / workspaceRegistry`（host 插件可注入同名服务）。
- **Source 事件从哪来**：分享侧用 `ctx.sessionQuery.observeSession(id)`（fork 用它读事件，commands.ts:197）导出**规范事件 JSONL**（含子会话递归），打进 zip（manifest 格式维持 PRD §6.4）；接收侧解析回 `SessionEvent[]` 作为 `seed`。物理 zstd 帧与打包细节对接收端透明。
- **逐事件一致**：以“seed = 源完整事件数组（仅改写 id/时间/路径前缀等身份字段）”为判据；比对方法 = 对规范事件 JSON 做归一化后 diff（归一化字段：`id`、`time`/时间戳、cwd/绝对路径、子会话 parentSession 映射）。

## 一手核验（本轮）

1. 落盘与注册面（真实 home 只读采样）：
   - `sessions/<--归一化 cwd-->/<sessionId>/session.jsonl.zstd`（zstd 默认；头行 `{"type":"session","version":0,"id","createdAt","cwd","parentSession?","origin"?,"delegationDepth"?,"agentPreset"?}`）。
   - `storages/workspace.json`：storage-domain `workspace` v2（global.workspaceIds / tables.workspaces{path,title,sessionIds,createdAt,updatedAt}）。
   - `storages/session_projcache/sessions/<id>.json`：投影缓存 v5（identity + rows），随会话由运行时维护 → **不要手写**，走运行时创建。
2. 后端插件：`@deepseek-ai/dsh-session-persistence-jsonl` = `ctx.sessionPersistence`，含 `locate/create/ensureMaterialized/append/prepare/load/inspect/readRaw/list`；`readRaw(id)` 返回逐字节原始 JSONL 文本（打包器候选）；zstd 帧原语不公开，root 编码单一（zstd vs none 不可混写）→ 禁止手工对侧写文件。
3. Node 24 内置 zstd：`zstdDecompressSync` 一次仅解**首帧**（拼接多帧需专用扫描）；DSH 自己的解码在 bundle 内部，外部请走 backend/`sessionQuery`，不要在插件里自研帧解析。

## Route 决策

- **Route B（运行时原语，采用）**：`agents.create(seed)` + `workspaceRegistry` attach。理由：版本安全（SESSION_FORMAT_VERSION v0 无迁移承诺）、投影/索引/续写全部由运行时接管、与 fork 同构有先例。
- Route A（纯文件+索引直写）**放弃**作为实现路径：需复刻 zstd 帧、workspace domain、投影缓存三处不变量，脆弱且破坏续写；仅保留为只读预案。

## 待并入（M0-3 全量调研返回后）

- `agents.create` 精确契约（SessionEvent seed 校验、是否必填 agentOptions/setup、cold vs live）、`presetForObservation` 用法（fork 用它推断 composition；克隆需处理「远程 header 的 agentPreset」映射）。
- workspaceRegistry 建/选 workspace 与 attachSession 的宿主方法名；fork 的 `forkWorkspace` 逻辑（commands.ts:487+）可作为“克隆目标工作区选择”样板。
- 全仓是否存在 import/restore 现成接口（预期无）；`sessionQuery` 导出任意（含子会话）事件数组的确切方法。
- 跨版本：v0 格式 + ignorable 语义对「只读打开 vs 续写」的边界；克隆包校验点。

## 实证/验收计划（写回 M3-6 验收）

1. 隔离 profile（M0-2 基建）内：以 fork 同构调用 `agents.create` 植入一个 seed 会话 → boot 后确认出现在 workspace/session 列表 API，事件与 seed 一致。
2. 续写验收：克隆会话能被 `prompt` 正常推进（M3 在真实 DSH 里做；离线无 LLM 时不阻塞）。
3. §6.3 六条 AC 中 AC1–AC6 映射：AC3（逐事件一致）用规范 JSON diff；AC6（幂等）用 create 前置不存在性检查 + 失败清理。

## 相关文件

- 实验：`experiments/m0-3/decode-test.mjs`（Node zstd 首帧解码验证，仅研究用）
- 上游证据：`packages/api/session-controller/src/{commands,index}.ts`、`packages/session/session-persistence-jsonl/README.md`
