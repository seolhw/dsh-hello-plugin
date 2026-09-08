# M0-3 会话克隆恢复 spike（结论草案）

> 对应任务：docs/TASKS.md `M0-3`。核心问题：他人分享的会话如何在接收者本地重建为「记录/轨迹一致、可打开、可继续」的会话（PRD §14 R2）。
> 状态：定稿（Route B 已核验，含 M0-3 全量调研并入）。实现期补读项见文末。

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

## 已核验的服务契约（fork + webhook 双源一致）

- `ctx.agents.create` 实际签名与选项（来自 `packages/api/session-controller/src/commands.ts:247-261` 与 `packages/webhook/webhook/src/session.ts:136-145`）：`{ sessionId, seed?: SessionEvent[], inheritedEventCount?, meta: { cwd, parentSession?, isSeeded?, agentPreset? }, agentOptions: { provider, model, maxTokens? }, signal?, setup?: (agentCtx) => Promise<void> }` → 返回 `{ agent, ... }` handle（`handle.dispose()` 幂等）。
- `ctx.workspaceRegistry`：`create(path)`（幂等语义：返回既有或新建 workspace）、`list()`、workspace 上 `attachSession(id)` / `detachSession(id)`。
- `ctx.sessionQuery.observeSession(id)` 返回可读事件视图（`source.events`、`header`、`presetForObservation` 可用）——分享导出与（可选）接收端构造观察用。
- 其它：`ctx.agentPresets.resolve/mount/standingKeyFor`、`ctx.permissionPresets.set/resolve`、`ctx.sessionTitle.rename`、`ctx.agentDefaultModel.currentSelection()`。

## Route 决策

- **Route B（运行时原语，采用）**：`agents.create(seed)` + `workspaceRegistry` attach。理由：版本安全（SESSION_FORMAT_VERSION v0 无迁移承诺）、投影/索引/续写全部由运行时接管、与 fork 同构有先例。
- Route A（纯文件+索引直写）**放弃**作为实现路径：需复刻 zstd 帧、workspace domain、投影缓存三处不变量，脆弱且破坏续写；仅保留为只读预案。

## 待并入（非阻塞补遗）

### 已并入（M0-3 全量调研，2025-…）

- **“被列出”的决定者 = JSONL 目录扫描**（非 sqlite）：UI 列表链 `session.list` → `ApiSessionList.list` → `sessionQuery.listSessions` → `persistence.list()`（逐目录校验 header 帧）+ `ctx.sessions.list()` live 合并、live 优先（`packages/session-query/session-query/src/corpus.ts:68-87`；`packages/api/session-controller/src/list.ts:137-162`，冷行要求 `header.cwd !== undefined`）。`session-query-sqlite` 仅是搜索用派生索引（`searchSessions/searchEvents` 时才 reconcile，不随 create/append）。
- **被列出最小条件**：合法可解析的 header 帧 + 目录布局（`--<cwd归一化>--/<encId>/session.jsonl[.zstd]`；cwd 归一化与 id 编码规则见 `session-persistence-jsonl/src/format.ts:37-39,154-224`）+ 与运行实例同 root/同压缩 + id 全局唯一；空/半写/非 header 文件静默跳过。
- **续写（resume）前置**：`resolveAgent → observeSession → ctx.agents.resume({resumeSessionId})`（`api/session-controller/src/agent.ts:398-433`）。要求：`header.cwd !== undefined`；非 subagent 归属——`origin==='subagent'` 或 `parentSession` 映射到 live 父 agent 会被拒（agent.ts:80-90,419-427）→ **克隆必须改写/清除 `origin` 与 `parentSession`，并同步 `isSeeded/seedLength`**；投影需含 `agentPreset`（agent.ts:504-509）与模型选择。
- **`agents.create` 精确契约**（`core/agent/src/index.ts:71-126,176-195`）：`sessionId` 必填；`meta?={cwd?,parentSession?,isSeeded?,origin?,delegationDepth?,agentPreset?}`；`inheritedEventCount?`（isSeeded 时配对）；`seed?` 校验：seq 从 0 连续、仅 lossless-JSON、无 open turn/step、无 dangling tool call；`agentOptions?` 可选但宿主两处均显式传 `{provider, model}`；`setup?`；`signal?`。create 顺序：setup → session/agent 插入 announce → agent/session-start → loop 启动。
- **append 由谁写**：`Session.append`（内存+事件，core/session）→ `PersistenceCoordinator`（监听 session/created、session/event 缓冲、session/flush、session/disposed）→ JSONL `appendBatch/materialize`（惰性：create 不落盘，首 append 原子写 header+首帧）。
- **无任何现成 import/restore 接口**：全仓仅 `Session.fromRestore`（内部 persistence-restore）与 export 下载/云上传。
- **导出子会话**：无整体导出单接口 → 用 `traceSession`/`listSessions` 遍历 `parentSession` 图后逐个会话读取（`observeSession/readSession`），逐会话克隆。
- **逐事件一致比对**：在解码后的 SessionEvent 层比对（packed rows/range 读端已还原）；归一化字段 = seq/type/time/data（深度相等，key 序无关）/surfaceOp/sourceEventSeqs；header 对齐 isSeeded/seedLength 与新建 createdAt/id。
- **格式/版本**：header v0 约束（delegationDepth ≥0、origin 仅 'subagent' 合法等；退役字段拒读）；未知事件类型非 `ignorable:true` → 整条拒读（跨 build 风险 = 克隆事件集必须被接收端 build 全部认识 → manifest 记 `source.dshVersion` 并按需拒绝）。zstd = Node 内建 `node:zlib`（checksum flag；零第三方）。

### 实现期补读（①②③④⑤ 不影响 Route B 决定）

- ① seed 事件落盘时机（首 flush 一次性物化含 seed？fork 语义如此，实证留 M3-6）；② agent-loop resume 内部 `Session.fromRestore` 调用；③ sqlite 路径 boot 装配（检出外）；④ `workspaceRegistry.attachSession` 宿主实现细节（dsh-workspace 检出外）；⑤ dsh-base/web-app 如何设 JSONL root=`<home>\sessions`（检出外，实现期以运行实例实测为准）。

## 实证/验收计划（写回 M3-6 验收）

1. 隔离 profile（M0-2 基建）内：以 fork 同构调用 `agents.create` 植入一个 seed 会话 → boot 后确认出现在 workspace/session 列表 API，事件与 seed 一致。
2. 续写验收：克隆会话能被 `prompt` 正常推进（M3 在真实 DSH 里做；离线无 LLM 时不阻塞）。
3. §6.3 六条 AC 中 AC1–AC6 映射：AC3（逐事件一致）用规范 JSON diff；AC6（幂等）用 create 前置不存在性检查 + 失败清理。

## 相关文件

- 实验：`experiments/m0-3/decode-test.mjs`（Node zstd 首帧解码验证，仅研究用）
- 上游证据：`packages/api/session-controller/src/{commands,index}.ts`、`packages/session/session-persistence-jsonl/README.md`
