import type {
  CreateShareRequest,
  ListMySharesQuery,
  ListSharesQuery,
  R2SignedUploadRequest,
} from "@dsh-talk/types/api";
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

// R2 通用签名（分享、消息附件、头像、社区图 都走这里）
const r2 = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();
r2.use("*", createBearerAuth("required"));

r2.post(
  "/sign-upload",
  validator("json", (v) => v as R2SignedUploadRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as R2SignedUploadRequest;
    void body;
    return notImplemented(c, "r2 sign upload");
  },
);

export { r2 as r2Routes, shares as sharesRoutes };
