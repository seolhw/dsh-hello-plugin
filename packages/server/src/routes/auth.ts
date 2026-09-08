import type { ExchangeInviteRequest, UpdateMeRequest } from "@dsh-talk/types/api";
import { Hono } from "hono";
import { createBearerAuth, requireUserId } from "../lib/auth";
import { notImplemented } from "../lib/response";
import type { Env, HonoAppVariables } from "../types";

const auth = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();

// 公共：注册码换令牌（不需要 Bearer）
auth.post("/exchange-invite", async (c) => {
  const body = (await c.req.json()) as ExchangeInviteRequest;
  void body;
  return notImplemented(c, "auth/exchange-invite: persist user + return token");
});

// 以下需要 Bearer
auth.use("*", createBearerAuth("required"));

auth.get("/me", (c) => {
  const uid = requireUserId(c);
  void uid;
  return notImplemented(c, "auth/me: query users by token");
});

auth.patch("/me", async (c) => {
  requireUserId(c);
  const body = (await c.req.json()) as UpdateMeRequest;
  void body;
  return notImplemented(c, "auth/me: patch profile");
});

auth.post("/logout", (c) => {
  requireUserId(c);
  return notImplemented(c, "auth/logout: revoke current token if session-table present");
});

export default auth;
