// ================================================================
// dsh-talk Server Worker 入口
//   身份认证：Better Auth 挂载在 /api/auth/*（承载全应用登录/注册/
//             GitHub OAuth/邮箱验证/改密/找回密码/会话；Bearer token 会话）
//   业务 REST：/api/communities|channels|messages|shares|r2（用 Better Auth 会话鉴权）
//   /ws：WebSocket upgrade -> RoomActor (DO)
// 部署方式：pnpm deploy (wrangler deploy)
// 本地：pnpm dev (wrangler dev --port 8787)
// ================================================================

import type { ExecutionContext } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { createBearerAuth, ensureAuthSchema, getAuth, requireUserId } from "./lib/auth";
import { bindExecutionCtx, unbindExecutionCtx } from "./lib/email";
import { HttpApiError } from "./lib/errors";
import { applyGlobalMiddleware } from "./lib/middleware";
import { notImplemented } from "./lib/response";
import { channelsRoutes, communitiesRoutes } from "./routes/communities";
import { channelMessagesRoutes, messagesRoutes } from "./routes/messages";
import { r2Routes, sharesRoutes } from "./routes/shares";
import type { Env, HonoAppVariables } from "./types";

// RoomActor DO 类在同脚本里（wrangler 会通过 [durable_objects] binding 找到）
export { RoomActor } from "./room";

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

// ----------------- Better Auth（/api/auth/*，接管身份/会话/注册/找回密码） -----------------
app.all("/api/auth/*", async (c) => {
  // 认证表（user/session/account/verification…）首访自举创建（幂等、按 isolate 只跑一次）
  await ensureAuthSchema(c.env);
  return getAuth(c.env).handler(c.req.raw);
});

// ----------------- 业务 REST API 分组 (/api/*) -----------------
app.route("/api/communities", communitiesRoutes);
app.route("/api/channels", channelMessagesRoutes); // /api/channels/:id/messages ...
app.route("/api/channels", channelsRoutes); // /api/channels/:id PATCH/DELETE 叠加
app.route("/api/messages", messagesRoutes);
app.route("/api/shares", sharesRoutes);
app.route("/api/r2", r2Routes);

// ----------------- WebSocket Upgrade (/ws) -----------------
// 浏览器 WS 无法自定义 Header，用 ?token=<session token> 做 Bearer 认证；
// 桌面/服务端直连亦可直接带 Authorization: Bearer。
// 通过鉴权后把用户身份透传给 Durable Object RoomActor。
app.get("/ws", createBearerAuth("required"), async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    throw HttpApiError.badRequest("expected Upgrade: websocket");
  }
  const uid = requireUserId(c);

  // MVP：所有连接路由到同一个全局房间管理器 DO id
  const globalRoomId = c.env.ROOM_ACTOR.idFromName("server-default");
  const stub = c.env.ROOM_ACTOR.get(globalRoomId);

  // 把子请求转发到 DO（带上 Upgrade 的原始 Request + 用户身份头）
  const url = new URL(c.req.url);
  url.pathname = "/ws/actor/connect";
  const forwardReq = new Request(url.toString(), c.req.raw as unknown as Request);
  forwardReq.headers.set("X-User-Id", uid);
  forwardReq.headers.set("X-Conn-Id", crypto.randomUUID());
  // 展示名/头像在 RoomActor 需要时再查认证库；MVP 先传 id
  forwardReq.headers.set("X-Handle", uid);

  return stub.fetch(forwardReq) as Promise<Response>;
});

// 给 DO 自己暴露一个 /ws/actor/connect 的握手路径（room.ts 的 handleConnect）
// DO.fetch 不经过 Hono，这里仅占位避免 404 fallback 误打
app.get("/ws/actor/connect", (c) =>
  notImplemented(c, "this path handled by RoomActor DO directly"),
);

// ----------------- Worker 模块入口（绑定 waitUntil 供邮件后台投递） -----------------
export default {
  async fetch(request: Request, env: Env, executionCtx: ExecutionContext): Promise<Response> {
    bindExecutionCtx(request, executionCtx);
    try {
      return await app.fetch(request, env, executionCtx);
    } finally {
      unbindExecutionCtx(request);
    }
  },
};
