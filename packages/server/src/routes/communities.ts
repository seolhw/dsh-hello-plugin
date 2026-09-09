// ================================================================
// /api/communities/* 与 /api/channels/*（社区管理、频道、成员）
// 权限模型：
//   - 身份由 Better Auth 会话（Bearer）保证，见 lib/auth.ts
//   - 社区内角色：owner > admin > member（community_members 表）
//   - 浏览私密内容需成员身份；管理操作需 owner/admin；踢人/转让等需 owner
//   - owner 同时冗余在 communities.owner_id，以 owner_id 为最终权威
// ================================================================

import type {
  CreateChannelRequest,
  CreateCommunityRequest,
  DiscoverCommunitiesQuery,
  GetMyCommunitiesResponse,
  ListMembersQuery,
  UpdateChannelRequest,
  UpdateCommunityRequest,
  UpdateMemberRoleRequest,
} from "@dsh-talk/types/api";
import type { Community, CommunityMember, MemberRole, User } from "@dsh-talk/types/entities";
import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import {
  type ChannelRow,
  type CommunityMemberRow,
  type CommunityRow,
  channelReadStates,
  channels,
  communities,
  communityMembers,
} from "../db/schema";
import { getMembership, requireMember, requireModerator } from "../lib/access";
import { createBearerAuth, requireUserId } from "../lib/auth";
import { db as dbOf } from "../lib/db";
import { HttpApiError } from "../lib/errors";
import { newId, newInviteCode, newSlug } from "../lib/ids";
import { type AppCtx, emptyOk } from "../lib/response";
import { fetchUserById, fetchUsersByIds } from "../lib/users";
import type { Env, HonoAppVariables } from "../types";

// ---------------- 小工具 ----------------

async function jsonBody<T>(c: AppCtx): Promise<T> {
  try {
    return (await c.req.json()) as T;
  } catch {
    throw HttpApiError.badRequest("invalid JSON body");
  }
}

/** 查询必须命中一行（写后回读场景），否则按内部错误抛出 */
async function mustRow<T>(query: Promise<T[]>, what: string): Promise<T> {
  const list = await query;
  const first = list[0];
  if (first === undefined) throw HttpApiError.internal(`${what} row not found`);
  return first;
}

function parseLimitOffset(
  query: Record<string, string | undefined>,
  defaultLimit = 20,
  maxLimit = 100,
): { limit: number; offset: number } {
  const rawLimit = Number.parseInt(query.limit ?? "", 10);
  const rawOffset = Number.parseInt(query.offset ?? "", 10);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  return { limit, offset };
}

/** 验证社区名 */
function validateCommunityName(name: string): void {
  const n = name.trim();
  if (n.length < 1 || n.length > 50) throw HttpApiError.badRequest("name 长度需在 1~50 之间");
}

function mapCommunity(row: CommunityRow): Community {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    privacy: row.privacy,
    ownerId: row.ownerId,
    iconUrl: row.iconUrl,
    bannerUrl: row.bannerUrl,
    inviteCode: row.inviteCode,
    memberCount: row.memberCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapChannel(row: ChannelRow): ChannelRow {
  return row;
}

async function listChannels(
  db: ReturnType<typeof dbOf>,
  communityId: string,
): Promise<ChannelRow[]> {
  return db
    .select()
    .from(channels)
    .where(eq(channels.communityId, communityId))
    .orderBy(asc(channels.position));
}

// ================================================================
// 社区路由
// ================================================================

const communitiesApi = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();

export const communitiesRoutes = communitiesApi;

// 身份由 Better Auth 会话（Bearer）解析并注入 userId；入口再判断成员/角色
communitiesApi.use("*", createBearerAuth("required"));

// --- GET /discover —— 公开社区目录 ---
communitiesApi.get("/discover", async (c) => {
  const db = dbOf(c);
  const q = c.req.query() as DiscoverCommunitiesQuery;
  const { limit, offset } = parseLimitOffset(c.req.query());
  const keyword = q.q?.trim();
  const conds = [eq(communities.privacy, "public")];
  if (keyword) {
    conds.push(
      or(
        like(communities.name, `%${keyword}%`),
        like(communities.description, `%${keyword}%`),
      ) as never,
    );
  }
  const totalRows = await db
    .select({ value: count() })
    .from(communities)
    .where(and(...conds));
  const total = totalRows[0]?.value ?? 0;
  const order = q.sort === "newest" ? desc(communities.createdAt) : desc(communities.memberCount);
  const rows = await db
    .select()
    .from(communities)
    .where(and(...conds))
    .orderBy(order, desc(communities.createdAt))
    .limit(limit)
    .offset(offset);
  return c.json({ items: rows.map(mapCommunity), total, offset, limit });
});

// --- GET /mine —— 我加入的社区 ---
communitiesApi.get("/mine", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const rows = await db
    .select({
      communityId: communityMembers.communityId,
      role: communityMembers.role,
    })
    .from(communityMembers)
    .where(eq(communityMembers.userId, userId));
  const result: GetMyCommunitiesResponse = [];
  for (const m of rows) {
    const communityRow = (
      await db.select().from(communities).where(eq(communities.id, m.communityId)).limit(1)
    )[0];
    if (!communityRow) continue;
    // 该社区有未读消息的频道数（未读 = 频道最后一条消息晚于该用户 read_state.last_read_at）
    const unreadRow = await db
      .select({ value: count() })
      .from(channels)
      .where(
        and(
          eq(channels.communityId, communityRow.id),
          sql`EXISTS (SELECT 1 FROM messages m WHERE m.channel_id = ${channels.id} AND m.created_at > COALESCE((SELECT rs.last_read_at FROM channel_read_states rs WHERE rs.channel_id = ${channels.id} AND rs.user_id = ${userId}), 0))`,
        ),
      );
    const unreadMentionsRow = await db
      .select({ value: sql<number>`COALESCE(SUM(${channelReadStates.unreadMentions}), 0)` })
      .from(channelReadStates)
      .innerJoin(channels, eq(channelReadStates.channelId, channels.id))
      .where(and(eq(channelReadStates.userId, userId), eq(channels.communityId, communityRow.id)));
    result.push({
      ...mapCommunity(communityRow),
      role: m.role,
      unreadChannels: unreadRow[0]?.value ?? 0,
      unreadMentions: Number(unreadMentionsRow[0]?.value ?? 0),
    });
  }
  return c.json(result);
});

// --- POST / —— 创建社区（含默认频道、owner 成员、邀请码） ---
communitiesApi.post("/", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const body = await jsonBody<CreateCommunityRequest>(c);
  validateCommunityName(body.name ?? "");

  // 限额（常量在 constants.ts）
  const memberCountRows = await db
    .select({ value: count() })
    .from(communityMembers)
    .where(eq(communityMembers.userId, userId));
  const totalOwned = await db
    .select({ value: count() })
    .from(communities)
    .where(eq(communities.ownerId, userId));
  if ((memberCountRows[0]?.value ?? 0) >= 10)
    throw new HttpApiError(409, "COMMUNITY_TOTAL_LIMIT", "超过最多加入的社区数（10）");
  if ((totalOwned[0]?.value ?? 0) >= 10)
    throw new HttpApiError(409, "COMMUNITY_TOTAL_LIMIT", "自建社区已达上限");

  const id = newId();
  const now = Date.now();
  // 社区短标识：创建时自动生成（nanoid，数字+大小写字母、8 位、无符号），
  // 不依赖用户输入，并在此做唯一性兜底（正常几乎不会撞）。
  let slug = newSlug();
  for (let i = 0; i < 5; i += 1) {
    const dup = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
    if (dup.length === 0) break;
    slug = newSlug();
  }
  const inviteCode = newInviteCode();
  const communityId = id;
  await db.insert(communities).values({
    id: communityId,
    name: body.name.trim(),
    slug,
    description: body.description ?? null,
    privacy: body.privacy ?? "public",
    ownerId: userId,
    iconUrl: body.iconUrl ?? null,
    bannerUrl: body.bannerUrl ?? null,
    inviteCode,
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(communityMembers).values({
    communityId,
    userId,
    role: "owner",
    joinedAt: now,
  });
  // 默认频道：全员（文字讨论）+ 公告（announcement，只有管理员可发）
  const defaults = [
    { name: "全员", kind: "text" as const, position: 0 },
    { name: "公告", kind: "announcement" as const, position: 1 },
  ];
  const createdChannels: ChannelRow[] = [];
  for (const d of defaults) {
    const channelId = newId();
    await db.insert(channels).values({
      id: channelId,
      communityId,
      name: d.name,
      kind: d.kind,
      position: d.position,
      topic: null,
      isHelp: false,
      isShowcase: false,
      createdAt: now,
      updatedAt: now,
    });
    createdChannels.push({
      id: channelId,
      communityId,
      name: d.name,
      kind: d.kind,
      position: d.position,
      topic: null,
      isHelp: false,
      isShowcase: false,
      createdAt: now,
      updatedAt: now,
    });
  }
  const created = await mustRow(
    db.select().from(communities).where(eq(communities.id, communityId)).limit(1),
    "community",
  );
  return c.json({ ...mapCommunity(created), channels: createdChannels, inviteCode }, 201);
});

// --- GET /:id —— 详情（公开可看/私密需成员） ---
communitiesApi.get("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const communityId = c.req.param("id");
  const row = (
    await db.select().from(communities).where(eq(communities.id, communityId)).limit(1)
  )[0];
  if (!row) throw HttpApiError.notFound("community not found");
  const membership = await getMembership(db, communityId, userId);
  if (!membership && row.privacy === "private") {
    throw HttpApiError.forbidden("private community");
  }
  const myRole = membership?.role ?? null;
  const chans = await listChannels(db, communityId);
  return c.json({ ...mapCommunity(row), channels: chans.map(mapChannel), myRole });
});

// --- PATCH /:id —— 改社区（owner/admin） ---
communitiesApi.patch("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const communityId = c.req.param("id");
  const row = (
    await db.select().from(communities).where(eq(communities.id, communityId)).limit(1)
  )[0];
  if (!row) throw HttpApiError.notFound("community not found");
  await requireModerator(db, communityId, userId);

  const body = await jsonBody<UpdateCommunityRequest>(c);
  if (body.name !== undefined) validateCommunityName(body.name);
  const patch: Partial<CommunityRow> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.description !== undefined) patch.description = body.description;
  if (body.privacy !== undefined) patch.privacy = body.privacy;
  if (body.iconUrl !== undefined) patch.iconUrl = body.iconUrl;
  if (body.bannerUrl !== undefined) patch.bannerUrl = body.bannerUrl;
  if (body.slug !== undefined) {
    const slug = body.slug?.trim()?.toLowerCase() ?? null;
    if (slug) {
      const dup = await db
        .select()
        .from(communities)
        .where(and(eq(communities.slug, slug), sql`id != ${communityId}`))
        .limit(1);
      if (dup.length > 0) throw HttpApiError.conflict("slug 已被占用");
    }
    patch.slug = slug;
  }
  if (Object.keys(patch).length === 0) throw HttpApiError.badRequest("empty patch");
  patch.updatedAt = Date.now();
  await db
    .update(communities)
    .set(patch as never)
    .where(eq(communities.id, communityId));
  const updated = await mustRow(
    db.select().from(communities).where(eq(communities.id, communityId)).limit(1),
    "community",
  );
  return c.json(mapCommunity(updated));
});

// --- POST /:id/rotate-invite —— 轮换邀请码（owner/admin） ---
communitiesApi.post("/:id/rotate-invite", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const communityId = c.req.param("id");
  const row = (
    await db.select().from(communities).where(eq(communities.id, communityId)).limit(1)
  )[0];
  if (!row) throw HttpApiError.notFound("community not found");
  await requireModerator(db, communityId, userId);
  const code = newInviteCode();
  await db
    .update(communities)
    .set({ inviteCode: code, updatedAt: Date.now() })
    .where(eq(communities.id, communityId));
  return c.json({ inviteCode: code });
});

// --- POST /join-by-code —— 用邀请码加入 ---
communitiesApi.post("/join-by-code", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const body = await jsonBody<{ inviteCode: string }>(c);
  const code = body.inviteCode?.trim();
  if (!code) throw HttpApiError.badRequest("inviteCode required");
  const row = (
    await db.select().from(communities).where(eq(communities.inviteCode, code)).limit(1)
  )[0];
  if (!row) throw new HttpApiError(400, "INVITE_CODE_INVALID", "invite code 无效");
  return joinCommunity(db, c, userId, row);
});

// --- POST /:id/join —— 加入公开社区；私有必须用 /join-by-code ---
communitiesApi.post("/:id/join", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const communityId = c.req.param("id");
  const row = (
    await db.select().from(communities).where(eq(communities.id, communityId)).limit(1)
  )[0];
  if (!row) throw HttpApiError.notFound("community not found");
  if (row.privacy !== "public") {
    throw HttpApiError.forbidden("private community，请用邀请码加入（/join-by-code）");
  }
  return joinCommunity(db, c, userId, row);
});

async function joinCommunity(
  db: ReturnType<typeof dbOf>,
  c: AppCtx,
  userId: string,
  communityRow: CommunityRow,
): Promise<Response> {
  const existing = await getMembership(db, communityRow.id, userId);
  if (!existing) {
    await db.insert(communityMembers).values({
      communityId: communityRow.id,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });
    await db
      .update(communities)
      .set({ memberCount: communityRow.memberCount + 1 })
      .where(eq(communities.id, communityRow.id));
  }
  const chans = await listChannels(db, communityRow.id);
  const role = (existing?.role ?? "member") as MemberRole;
  return c.json({ ...mapCommunity(communityRow), channels: chans.map(mapChannel), myRole: role });
}

// --- POST /:id/leave —— 退出（owner 需先转让） ---
communitiesApi.post("/:id/leave", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const communityId = c.req.param("id");
  const member = await getMembership(db, communityId, userId);
  if (!member) throw HttpApiError.notFound("not a member");
  if (member.role === "owner") {
    throw HttpApiError.badRequest("owner 不能退出社区，请先转让所有权");
  }
  await db
    .delete(communityMembers)
    .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)));
  const row = (
    await db.select().from(communities).where(eq(communities.id, communityId)).limit(1)
  )[0];
  if (row)
    await db
      .update(communities)
      .set({ memberCount: Math.max(0, row.memberCount - 1) })
      .where(eq(communities.id, communityId));
  return c.json({ ok: true });
});

// ================================================================
// 频道（创建挂在社区下 /:id/channels）
// ================================================================

// --- POST /:id/channels —— 新增频道（owner/admin） ---
communitiesApi.post("/:id/channels", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const communityId = c.req.param("id");
  const communityRow = (
    await db.select().from(communities).where(eq(communities.id, communityId)).limit(1)
  )[0];
  if (!communityRow) throw HttpApiError.notFound("community not found");
  await requireModerator(db, communityId, userId);

  const body = await jsonBody<CreateChannelRequest>(c);
  const name = body.name?.trim();
  if (!name || name.length > 80) throw HttpApiError.badRequest("频道名长度需在 1~80 之间");
  const now = Date.now();
  let position = body.position ?? 0;
  if (body.position === undefined) {
    const maxRow = await db
      .select({ value: sql<number>`COALESCE(MAX(position), 0)` })
      .from(channels)
      .where(eq(channels.communityId, communityId));
    position = (maxRow[0]?.value ?? 0) + 1;
  }
  const id = newId();
  await db.insert(channels).values({
    id,
    communityId,
    name,
    kind: body.kind ?? "text",
    position,
    topic: body.topic ?? null,
    isHelp: body.isHelp ?? false,
    isShowcase: body.isShowcase ?? false,
    createdAt: now,
    updatedAt: now,
  });
  const row = await mustRow(
    db.select().from(channels).where(eq(channels.id, id)).limit(1),
    "channel",
  );
  return c.json(mapChannel(row), 201);
});

// ================================================================
// 成员
// ================================================================

// --- GET /:id/members ---
communitiesApi.get("/:id/members", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const communityId = c.req.param("id");
  await requireMember(db, communityId, userId);
  const q = c.req.query() as ListMembersQuery;
  const { limit, offset } = parseLimitOffset(c.req.query(), 50, 200);

  const conds = [eq(communityMembers.communityId, communityId)];
  if (q.role) conds.push(eq(communityMembers.role, q.role));
  const rows = await db
    .select()
    .from(communityMembers)
    .where(and(...conds))
    .orderBy(desc(communityMembers.joinedAt));

  const users = await fetchUsersByIds(
    c.env.DB,
    rows.map((r) => r.userId),
  );
  const userById = new Map(users.map((u) => [u.id, u]));
  let entries = rows
    .map((r) => ({ member: r, user: userById.get(r.userId) ?? null }))
    .filter((e): e is { member: CommunityMemberRow; user: User } => e.user !== null);
  if (q.q?.trim()) {
    const needle = q.q.trim().toLowerCase();
    entries = entries.filter(
      (e) =>
        e.user.handle.toLowerCase().includes(needle) ||
        (e.user.displayName ?? "").toLowerCase().includes(needle),
    );
  }
  const total = entries.length;
  const page = entries.slice(offset, offset + limit);
  const items = page.map((e) => ({
    ...(e.member as unknown as CommunityMember),
    user: e.user,
  }));
  return c.json({ items, total, offset, limit });
});

// --- PATCH /:id/members/:userId/role —— 角色变更（含 owner 转让） ---
communitiesApi.patch("/:id/members/:userId/role", async (c) => {
  const db = dbOf(c);
  const actorId = requireUserId(c);
  const communityId = c.req.param("id");
  const targetId = c.req.param("userId");
  const body = await jsonBody<UpdateMemberRoleRequest>(c);
  const targetRole: MemberRole = body.role;
  if (targetRole !== "owner" && targetRole !== "admin" && targetRole !== "member") {
    throw HttpApiError.badRequest("invalid role");
  }
  const communityRow = (
    await db.select().from(communities).where(eq(communities.id, communityId)).limit(1)
  )[0];
  if (!communityRow) throw HttpApiError.notFound("community not found");

  const actor = await requireMember(db, communityId, actorId);
  const target = await requireMember(db, communityId, targetId);

  const actorIsOwner = actor.role === "owner";
  if (!actorIsOwner && actor.role !== "admin") throw HttpApiError.forbidden("owner/admin required");
  // 被操作对象是 owner 时，只允许 owner 本人发起转让
  if (target.role === "owner" && !actorIsOwner)
    throw HttpApiError.forbidden("只有 owner 能调整 owner");
  // admin 不能把别人提为 owner
  if (targetRole === "owner" && !actorIsOwner)
    throw HttpApiError.forbidden("只有 owner 能指定新 owner");

  if (targetRole === "owner") {
    // 转让：新 owner = target，旧 owner 降为 admin
    if (targetId !== communityRow.ownerId) {
      const now = Date.now();
      await db
        .update(communityMembers)
        .set({ role: "admin" })
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userId, communityRow.ownerId),
          ),
        );
      await db
        .update(communityMembers)
        .set({ role: "owner" })
        .where(
          and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, targetId)),
        );
      await db
        .update(communities)
        .set({ ownerId: targetId, updatedAt: now })
        .where(eq(communities.id, communityId));
    }
  } else {
    // 普通角色变更：不能动 owner
    if (target.role === "owner")
      throw HttpApiError.forbidden("不能修改 owner 角色（owner 只能整体转让）");
    await db
      .update(communityMembers)
      .set({ role: targetRole })
      .where(
        and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, targetId)),
      );
  }

  const updatedMember = await mustRow(
    db
      .select()
      .from(communityMembers)
      .where(
        and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, targetId)),
      )
      .limit(1),
    "membership",
  );
  const user = await fetchUserById(c.env.DB, targetId);
  if (!user) throw HttpApiError.notFound("user not found");
  return c.json({ ...(updatedMember as unknown as CommunityMember), user });
});

// --- DELETE /:id/members/:userId —— 踢人（owner/admin；不能踢 owner；不能从 admin 踢 owner 等） ---
communitiesApi.delete("/:id/members/:userId", async (c) => {
  const db = dbOf(c);
  const actorId = requireUserId(c);
  const communityId = c.req.param("id");
  const targetId = c.req.param("userId");
  const actor = await requireMember(db, communityId, actorId);
  if (actor.role !== "owner" && actor.role !== "admin")
    throw HttpApiError.forbidden("owner/admin required");
  const target = await requireMember(db, communityId, targetId);
  if (target.role === "owner") throw HttpApiError.badRequest("不能移除 owner");
  if (targetId === actorId) throw HttpApiError.badRequest("请用 leave 退出社区");
  await db
    .delete(communityMembers)
    .where(
      and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, targetId)),
    );
  const row = (
    await db.select().from(communities).where(eq(communities.id, communityId)).limit(1)
  )[0];
  if (row)
    await db
      .update(communities)
      .set({ memberCount: Math.max(0, row.memberCount - 1) })
      .where(eq(communities.id, communityId));
  return emptyOk(c);
});

// ================================================================
// 频道独立路由（/api/channels/:id）—— 改 / 删
// ================================================================

const channelsApi = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();

export const channelsRoutes = channelsApi;

channelsApi.use("*", createBearerAuth("required"));

async function loadChannelOr404(db: ReturnType<typeof dbOf>, channelId: string) {
  const row = (await db.select().from(channels).where(eq(channels.id, channelId)).limit(1))[0];
  if (!row) throw HttpApiError.notFound("channel not found");
  return row;
}

// --- PATCH /:id ---
channelsApi.patch("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const body = await jsonBody<UpdateChannelRequest>(c);
  const row = await loadChannelOr404(db, c.req.param("id"));
  await requireModerator(db, row.communityId, userId);
  const patch: Partial<ChannelRow> = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name || name.length > 80) throw HttpApiError.badRequest("频道名长度需在 1~80 之间");
    patch.name = name;
  }
  if (body.topic !== undefined) patch.topic = body.topic;
  if (body.position !== undefined) patch.position = body.position;
  if (body.isHelp !== undefined) patch.isHelp = body.isHelp;
  if (body.isShowcase !== undefined) patch.isShowcase = body.isShowcase;
  if (body.kind !== undefined) patch.kind = body.kind;
  if (Object.keys(patch).length === 0) throw HttpApiError.badRequest("empty patch");
  patch.updatedAt = Date.now();
  await db
    .update(channels)
    .set(patch as never)
    .where(eq(channels.id, row.id));
  const updated = await mustRow(
    db.select().from(channels).where(eq(channels.id, row.id)).limit(1),
    "channel",
  );
  return c.json(mapChannel(updated));
});

// --- DELETE /:id ---
channelsApi.delete("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadChannelOr404(db, c.req.param("id"));
  await requireModerator(db, row.communityId, userId);
  await db.delete(channels).where(eq(channels.id, row.id));
  return emptyOk(c);
});
