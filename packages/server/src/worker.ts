// ================================================================
// dsh-talk Server Worker 入口
//   Hono 路由装配 + /ws WebSocket upgrade -> RoomActor (DO)
//   部署方式：pnpm deploy (wrangler deploy)
//   本地：pnpm dev (wrangler dev --port 8787)
// ================================================================

import { Hono } from "hono";
import { logger } from "hono/logger";
import { createBearerAuth, requireUserId, sha256HexAsync } from "./lib/auth";
import { HttpApiError } from "./lib/errors";
import { applyGlobalMiddleware } from "./lib/middleware";
import { notImplemented } from "./lib/response";
import auth from "./routes/auth";
import { channelsRoutes, communitiesRoutes } from "./routes/communities";
import { channelMessagesRoutes, messagesRoutes } from "./routes/messages";
import { r2Routes, sharesRoutes } from "./routes/shares";
import type { Env, HonoAppVariables } from "./types";

// RoomActor DO 类在同脚本里（wrangler 会通过 [durable_objects] binding 找到）
export { RoomActor } from "./room";
export { sha256HexAsync as _keep_sha_ref };

const app = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();

applyGlobalMiddleware(app);
app.use("*", logger());

// ----------------- 健康检查 -----------------
app.get("/healthz", (c) =>
  c.json({
    ok: true,
    ts: Date.now(),
    env: { DB: !!c.env.DB, R2: !!c.env.R2, ROOM: !!c.env.ROOM_ACTOR },
  }),
);

// ----------------- REST API 分组 (/api/*) -----------------
app.route("/api/auth", auth);
app.route("/api/communities", communitiesRoutes);
app.route("/api/channels", channelMessagesRoutes); // /api/channels/:id/messages ...
app.route("/api/channels", channelsRoutes); // /api/channels/:id PATCH/DELETE 叠加
app.route("/api/messages", messagesRoutes);
app.route("/api/shares", sharesRoutes);
app.route("/api/r2", r2Routes);

// ----------------- WebSocket Upgrade (/ws) -----------------
// 先做 Bearer 鉴权，再把连接转交给 Durable Object RoomActor
// 注意：Cloudflare Workers 下要把 101 Upgrade 交给 DO，做法是：
//   1. 在 Worker 中生成 WebSocketPair & 用 fetch(req, { headers }) 交给 DO（DO 内部 accept）
//   2. Worker 里也能 acceptWebSocket，但 DO 托管状态更合适
// 这里直接走：Worker 校验 token → 对 DO 发起一个带 Upgrade 的子 fetch
app.get("/ws", createBearerAuth("required"), async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    throw HttpApiError.badRequest("expected Upgrade: websocket");
  }
  const uid = requireUserId(c);

  // MVP：所有连接路由到同一个 DO id（全局唯一的房间管理器 DO），
  // 由它内部按 channelId 做 Map 管理。
  // 另一种路由策略：每个 channelId 一个 DO id（可水平扩展）
  const globalRoomId = c.env.ROOM_ACTOR.idFromName("server-default");
  const stub = c.env.ROOM_ACTOR.get(globalRoomId);

  // 把子请求转发到 DO（带上 Upgrade 的原始 Request + 用户身份头）
  const url = new URL(c.req.url);
  url.pathname = "/ws/actor/connect";
  const forwardReq = new Request(url.toString(), c.req.raw as unknown as Request);
  forwardReq.headers.set("X-User-Id", uid);
  forwardReq.headers.set("X-Conn-Id", crypto.randomUUID());
  // handle 后面 M1 时从 DB 查；MVP 直接用 id 占位
  forwardReq.headers.set("X-Handle", uid);

  return stub.fetch(forwardReq) as Promise<Response>;
});

// 给 DO 自己暴露一个 /ws/actor/connect 的握手路径（room.ts 的 handleConnect）
// Hono 里注册成返回 501 占位的 404 即可，因为真正处理这个路径的是 stub.fetch 命中的 DO.fetch
// DO.fetch 不经过 Hono，这里仅占位避免 404 fallback 误打
app.get("/ws/actor/connect", (c) =>
  notImplemented(c, "this path handled by RoomActor DO directly"),
);

// ----------------- 导出 -----------------
export default app;
