# dsh-talk

> 把「社区」装进 DSH —— 面向 DSH 用户与开发者的类 Discord 社区插件：频道实时聊天、提问求助、分享工作流（workflow）与一键克隆会话，全程无需跳出 DSH。

*A Discord-like community living inside DSH (DeepSeek Harness): real-time channels, Q&A with a resolution loop, and sharing workflows or full agent sessions that others can clone — one click, identical trajectory, on their own machine.*

---

## 它解决什么问题

DSH 用户与开发者今天要「跳出 DSH」才能获得社区支持：

| 痛点 | dsh-talk 的答案 |
| --- | --- |
| 遇到问题要在 Discord / 微信群 / 论坛之间来回切，上下文丢失 | 在 DSH 内直接进入频道提问、贴代码、被解答，`#help` 有解决闭环 |
| 「帮我看看我这个会话为什么这样」只能截图、口述 | 分享一个链接/卡片，对方一键克隆：本地生成记录与整个轨迹完全一致的会话副本，可直接打开查看甚至继续 |
| 好用的 workflow 无法分发、无法复用 | 以纯 JSON 载荷 `{meta, script, args}` 分享 workflow，对方本地一键运行 |
| 社区内容与自己的 Agent 工作区割裂 | 分享/克隆/运行全部发生在本地 DSH 与社区 Hub 之间，产出留在自己的工作区 |
| 默认只有单一官方群，圈子无法生长 | 任何注册用户都能自建社区（类 Discord「服务器」）：公开可被「发现」加入，或发社区邀请码私有加入 |

> 目标场景：多社区（自行创建 / 「发现」加入 / 私有邀请码加入），社区内 `#general` 闲聊、`#help` 求助解答、`#showcase` 分享工作流与「会话克隆」卡片、`#announcements` 社区公告。

---

## 架构总览

```mermaid
flowchart LR
    subgraph A["用户 A 的 DSH（本地）"]
        UI["dsh-talk 聊天面板（client）"]
        HOST["dsh-talk host<br/>会话克隆 / workflow 运行 / 本地缓存"]
        UI <--> HOST
    end
    subgraph C["Cloudflare（Hub）"]
        API["Worker API<br/>REST + WebSocket"]
        DO["Durable Object<br/>RoomActor（每频道实时广播）"]
        D1[("D1<br/>用户 / 社区 / 频道 / 消息 / 分享")]
        R2[("R2<br/>附件 & 会话克隆包")]
        API --> DO
        API <--> D1
        API <--> R2
    end
    subgraph B["用户 B 的 DSH（本地）"]
        UI2["dsh-talk 聊天面板（client）"]
        HOST2["dsh-talk host"]
        UI2 <--> HOST2
    end
    UI -- "WSS + REST（Bearer）" --> API
    UI2 -- "WSS + REST（Bearer）" --> API
```

### 双插件分工（DSH 客户端插件标准形态）

DSH 插件天然分为两个运行环境，本项目通过 `package.json` 的 `exports` 与 `dsh.client` 声明同时提供两份产物：

- **client（浏览器）**：聊天 UI、与 Hub 的 WebSocket 长连接、未读状态、分享卡片、R2 预签名直传。
- **host（Node.js）**：插件配置（`ctx.settings` 命名空间 `talk`）、克隆恢复器（把分享包写回本地 DSH 会话持久化与索引）、workflow 运行器、本地缓存（`ctx.storageDomain` 自定义 domain `talk`）。

client 需要 host 能力时走 DSH 既有 RPC 通道（参照 `dsh-client-connection` 的 remote 机制）。

### Hub（Cloudflare 全家桶，无任何第三方云依赖）

一个 Hub 承载多个社区（层级 **Hub → 社区 → 频道**，社区即 Discord 的「服务器」，可由注册用户自行创建）：

- **Worker**：提供 REST + WebSocket 入口
- **Durable Object（RoomActor）**：每个频道一个实例，负责连接管理与实时广播
- **D1**：用户 / 社区 / 频道 / 消息 / 分享等元数据（源真）
- **R2**：图片附件与会话 / 工作流分享包

Hub 代码在本仓库 `server/` 目录下（独立工程，支持自托管）。

---

## 仓库结构

```
dsh-talk/
├── src/                  # DSH 插件 host（TypeScript，tsdown 打包）
│   └── index.ts          # 插件入口：配置、服务接线
├── lib/                  # host 打包产物（tsdown 输出）
├── src-client/           # DSH 插件 client（浏览器 UI，React）—— 规划中
├── server/               # Cloudflare Hub（独立工程，可自托管）—— 规划中
│   ├── wrangler.toml     # D1 / R2 / DO bindings
│   ├── src/worker.ts     # 路由：REST + WS upgrade
│   ├── src/room.ts       # RoomActor（Durable Object）
│   └── src/schema.sql    # D1 DDL
├── cordis.yml            # 本地开发：把本插件 insert 进 dsh 配置树
├── cordis.patch.yml      # 发布：作为 bundle patch 被 dsh 加载
├── pnpm-workspace.yaml   # pnpm 白名单：跳过 DSH alpha 包的发布年龄检查
├── tsdown.config.ts      # host 打包配置
├── tsconfig.json
└── package.json
```

---

## 快速开始（本地开发）

### 0. 前置

- Node.js ≥ 20、pnpm ≥ 9
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)（跑 Hub 无需 Cloudflare 账号）
- DSH 本体：`npx @deepseek-ai/dsh`

> 注意：本仓库声明的 `@deepseek-ai/dsh-tools` 等 peer 依赖版本为 `0.1.3-alpha.2`，如本地实测 DSH 版本不同，请先 `pnpm run update` 对齐（见下方开发指南）。

### 1. 本地启动 Hub

```bash
cd server
pnpm install
pnpm dev            # wrangler dev，默认 http://127.0.0.1:8787
```

首次启动时用环境变量注入一个平台注册码（单次使用）：

```bash
# PowerShell
$env:AUTH_INVITE_CODES = "dshtalk-dev-0001"
pnpm dev
```

### 2. 启动 DSH 并加载插件

```bash
# 仓库根目录
pnpm install
pnpm dev            # = npx @deepseek-ai/dsh web --patch ./cordis.yml
```

打开 DSH Web GUI（默认 http://127.0.0.1:3080），侧栏出现 **dsh-talk** 入口。

### 3. 首次连接

1. 打开 dsh-talk 面板 → 「注册身份」：输入**平台注册码**与昵称（如 `alice`）→ Hub 返回令牌并自动写入本地设置；
2. 创建第一个社区（自动获得默认频道），或从「发现」加入公开社区 / 输入社区邀请码加入私有社区；
3. 进入社区内的 `#general`，用第二个用户验证实时互通：同机联调请再起一个独立的 DSH profile（不同端口、不同配置树，另用一个平台注册码）连接同一个 Hub；
4. 两个用户都能在 `#showcase` 发布分享卡片、在 `#help` 提问并标记已解决。

---

## 配置

### 插件设置（DSH 内设置页 + `ctx.settings` 命名空间 `talk`）

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `hubUrl` | string | `http://127.0.0.1:8787` | Hub 地址；生产环境填 `https://<你的域名>` |
| `handle` | string | `""` | 社区昵称（平台注册码换取令牌时写入） |
| `token` | string（secret） | `""` | 社区访问令牌，`settings` 用户层覆盖 |
| `autoReconnect` | boolean | `true` | WebSocket 断线自动重连 |
| `share.maxSizeMb` | number | `50` | 本地上传体积上限（需 ≤ 服务端上限） |

### Hub 环境变量（`server/`）

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `AUTH_INVITE_CODES` | 逗号分隔的**平台注册码**（仅用于开通账号，单次使用） | 必填（dev 可种子） |
| `COMMUNITY_CREATE_DAILY_LIMIT` | 每用户每日可创建社区数 | `3` |
| `MAX_COMMUNITIES_PER_USER` | 每用户累计可创建社区数上限 | `10` |
| `ADMIN_HANDLES` | 逗号分隔的平台管理员昵称 | `""` |
| `MAX_MESSAGE_LENGTH` | 单条消息字符上限 | `4000` |
| `MAX_SHARE_BYTES` | 单分享包体积上限 | `52428800`（50 MiB） |

---

## 开发指南

### 脚本

```bash
pnpm build        # tsdown 打包 host（输出到 lib/）
pnpm dev          # 本地起 dsh web 并 insert 本插件
pnpm run update   # 对齐 @deepseek-ai/* peer 依赖版本
```

### 双包约定（实现时必须满足）

1. `package.json`：`exports` 增加 `"./client"`（浏览器入口），并声明 `"dsh": { "client": { "inject": [...], "platform": "web" } }`；
2. 浏览器 UI 挂载走 slot 机制（`ctx.slots.register` / `ctx.slots.inject`），入口孔位以 `sidebar.footer.action`（列表槽）等 DSH 内置孔位为参考锚点；
3. 插件语言包用 `ctx.locale.register('talk', 'zh'|'en', …)` 注册，UI 文案先做 `zh`，`en` 同步补齐；
4. host 能力（克隆恢复、workflow 运行）一律要求用户确认，禁止静默执行。

### pnpm 发布年龄白名单

`pnpm-workspace.yaml` 中的 `minimumReleaseAgeExclude` 用于豁免 DSH 的 alpha 预发布包。如果项目根目录或全局 `.npmrc` 中配置了 `minimumReleaseAge`（如 `7d`），这些刚发布的 alpha 包会跳过年龄检查，确保能正常安装。如需新增 DSH 相关依赖，请同步更新此白名单。

### 本地联调注意

- `cordis.yml` 用于本地开发（直接 `insert` 指向 `./src/index.ts` 源码）；
- `cordis.patch.yml` 用于发布形态（`insert` 指向包名 `dsh-talk`，由 DSH 的 bundle patch 机制加载）；
- 双用户联调需使用两个独立的 DSH profile（不同端口、不同配置目录），避免数据冲突。

---

## License

MIT
