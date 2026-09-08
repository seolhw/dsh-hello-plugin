import type {
  CreateMessageRequest,
  ListMessagesQuery,
  ResolveHelpRequest,
  UpdateMessageRequest,
  UpdateReadStateRequest,
} from "@dsh-talk/types/api";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createBearerAuth, requireUserId } from "../lib/auth";
import { emptyOk, notImplemented } from "../lib/response";
import type { Env, HonoAppVariables } from "../types";

// 频道维度路由挂在 /api/channels/:id/messages ...
const channelMessages = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();
channelMessages.use("*", createBearerAuth("required"));

channelMessages.get("/:id/messages", (c) => {
  requireUserId(c);
  const _q = c.req.query() as unknown as ListMessagesQuery;
  void _q;
  return notImplemented(c, "list messages");
});

channelMessages.post(
  "/:id/messages",
  validator("json", (v) => v as CreateMessageRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as CreateMessageRequest;
    void body;
    return notImplemented(c, "post message");
  },
);

channelMessages.get("/:id/read-state", (c) => {
  requireUserId(c);
  return notImplemented(c, "get read state");
});

channelMessages.post(
  "/:id/read-state",
  validator("json", (v) => v as UpdateReadStateRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as UpdateReadStateRequest;
    void body;
    return notImplemented(c, "update read state");
  },
);

// 消息维度路由挂在 /api/messages/:id ...
const messages = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();
messages.use("*", createBearerAuth("required"));

messages.patch(
  "/:id",
  validator("json", (v) => v as UpdateMessageRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as UpdateMessageRequest;
    void body;
    return notImplemented(c, "patch message");
  },
);

messages.delete("/:id", (c) => {
  requireUserId(c);
  return emptyOk(c);
});

messages.post(
  "/:id/resolve",
  validator("json", (v) => v as ResolveHelpRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as ResolveHelpRequest;
    void body;
    return notImplemented(c, "resolve help");
  },
);

export { channelMessages as channelMessagesRoutes, messages as messagesRoutes };
