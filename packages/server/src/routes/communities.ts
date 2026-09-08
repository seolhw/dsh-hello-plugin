import type {
  CreateChannelRequest,
  CreateCommunityRequest,
  DiscoverCommunitiesQuery,
  JoinByInviteRequest,
  ListMembersQuery,
  RotateInviteRequest,
  UpdateChannelRequest,
  UpdateCommunityRequest,
  UpdateMemberRoleRequest,
} from "@dsh-talk/types/api";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createBearerAuth, requireUserId } from "../lib/auth";
import { emptyOk, notImplemented } from "../lib/response";
import type { Env, HonoAppVariables } from "../types";

const communities = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();
communities.use("*", createBearerAuth("required"));

// --- 列表 / 发现 ---
communities.get("/discover", (c) => {
  requireUserId(c);
  const _q = c.req.query() as unknown as DiscoverCommunitiesQuery;
  void _q;
  return notImplemented(c, "communities/discover");
});

communities.get("/mine", (c) => {
  requireUserId(c);
  return notImplemented(c, "communities/mine");
});

// --- 社区 CRUD ---
communities.post(
  "/",
  validator("json", (v) => v as CreateCommunityRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as CreateCommunityRequest;
    // TODO: 建社区 + 默认频道 + 邀请码
    void body;
    return notImplemented(c, "POST communities");
  },
);

communities.get("/:id", (c) => {
  requireUserId(c);
  const id = c.req.param("id");
  void id;
  return notImplemented(c, "GET communities/:id");
});

communities.patch(
  "/:id",
  validator("json", (v) => v as UpdateCommunityRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as UpdateCommunityRequest;
    void body;
    return notImplemented(c, "PATCH communities/:id");
  },
);

communities.post(
  "/:id/rotate-invite",
  validator("json", (v) => v as RotateInviteRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as RotateInviteRequest;
    void body;
    return notImplemented(c, "rotate-invite");
  },
);

communities.post(
  "/join-by-code",
  validator("json", (v) => v as JoinByInviteRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as JoinByInviteRequest;
    void body;
    return notImplemented(c, "join-by-code");
  },
);

communities.post("/:id/join", (c) => {
  requireUserId(c);
  return notImplemented(c, "POST communities/:id/join");
});

communities.post("/:id/leave", (c) => {
  requireUserId(c);
  return notImplemented(c, "leave");
});

// --- 频道 ---
communities.post(
  "/:id/channels",
  validator("json", (v) => v as CreateChannelRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as CreateChannelRequest;
    void body;
    return notImplemented(c, "POST channel");
  },
);

// 频道独立路由挂在 /api/channels/:id（见下方 channels）

// --- 成员 ---
communities.get("/:id/members", (c) => {
  requireUserId(c);
  // TODO: ListMembersQuery (role / q / limit / offset)
  const _q = c.req.query() as unknown as ListMembersQuery;
  void _q;
  return notImplemented(c, "list members");
});

communities.patch(
  "/:id/members/:userId/role",
  validator("json", (v) => v as UpdateMemberRoleRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as UpdateMemberRoleRequest;
    void body;
    return notImplemented(c, "update member role");
  },
);

communities.delete("/:id/members/:userId", (c) => {
  requireUserId(c);
  return notImplemented(c, "remove member");
});

// ------- 频道独立（PATCH / DELETE /api/channels/:id） -------
const channels = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();
channels.use("*", createBearerAuth("required"));

channels.patch(
  "/:id",
  validator("json", (v) => v as UpdateChannelRequest),
  async (c) => {
    requireUserId(c);
    const body = c.req.valid("json" as never) as UpdateChannelRequest;
    void body;
    return notImplemented(c, "PATCH channel");
  },
);

channels.delete("/:id", (c) => {
  requireUserId(c);
  return emptyOk(c);
});

export { channels as channelsRoutes, communities as communitiesRoutes };
