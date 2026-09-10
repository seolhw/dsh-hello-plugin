# dsh-talk

> 把「社区」装进 DSH —— 在 DeepSeek Harness 里直接和同好聊天、提问求助、发通知，社区内容与你的 Agent 工作区不再割裂。

一个面向 DSH 用户的类 Discord 社区插件：注册一个社区账号后，就可以在 DSH 面板里自建或加入社区，实时聊天、贴图传文件、`@` 提醒、管理成员，全程不需要跳出 DSH。

---

## 功能清单

### 账号与身份
- [x] 邮箱注册：注册后发送 **6 位验证码**，验证通过才能登录
- [x] 邮箱 + 密码登录，会话安全保存（Bearer）
- [x] 忘记密码：通过邮箱验证码在面板内**直接重置密码**（无需打开邮件链接）
- [x] 修改用户名、上传 / 更换头像
- [x] 退出登录

### 社区
- [x] 一键创建社区（公开 / 私有），自动生成**固定不变**的邀请码与默认频道
- [x] 公开社区直接加入；私有社区凭邀请码加入
- [x] **发现公开社区**：侧栏「＋」弹窗切到「发现」，浏览公开社区目录、按名称 / 简介搜索，已加入的一键进入
- [x] 我的社区列表：未读频道数 + `@` 提及未读数一目了然
- [x] 编辑社区名称 / 简介 / 可见性 / 头像
- [x] 成员管理：成员列表与搜索、设为 / 降级管理员、移除成员、**转让所有权**
- [x] 所有者可**删除社区**（频道、消息、成员级联清除）
- [x] 加入 / 自建社区数上限（各 10 个），防止滥用

### 频道
- [x] 三种互斥频道定位，侧边栏按类型区分图标：
  - 文字 —— 全员自由发言
  - 公告 —— **仅所有者 / 管理员可发**，普通成员只读
  - 求助 —— 用于提问问答（「已解决」闭环 API 就绪）
- [x] 频道的创建、改名、改主题、改类型、删除、排序

### 讨论组（话题）
- [x] 文字 / 话题频道下可开讨论组：独立成串、24 小时无人发言自动归档（发言即恢复）
- [x] **可见性**：公开（社区成员自由进出）/ 私密（非成员可见但加锁）
- [x] 私密组可设**进入密码**：有密码可凭密码进入；未设密码则只能由组内成员拉入
- [x] 组内成员可从社区成员中拉人、移出成员；成员可自行退出

### 消息
- [x] 文本消息，`@成员` 提及并高亮提醒
- [x] 附件：图片（内联预览）与任意文件（下载），一条消息最多 4 个
- [x] 编辑 / 删除消息（作者本人，或所在社区的所有者 / 管理员）
- [x] 实时收发：新消息、编辑、删除即时同步到所有在线成员

### 实时与未读
- [x] 每个频道一条 WebSocket 长连接，心跳保活、断线自动重连
- [x] 频道头部显示当前**在线人数**，点开可看在线成员与状态
- [x] 已读状态上报；社区栏未读气泡与 `@` 提及提醒

### 邀请与站内信
- [x] 邀请已注册用户加入（用户名或邮箱）→ 对方收到**站内信 + 邮件**
- [x] 收件箱：接受 / 拒绝邀请、已处理状态、一键全部已读、铃铛未读角标

### 分享
- [x] **频道快照**：把一个频道的最新消息打包成可下载的快照，链接可分享给他人
- [x] **分享 DSH 会话**：把本机一个 DSH 会话打包分享到社区；他人「克隆到会话」即还原出同样的会话并切过去
- [x] **分享广场**：公开社区的分享汇入广场，可浏览下载 / 克隆；「我的分享」里可查看、删除自己的分享
- [x] **分享卡片**：发消息时可附带一张自己创建的分享，卡片内嵌在消息里（类型徽标 + 标题 + 摘要，点击即下载）
- [x] 频道快照可流式下载落到本机克隆目录（`~/.dsh-talk/clones`）

> 说明：求助「已解决」标记 UI 等能力仍在打磨中，暂未列入功能清单。

---

## 使用它需要什么

- **DSH 本体**：`npx @deepseek-ai/dsh`
- **一个 dsh-talk Server**：官方会提供一个公共地址；也可以按下面的「自托管 Server」自己在本地或 Cloudflare 上跑一个。
- 首次使用在插件设置里填好 `serverUrl` 后，面板内用邮箱注册账号即可。

> 发信依赖 Resend 等事务邮件（验证码 / 重置密码 / 邀请邮件）。若 Server 未配置发信，请改看服务端日志里打印的验证码。

---

## 快速开始（本地跑通全栈）

### 0. 环境

- Node.js ≥ 20、pnpm ≥ 9、[Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- DSH：`npx @deepseek-ai/dsh`

### 1. 启动 Server

```bash
# 仓库根目录
pnpm install
pnpm dev:server      # Hono Worker，默认 http://127.0.0.1:8787
```

认证密钥写入仓库根 `.env`（predev 自动同步到 `packages/server/.dev.vars`，**不要提交**）：

```bash
BETTER_AUTH_SECRET=一个不少于32字符的随机串   # 必填
RESEND_API_KEY=re_xxx                        # 可选：配了才真正发邮件
# BETTER_AUTH_URL=http://127.0.0.1:8787      # 可选：对外地址
```

首次启动前生成并应用数据库迁移：

```bash
cd packages/server
pnpm db:generate     # 由 schema 生成迁移 SQL
pnpm db:apply-local  # 写入本地 D1
```

### 2. 构建并载入插件

```bash
pnpm build    # host/client 产物写入 lib/
pnpm dev      # overlay 模式：自动打包并启动 DSH Web（默认 http://127.0.0.1:3080）
```

侧栏底部出现 **dsh-talk（社区）** 入口即加载成功；改源码后 `pnpm dev` 会自动重打包，刷新页面即可。

### 3. 开始使用

1. 打开 dsh-talk 面板 → **注册**一个邮箱账号，查收 6 位验证码完成邮箱验证；
2. **创建**第一个社区（公开），或在 **「＋ 加入」** 里输入别人的邀请码加入私有社区；
3. 在社区里 **新建频道**（文字 / 公告 / 求助），进入频道聊天、传图、`@` 人；
4. 拉上第二个用户连同一个 Server 验证实时互通；忘记密码可以随时用「忘记密码？」通过验证码找回。

> 单机联调两台「用户」时，请使用两个独立的 DSH profile（不同端口、不同配置目录），连接同一个 Server。

---

## 架构一览

```mermaid
flowchart LR
    subgraph A["用户 A 的 DSH（本地）"]
        UI["dsh-talk 聊天面板（client）"]
        HOST["dsh-talk host<br/>本地配置 / 克隆会话"]
        UI <--> HOST
    end
    subgraph C["Cloudflare（Server）"]
        API["Worker<br/>REST + WebSocket"]
        DO["Durable Object<br/>每频道实时广播"]
        D1[("D1<br/>用户 / 社区 / 频道 / 消息 / 邀请")]
        R2[("R2<br/>附件 / 分享包")]
        API --> DO
        API <--> D1
        API <--> R2
    end
    UI -- "WSS + REST（Bearer）" --> API
```

- **client（浏览器）**：聊天界面、WebSocket 实时连接、附件直传、站内信。
- **host（Node.js）**：保存 serverUrl / token 等本地设置；读本机 DSH 会话并打包成分享包，也能把分享包还原成本地会话。
- **server（Cloudflare）**：唯一的数据中心——REST + WebSocket API、每频道一个 Durable Object 做实时扇出、D1 存业务数据、R2 存附件与分享包；完全自包含，可自托管。

---

## 常见配置

### 插件设置（DSH 设置页）

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `serverUrl` | `http://127.0.0.1:8787` | Server 地址；生产填 `https://<你的域名>` |
| `handle` | `""` | 当前账号用户名（登录后自动写入） |
| `token` | `""`（secret） | 会话令牌，登录后自动写入 |
| `autoReconnect` | `true` | WebSocket 断线自动重连 |
| `share.maxSizeMb` | `50` | 本地快照体积上限 |

### Server 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | 是 | 会话签名密钥，≥ 32 字符 |
| `BETTER_AUTH_URL` | 否 | 认证对外地址（邮箱链接基于它）；缺省按请求 Host 推导 |
| `RESEND_API_KEY` | 否 | 事务邮件发送密钥；未配置时验证码只打印到服务端日志 |

其余业务限额（单条消息 4000 字、单附件 25 MiB、每条 4 个附件、单分享包 50 MiB、每人加入 / 自建社区各 10 个等）在 `packages/server/src/constants.ts` 中集中维护。

---

## 仓库结构（给开发者）

```
dsh-talk/
├── packages/
│   ├── host/      # DSH 插件 host：注册 talk 设置 + 本地接口
│   ├── client/    # DSH 插件 client：React 聊天界面 + 连接层
│   ├── types/     # ⭐ 全栈共享类型：实体 / REST / WebSocket / RPC 契约
│   └── server/    # ⭐ Cloudflare Server：Hono Worker + D1 + R2 + Durable Object
├── lib/           # 打包产物（host + client）
├── tsdown.config.ts / cordis.yml / cordis.patch.yml
├── biome.json     # 格式 / lint / import 排序
└── package.json
```

常用命令（在仓库根目录执行）：

```bash
pnpm build                # host/client 打包到 lib/
pnpm dev                  # watch + overlay 启动 DSH Web
pnpm dev:server           # 本地启动 Server
pnpm typecheck            # 全 workspace 类型检查
pnpm lint / pnpm check    # Biome 质量检查
pnpm --filter @dsh-talk/server db:generate   # 改 schema 后生成迁移
pnpm --filter @dsh-talk/server db:apply-local
pnpm --filter @dsh-talk/server test:smoke    # WebSocket 冒烟测试（需本地 Server 已启动）
```

约定：改共享接口先改 `packages/types`；变更数据库先 `db:generate` 并审查 SQL；提交信息用 `feat(server): …` / `fix(client): …` 风格。

---

## License

MIT
