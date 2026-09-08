# M0-5 Cloudflare WS/DO/D1/R2 冒烟与接口设计

> 对应任务：docs/TASKS.md `M0-5`。目的：消除 R4（CF WS/DO 约束）并为 R7（建社区限流/发现目录）定接口；产出 M1 服务端落地依据。
> 状态：完成（本地 Miniflare 冒烟全绿；生产差异已注明）。

## 1. 冒烟结果（本地 wrangler 4.129.1 + Miniflare，无 CF 账号）

`experiments/m0-5/`（worker.ts / room.ts / migrations/0001_init.sql / probe.mjs）：

```
PASS ready          GET /api/ping
PASS ping
PASS d1 insert+list POST+GET /api/msg  （D1 本地库，migrations 已 apply）
PASS r2 put+get     PUT/GET /api/upload/<key> （R2 本地桶）
PASS ws broadcast via DO  （两个 WS 客户端同频道互达 + ping/pong）
SMOKE OK
```

复现（本机沙箱注记）：
- 安装 wrangler 需把 npm cache 指到工作区（否则写用户缓存被沙箱拒）：`npm i --no-save --ignore-scripts --cache <workspace>\npm-cache --prefix experiments\m0-5 wrangler`。
- `wrangler dev`/`d1` 会启动原生 `workerd` → 需完整权限；`d1 migrations apply talk-smoke --local -c <toml>`。
- dev 时若进程被杀会残留 workerd：`taskkill /F /IM workerd.exe`（完整权限）。
- 本机系统代理会拦截 localhost 探测（502）→ 探测用 Node fetch 或 `HttpClientHandler.UseProxy=false`。

## 2. 生产架构结论（R4 解除）

- **DO WebSocket 必须用 Hibernation 类方法**（实测：addEventListener 会导致运行时崩溃）：`fetch` 里 `state.acceptWebSocket(server)` + 返回 101；消息处理用类方法 `webSocketMessage(ws, message)`，广播用 `state.getWebSockets()` 排除发送者（room.ts 即模板）。心跳 25s/60s、重连 `cursor` 补漏、`webSocketClose` 清理照搬。
- **每个频道一个 DO**（`ROOM.idFromName(channelId)`，channelId 全局唯一含社区前缀 `c_<community>_<key>`），广播局部化；单 DO 连接上限远超 MVP 规模（§13）。
- **写穿 D1 再广播**：REST `POST /messages` 先落 D1 再经 Worker 通知 RoomActor 广播（幂等/重试安全），历史以 D1 为准、WS 只做实时增量。
- **R2 两段式上传**：生产用预签名 URL（Worker 生成 → 客户端直传/直下，Worker 不中转）；本地 Miniflare 无预签名支持 → 冒烟用直接 binding PUT（等价验证存储路径），生产差异仅在 URL 签发层。
- D1 表/索引以 PRD §9 DDL 为准；本地开发 `wrangler dev` + `d1 migrations apply --local` 即可全栈联调。

## 3. R7：建社区限流与发现目录接口设计

### 3.1 建社区限流（防滥用，FR-G1 附则）
- D1：`community_creations(user TEXT, day TEXT, cnt INTEGER, PRIMARY KEY(user, day))`（冒烟迁移已含）。
- 创建前：当日计数 < `COMMUNITY_CREATE_DAILY_LIMIT`（默认 3）且累计（`COUNT(*)` over days 或独立 `community_counts` 表）< `MAX_COMMUNITIES_PER_USER`（默认 10）；通过则 `INSERT … ON CONFLICT DO UPDATE cnt=cnt+1`（与社区创建同事务/同 DO 或顺序执行避免竞态）。
- 超限返回 429 `{error:"community_rate_limited",retryAfter}`；环境变量覆盖默认值。

### 3.2 发现目录（FR-G3）
- `GET /api/communities/discover?cursor=<createdAt,id>&limit=20`：
  - 仅 `visibility='public' AND archived_at IS NULL`；
  - 返回 `{items:[{communityId,name,description,memberCount,owner:{id,handle},createdAt}], nextCursor?}`；
  - `memberCount` 用 `community_members` 按社区 COUNT 的物化列（或低频 JOIN，MVP 规模 JOIN 可接受；P1 物化）；
  - 稳定排序 `created_at DESC, community_id`（游标分页防翻页抖动）。
- 加入/退出、私有码校验见 PRD §10.2。

## 4. 生产差异与已知项

| 项 | 本地（wrangler dev） | 生产（Cloudflare） |
| --- | --- | --- |
| workerd | 单进程本地 | 全球边缘 + DO 单点 |
| D1 | sqlite 本地文件（`--local`） | 托管 D1 |
| R2 | 本地模拟 | 预签名 URL 直传/直下 |
| WS | 同上模式 | DO Hibernation 同 API |
| 认证/CORS | 冒烟未做 | Bearer 中间件 + Origin 白名单（M1 实现，§8.4/§12） |

## 5. 相关文件
- `experiments/m0-5/`：wrangler.toml、migrations/0001_init.sql、src/{worker,room}.ts、probe.mjs
- PRD §8–§10、§9 DDL
