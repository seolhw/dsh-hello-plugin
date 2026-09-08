# dsh-talk 任务清单（Multi-Agent 开发看板）

> **唯一事实源**：本文件是所有开发任务与状态的唯一事实源（Single Source of Truth）。
> **需求源**：功能细节一律以 [PRD.md](./PRD.md)（v0.2）为准，本清单只做任务切分与跟踪。
> **多 Agent 协作**：多个开发 agent（或人）可并行认领不同「流」的任务；认领、状态变更、验收结论都写回本文件并随任务一起 commit。

---

## 1. 状态词表

| 状态 | 含义 | 机器可读别名 |
| --- | --- | --- |
| 待办 | 未开始，可被认领 | `todo` |
| 进行中 | 已认领、正在做（认领列写 agent 名） | `in_progress` |
| 评审中 | 实现完成，等待 reviewer/master 复核 | `review` |
| 完成 | 验收通过（验收列有证据） | `done` |
| 受阻 | 依赖未满足或有阻塞原因（备注列写明） | `blocked` |

## 2. 协作规则（所有 agent 必须遵守）

1. **认领**：开始前把状态改为 `进行中` 并在「认领」列写自己的标识（如 `agent-server`）+ 日期，避免两人做同一任务。
2. **依赖**：只有依赖项为「完成/评审中」时才可开工；`M0-6 门禁`未通过前，M1–M4 不得正式开工（M1-1 脚手架可与 M0 并行探索，见下）。
3. **原子提交**：每个任务单独 commit，消息前缀 `T-<ID>`（如 `T-M1-05: 社区创建接口`）。
4. **验收**：完成任务 = 通过该行「验收/产出」列的判据，并把状态置 `评审中`，附产出路径；由主 agent/评审做 `review` 复核后置 `完成`。
5. **受阻**：阻塞超过一轮就标 `受阻` 并写原因；连续 3 轮仍受阻 → 升级给主 agent 决策（对应 PRD §14 门禁/降级路径）。
6. **并行原则**：不同「流」（server / client / host / research / docs / qa）之间无依赖即并行；同文件高频改动的任务尽量同一 agent 顺序做。
7. **收口检查**：改 README / PRD / TASKS 之外的实现文件时，保持文档锚点引用不失效；里程碑收口跑一遍 README 校验清单（build + dev + 联调）。

## 3. 看板快照

> ⚠️ 人工维护：任何人改完状态顺手更新下表计数。

| 里程碑 | 总数 | 待办 | 进行中 | 评审中 | 完成 |
| --- | --- | --- | --- | --- | --- |
| M0 技术预研 | 6 | 2 | 0 | 0 | 4 |
| M1 Hub 服务端 | 15 | 15 | 0 | 0 | 0 |
| M2 客户端聊天 | 12 | 12 | 0 | 0 | 0 |
| M3 分享与克隆 | 9 | 9 | 0 | 0 | 0 |
| M4 打磨与发布 | 8 | 8 | 0 | 0 | 0 |
| DOC 文档线 | 3 | 1 | 0 | 0 | 2 |
| **合计** | **53** | **47** | **0** | **0** | **6** |

## 4. 建议的并行拓扑（首轮如何分工）

```
M0（4 个研究 agent 并行，全部互不依赖）
  M0-1/M0-2 客户端契约与双半加载 ── agent-client
  M0-3 会话克隆恢复 spike ──────── agent-host
  M0-4 workflow 运行通道 spike ──── agent-host-2
  M0-5 CF WS/DO/D1/R2 冒烟 ─────── agent-server
  └─ M0-6 门禁评审（主 agent）→ 通过后放行 M1–M4

M1（M1-1 脚手架 + M1-2 鉴权先行，随后 3 条并行轨）
  社区轨：M1-5..M1-9  消息轨：M1-10..M1-13  分享轨：M1-14
  测试收口：M1-15（qa agent，等前三轨接口就绪）

M2（M2-1 双半骨架先行，随后 2 条并行轨，共享消息 store 由 agent-client-core 维护）
  导航轨：M2-3/M2-4/M2-9  聊天轨：M2-5..M2-8
  横向：M2-10/M2-11/M2-12

M3（3 条并行轨）
  打包+恢复（host）：M3-1/M3-2/M3-6  客户端对话框/卡片：M3-3/M3-4/M3-7
  workflow 分享与运行：M3-5/M3-8  问答闭环：M3-9（可与 M3-4 并行）

M4（2 条并行轨：体验轨 M4-1..M4-3 / 发布轨 M4-4..M4-8）
```

---

## 5. 任务分解

### M0 技术预研（R1–R4/R7 消除，1–2 周）

| ID | 任务 | 流 | 依赖 | 状态 | 认领 | 验收/产出 |
| --- | --- | --- | --- | --- | --- | --- |
| M0-1 | 客户端契约核对（R1）：从 `deepseek-ai/deepseek-harness` 源码取得 `dsh-client-web`（shell）、`dsh-client-ui-slots`（SlotCore）、`dsh-client-ui-primitives` 契约；确认可挂载孔位（sidebar/settings/会话操作区）与 `ctx.slots` 精确 API | research | 无 | 完成 | 主 agent（一手核验 + research-sub 审计并入中） | 产出 `docs/m0/r1-contracts.md`：双半 manifest/产物契约、SlotCore 签名、孔位清单（sidebar.footer.action / settings.section / shell.overlay）、挂载方案定稿 §6.1 |
| M0-2 | 双半包本地加载实验：tsdown 双入口打包 → `exports["./client"]` + `dsh.client` 声明 → 开发期以包名装入 profile 并被 client modules 扫描进 GUI（验证本地 dev 加载路径） | client | 无 | 完成 | 主 agent | 实验 `experiments/m0-2/`；证据 `docs/m0/r2-dualhalf.md`：boot 图含本包 + 组合脚本 `/plugins/…dsh-talk-m02/client.js` 200 且含注册代码；浏览器渲染留 M2 联调 |
| M0-3 | 会话克隆恢复 spike（R2）：按 `dsh-session-persistence-jsonl` 布局直写 `session.jsonl` + 附件 + 在会话列表/查询索引注册新会话；验证「打开」与「继续对话」是否可行 | host | 无 | 完成 | 主 agent | `docs/m0/r3-session-clone.md`：Route B（`agents.create(seed)+workspace.attachSession`）定稿、fork/webhook 双源契约、续写可行；Route A 否决；非阻塞补遗待并入 |
| M0-4 | workflow 运行通道 spike（R3）：验证「新建会话 + 注入 prompt」委派本地 agent（webhookRuntime 同构）vs `ctx.workflowEngine.start` parent 注入 | host | 无 | 完成 | 主 agent | `docs/m0/r4-workflow-run.md`：engine.start 需 live parent（否决）；采用 webhook `createWebhookSession` 同构执行器；兜底复制脚本；验收映射 M3-8 |
| M0-5 | CF WS/DO 冒烟（R4）：wrangler dev 起 Worker + RoomActor（echo/广播/心跳/补漏 cursor），100 连接压测；D1 写路径、R2 预签名直传验证；同时产出「建社区限流 + 发现目录」接口设计（R7） | server | 无 | 待办 | | 冒烟脚本与压测记录；`docs/m0/r4-cf-smoke.md` |
| M0-6 | 门禁评审：汇总 R1–R4/R7 结论，冻结 MVP 范围（FR-D4/FR-D5 是否保留），输出决议并更新 PRD 为 v1.0 基线 | docs | M0-1..M0-5 | 待办 | | `docs/m0/gate.md`（Go/No-Go 决策表）；PRD 版本与变更记录更新；TASKS 快照刷新 |

### M1 Hub 服务端（2–3 周）

| ID | 任务 | 流 | 依赖 | 状态 | 认领 | 验收/产出 |
| --- | --- | --- | --- | --- | --- | --- |
| M1-1 | `server/` 工程脚手架：wrangler.toml（D1/R2/DO bindings）、D1 schema.sql 迁移（§9 全部表）、dev/test 脚本、目录骨架 | server | M0-5 | 待办 | | `wrangler dev` 可起；迁移可应用 |
| M1-2 | 鉴权中间件：Bearer token 校验（sha256 哈希比对）+ 两级社区鉴权（member→频道、owner→社区资源）；全部 /api 与 WS upgrade 接入 | server | M1-1 | 待办 | | 无 token/非成员/非 owner 分别 401/403 |
| M1-3 | 平台注册：`POST /api/auth/invite` + 注册码单次使用 + token 签发 | server | M1-2 | 待办 | | FR-A1 AC ①②③ |
| M1-4 | `GET /api/bootstrap`：用户、我的社区（含频道与角色）、读取游标 | server | M1-2, M1-5 | 待办 | | 与 §10.2 一致 |
| M1-5 | 社区创建：`POST /api/communities` + 默认频道模板生成（FR-B1/G1）+ 建社区限流（3/日、累计 10） | server | M1-2 | 待办 | | FR-G1 AC ①②③ |
| M1-6 | 发现目录：`GET /api/communities/discover`（公开、分页） | server | M1-5 | 待办 | | FR-G3 AC |
| M1-7 | 加入/退出：`POST /join`（私有需码）、`DELETE /membership`、成员移除（P1 预留字段） | server | M1-5 | 待办 | | FR-G4/G8 AC |
| M1-8 | 邀请码：owner 生成/撤销社区邀请码（FR-G5）+ 编辑资料（P1 项先留接口） | server | M1-5 | 待办 | | FR-G5 AC |
| M1-9 | 频道管理：owner 新建频道（FR-G6）、归档（P1） | server | M1-5 | 待办 | | FR-G6 AC |
| M1-10 | 消息 REST：发消息（text/question）、历史分页（before/limit）、软删 | server | M1-2 | 待办 | | FR-B2/B3/B9（删为 P1） |
| M1-11 | `#help`：提问消息 + `POST /api/questions/:id/resolve`（作者） | server | M1-10 | 待办 | | FR-C2 AC |
| M1-12 | 读取游标：`POST /api/channels/:id/reads` + bootstrap 回读 | server | M1-10 | 待办 | | FR-E1 服务端侧 |
| M1-13 | DO RoomActor：WS upgrade（成员校验）、广播 message.new/share.new 等、心跳 25s/60s、重连 cursor 补漏 | server | M1-2, M1-10 | 待办 | | 双客户端实时互发 ≤2s；断线补漏不丢不重 |
| M1-14 | 分享与上传：`POST /api/shares`（两段式：create→R2 presigned PUT→complete 落卡片消息）、`GET /download`、图片上传接口；大小/类型校验 | server | M1-2 | 待办 | | FR-D1/D3 服务端侧；50 MiB/10 MiB 限制生效 |
| M1-15 | 防护与测试：限流（消息/注册/建社区）、CORS、token 清理；`server/test` 集成用例（双用户互发、建社区→邀请→双社区切换、分享上传下载） | qa | M1-3..M1-14 | 待办 | | §8.4/§12 防护矩阵生效；集成测试全绿 |

### M2 客户端聊天（3 周）

| ID | 任务 | 流 | 依赖 | 状态 | 认领 | 验收/产出 |
| --- | --- | --- | --- | --- | --- | --- |
| M2-1 | 双半骨架：package.json `dsh.client` + `exports["./client"]`；host 半 `ctx.settings.register('talk', Config, {base})` + storageDomain 'talk'；client 半入口与 RPC 接线（`ctx.remote`） | client | M0-1, M0-2 | 待办 | | 骨架构建通过；client/host 各自可加载 |
| M2-2 | Hub API 客户端 + WS 客户端：fetch(Bearer)、重连/退避/心跳/cursor 补漏、错误事件 | client | M2-1, M1-13 | 待办 | | 断网 30s 恢复后消息不丢（FR-B4） |
| M2-3 | 社区抽屉 UI：我的社区 / 发现 / 创建入口 + 社区切换 + 社区级未读聚合 | client | M2-1, M2-2 | 待办 | | FR-G2/G9（聚合 P1 标记）；多社区切换正确 |
| M2-4 | 注册/创建/加入对话框：注册码、建社区表单（名称/描述/可见性）、私有加入码输入 | client | M2-3 | 待办 | | FR-A1/G1/G4 客户端流程 |
| M2-5 | 频道列表 + 消息流 UI + 历史分页（向上滚动） | client | M2-3 | 待办 | | FR-B1/B3 |
| M2-6 | 消息渲染：Markdown + 代码高亮 + 图片预览 + 提问样式 + 分享卡片占位 | client | M2-5 | 待办 | | FR-B5/B6 展示侧 |
| M2-7 | 输入区：发送/`Shift+Enter`、`@handle` 提及、图片选择与 R2 预签名直传 | client | M2-6 | 待办 | | FR-B6/B8 |
| M2-8 | 未读/提及徽章（每频道 + 社区聚合） | client | M2-6 | 待办 | | FR-E1/E2 |
| M2-9 | owner 管理入口 UI（P0 子集）：新建频道、生成/撤销邀请码 | client | M2-5 | 待办 | | FR-G5/G6 客户端（member 不可见） |
| M2-10 | 设置区：占用 settings.section，`talk` 设置项（hubUrl/昵称/令牌/上限/语言）+ locale zh | client | M2-1 | 待办 | | FR-F1/F4（zh） |
| M2-11 | 本地缓存与状态管理：storageDomain 'talk'（profile/草稿/来源映射）、断线提示条、加载/错误/空态 | client | M2-2 | 待办 | | FR-F2 主要路径覆盖 |
| M2-12 | 端到端聊天联调：双 DSH profile（alice/bob）+ 本地 Hub；基础 a11y（焦点/回车） | qa | M2-4..M2-8 | 待办 | | FR-B 全量 + FR-E 验收清单通过 |

### M3 分享与克隆（2–3 周）

| ID | 任务 | 流 | 依赖 | 状态 | 认领 | 验收/产出 |
| --- | --- | --- | --- | --- | --- | --- |
| M3-1 | 会话打包器（host）：zip = manifest.json + 明文 session.jsonl + 子会话 + 附件；sha256；默认不含附件 | host | M0-3 | 待办 | | §6.1 打包结构与 hash 校验 |
| M3-2 | manifest 校验器 + 版本兼容拒绝（schemaVersion/source.dshVersion） | host | M3-1 | 待办 | | 非法/未知版本包明确拒绝 |
| M3-3 | 「分享会话」对话框（client）：内容摘要/附件勾选（二次确认）/社区频道选择/上传两段式 | client | M3-1, M2-5 | 待办 | | FR-D1 全流程 |
| M3-4 | 分享卡片渲染 + `share.new` 事件 + 克隆/运行计数展示 | client | M2-6, M1-13/14 | 待办 | | FR-D3/D6 展示侧 |
| M3-5 | workflow 分享：粘贴/最近一次 `workflow` 调用带入、形状预检、上传、卡片 | client+host | M3-4 | 待办 | | FR-D2 |
| M3-6 | 克隆恢复执行（host）：下载/校验/解包/工作区选择/写入会话持久化+索引/打开新会话/来源映射表回写 | host | M3-2 | 待办 | | §6.3 AC1–AC6（含幂等：失败不留半成品） |
| M3-7 | 克隆确认对话框 + host RPC + 逐次用户确认（复用审批体系） | client | M3-6 | 待办 | | §12 红线流程；取消/断网可重试 |
| M3-8 | workflow 运行通道：本地执行副本（预览 + 确认 → 新建会话委派 agent / 复制脚本兜底）+ 运行结果留本机 | host | M0-4 | 待办 | | FR-D5；卡片文案注明「运行副本」 |
| M3-9 | `#help` 闭环交互：提问发布、作者 resolve/取消、已解决样式；分享删除（P1） | client | M2-6, M1-11 | 待办 | | FR-C1/C2 |

### M4 打磨与发布（1–2 周）

| ID | 任务 | 流 | 依赖 | 状态 | 认领 | 验收/产出 |
| --- | --- | --- | --- | --- | --- | --- |
| M4-1 | a11y 收口：键盘可达、焦点顺序、对比度、ARIA 标注（FR-F3） | client | M2-12 | 待办 | | 主要路径纯键盘完成 |
| M4-2 | i18n：`en` 语言包全量 + zh 文案复查（FR-F4） | client | M2-10 | 待办 | | 语言切换 UI 随动 |
| M4-3 | 系统通知（FR-E3）+ 诊断面板（FR-F5，连接/错误/令牌） | client | M2-11 | 待办 | | 通知开关生效；诊断信息可用 |
| M4-4 | 端到端验收：§6.3 六条 AC + FR 验收清单转可执行用例；双 profile + 本地 Hub 全绿 | qa | M3 全部 | 待办 | | 验收报告 `docs/qa/mvp-e2e.md` |
| M4-5 | 插件发布：cordis.patch.yml 以包名引用、npm publish、README 安装步骤 | fullstack | M4-4 | 待办 | | 干净环境按 README 可装上并打开面板 |
| M4-6 | Hub 部署：wrangler deploy 配置（dev/prod 环境变量）、部署文档、CI（P1） | server | M1-15 | 待办 | | 生产域名可注册/登录/收发 |
| M4-7 | 种子内容与内测注册码运营指引（§16）+ 指标采集开关 | docs/qa | M4-5, M4-6 | 待办 | | 内测 checklist 文档 |
| M4-8 | 文档同步：README/PRD/TASKS 校对、版本号 v1.0、changelog | docs | M4-4 | 待办 | | 三份文档一致 |

### DOC 文档线

| ID | 任务 | 流 | 依赖 | 状态 | 认领 | 验收/产出 |
| --- | --- | --- | --- | --- | --- | --- |
| DOC-1 | README + PRD v0.2（社区自建范围）完成 | docs | 无 | 完成 | 主 agent | README.md / docs/PRD.md 已评审 |
| DOC-2 | 本任务清单（含状态与协作规则）建立 | docs | DOC-1 | 完成 | 主 agent | 本文件 |
| DOC-3 | PRD v1.0 冻结 + 范围变更记录（M0 门禁后执行） | docs | M0-6 | 待办 | | PRD 头部版本/变更记录更新 |

---

## 6. 完成定义（Definition of Done，DoD）

每个任务满足以下条件才可置 `评审中`：

1. 需求侧：对应 FR/AC（PRD §5–§7）与里程碑验收行已达成；
2. 代码侧：通过类型检查与单测，`pnpm build`/`pnpm dev`（server: `wrangler dev`）可跑；
3. 集成侧：依赖项已 done；跨 client/host 的 RPC 已在本地联调验证；
4. 文档侧：涉及对外行为变化时同步更新 README/PRD（或在该行备注中说明影响面）；
5. 提交侧：commit 前缀 `T-<ID>`，状态/认领列与本文件同步提交。

## 7. 变更记录

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 本次 | 0.1 | 依据 PRD v0.2（含用户自建社区）建立任务分解与状态看板 |
