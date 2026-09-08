// ================================================================
// /api/shares —— 分享（session / workflow）—— 后续阶段实现，当前为 501 占位
// 附件上传不在这里：见 ./r2.ts（Worker 直写 R2）
// ================================================================

import type { CreateShareRequest, ListMySharesQuery, ListSharesQuery } from "@dsh-talk/types/api";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createBearerAuth, requireUserId } from "../lib/auth";
import { emptyOk, notImplemented } from "../lib/response";
import type { Env, HonoAppVariables } from "../types";

const shares = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();
shares.use("*", createBearerAuth("required"));

shares.get("/discover", (c) => {
  requireUserId(c);
  const _q = c.req.query() as unknown as ListSharesQuery;
  void _q;
  return notImplemented(c, "discover shares");
});

shares.get("/mine", (c) => {
  requireUserId(c);
  const _q = c.req.query() as unknown as ListMySharesQuery;
  void _q;
  return notImplemented(c, "mine shares");
});

shares.post(
  "/",
  validator("json", (v) => v as CreateShareRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as CreateShareRequest;
    void body;
    return notImplemented(c, "create share");
  },
);

shares.get("/:id", (c) => {
  requireUserId(c);
  const id = c.req.param("id");
  void id;
  return notImplemented(c, "get share (meta + signed download url)");
});

shares.delete("/:id", (c) => {
  requireUserId(c);
  return emptyOk(c);
});

export { shares as sharesRoutes };
