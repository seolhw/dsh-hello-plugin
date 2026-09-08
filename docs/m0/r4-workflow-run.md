# M0-4 workflow 运行通道 spike（结论）

> 对应任务：docs/TASKS.md `M0-4`。问题：接收者点击他人分享的 workflow（`{meta, script, args}`）后，如何在本地运行副本（PRD §14 R3）。

## 结论

**不要直接 `ctx.workflowEngine.start`**：`start()` 要求 `parent: Agent`（`packages/workflow/workflow/src/runtime-types.ts:31`），插件进程内没有现成 live Agent 可注入。

**采用通道 = 复用 webhook 的「受信外部事件 → 新建 Workspace Session 并注入 prompt」执行器（Route A）**，由本地 agent 依据脚本调用 `workflow` 工具完成运行：
- 完整实现样板就是 `packages/webhook/webhook/src/session.ts` 的 `createWebhookSession`（120-182 行）：
  1. `ctx.agentPresets.resolve(agentPreset)` + `standingKeyFor`；
  2. `ctx.workspaceRegistry.create(workspacePath)`（目标工作区，克隆同款）；
  3. `ctx.agents.create({ sessionId, signal, meta: { cwd: workspace.path, agentPreset }, agentOptions: {provider, model}（来自 `agentDefaultModel.currentSelection()` 或显式 route）, setup: async (agentCtx) => { agentPresets.mount; 安装初始模型选择 } })`；
  4. `workspace.attachSession(sessionId)` → `permissionPresets.set(session, preset)` → `sessionTitle.rename(title)` → `handle.agent.followup(createUserMessage({content:[{type:'text', text: prompt}], source:{...}}))`；
  5. 失败回滚：detachSession + handle.dispose（幂等、无半成品）。
- 对 dsh-talk：prompt 内容 = 「运行分享的 workflow」委派说明 + 脚本/参数。脚本以文本放 prompt 或先写入工作区文件再由 agent 读取（脚本可能超长；建议：manifest 预览后写入 `<workspace>/.dsh-talk/<shareId>.workflow.js`，prompt 指示 agent 用 `workflow` 工具提交该文件内容+meta）。
- 全程走普通 Agent/Session 行为：用户可见、可审批、可取消；符合 §12 红线（禁止静默执行、运行副本文案）。
- 兜底（零执行）：分享卡片提供「复制脚本」按钮（纯文本），服务端不执行任何脚本（Hub 侧仍零 RCE 面）。

## 补充事实（一手）

- workflow 引擎 = `dsh-workflow-worker-thread`：一次运行一个 Node worker thread + 可逃逸 `node:vm` → **非安全边界**（与模型既有 bash 同等信任前提）；因此「运行他人脚本」必须走用户确认 + 常规 agent 权限预设，绝不能把脚本当不可信代码再沙箱（README.zh L12/28/167）。
- `ctx.workflowEngine` 由 worker-thread 引擎注册；`workflow`/`ralph` 工具都经它执行（README）。
- host 服务可用清单（fork/webhook 两处一致）：`agents / agentPresets / agentDefaultModel / permissionPresets / sessionTitle / workspaceRegistry / sessions / sessionQuery / attachments / llm / typert`（dsh-api-session-controller index.ts:85-95；webhook session.ts import 佐证）。

## 验收映射（M3-8）

1. 卡片「在本机运行」→ 预览（meta/phases/脚本/args）→ 用户确认 → createWebhookSession 同构执行（工作区 = 用户选择；agentPreset/permissionPreset = 当前部署选择或提示词要求）。
2. 运行过程是**新会话**：用户可实时看到、可停止；结果留在本机会话，与分享内容无耦合。
3. 错误/取消回滚：按 session.ts 的回滚路径，不留半成品会话。
4. 兜底「复制脚本」按钮存在。

## 相关文件

- `packages/webhook/webhook/src/session.ts`（执行器样板）
- `packages/workflow/workflow/src/runtime-types.ts`（`parent: Agent` 约束）
- `packages/workflow/workflow-worker-thread/README.md`（引擎/隔离边界/安全前提）
