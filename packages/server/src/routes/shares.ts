// ================================================================
// /api/shares/* —— 分享（两类来源）
//   POST   /snapshot      频道快照：把某频道最近消息打成 JSON 包 → R2 + 元数据
//   POST   /agent-session 会话分享：host 打包 DSH 会话后直传 R2，这里只登记元数据
//   GET    /mine          我创建的分享
//   GET    /discover      公开分享流（仅 isPublic=true）
//   GET    /:id           元数据 + downloadUrl（作者 / 公开 / 来源社区成员）
//   DELETE /:id           删除自己的分享（含 R2 包体）
// 权限：快照须为该频道社区成员；isPublic 仅对「公开社区」的来源置 true。
// ================================================================

import type {
  CreateAgentSessionShareRequest,
  CreateShareRequest,
  ListSharesQuery,
} from "@dsh-talk/types/api";
import type { Share, ShareKind, User } from "@dsh-talk/types/entities";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { MAX_SHARE_BYTES } from "../constants";
import {
  channels,
  communities,
  type MessageRow,
  messages,
  type ShareRow,
  shares,
} from "../db/schema";
import { requireMember } from "../lib/access";
import { createBearerAuth, requireUserId } from "../lib/auth";
import { db as dbOf } from "../lib/db";
import { HttpApiError } from "../lib/errors";
import { newId } from "../lib/ids";
import { type AppCtx, emptyOk } from "../lib/response";
import { fetchUserById } from "../lib/users";
import type { Env, HonoAppVariables } from "../types";

const api = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();
export const sharesRoutes = api;

api.use("*", createBearerAuth("required"));

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function rowToShare(row: ShareRow): Share {
  return {
    id: row.id,
    authorId: row.authorId,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    coverUrl: row.coverUrl,
    r2Key: row.r2Key,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    manifest: parseJson<Record<string, unknown>>(row.manifest) ?? {},
    public: row.isPublic,
    downloadCount: row.downloadCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function authorOf(c: AppCtx, userId: string): Promise<User> {
  const user = await fetchUserById(c.env.DB, userId);
  if (!user) throw HttpApiError.internal("user not found");
  return user;
}

async function loadShareRow(c: AppCtx, shareId: string): Promise<ShareRow> {
  const db = dbOf(c);
  const row = (await db.select().from(shares).where(eq(shares.id, shareId)).limit(1))[0];
  if (!row) throw HttpApiError.notFound("share not found");
  return row;
}

/** 快照来源社区（manifest 里记录 communityId） */
function snapshotCommunityId(share: Share): string | null {
  const communityId = share.manifest?.communityId;
  return typeof communityId === "string" ? communityId : null;
}

// ---------------- 列表：mine / discover ----------------

api.get("/mine", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const rawLimit = c.req.query("limit") ?? "";
  const limit = Math.min(Math.max(Number.parseInt(rawLimit, 10) || 20, 1), 100);
  const rows = await db
    .select()
    .from(shares)
    .where(eq(shares.authorId, userId))
    .orderBy(desc(shares.createdAt))
    .limit(limit);
  const items: Array<Share & { author: User }> = [];
  for (const row of rows) {
    items.push({ ...rowToShare(row), author: await authorOf(c, row.authorId) });
  }
  return c.json({ items, nextCursor: null, count: items.length });
});

api.get("/discover", async (c) => {
  const db = dbOf(c);
  requireUserId(c);
  const q = c.req.query() as unknown as ListSharesQuery;
  const rawLimit = c.req.query("limit") ?? "";
  const limit = Math.min(Math.max(Number.parseInt(rawLimit, 10) || 20, 1), 100);
  const kind: ShareKind | null =
    q.kind === "channel-snapshot" || q.kind === "agent-session" ? q.kind : null;
  const rows = await db
    .select()
    .from(shares)
    .where(kind ? and(eq(shares.isPublic, true), eq(shares.kind, kind)) : eq(shares.isPublic, true))
    .orderBy(desc(shares.createdAt))
    .limit(limit);
  const items: Array<Share & { author: User }> = [];
  for (const row of rows) {
    items.push({ ...rowToShare(row), author: await authorOf(c, row.authorId) });
  }
  return c.json({ items, nextCursor: null, count: items.length });
});

// ---------------- 单条：GET / DELETE ----------------

api.get("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadShareRow(c, c.req.param("id"));
  const share = rowToShare(row);

  // 作者/公开直通；其余须为来源社区成员（含私有社区内部共享）
  if (row.authorId !== userId && !share.public) {
    const communityId = snapshotCommunityId(share);
    if (!communityId) throw HttpApiError.forbidden("无权查看该分享");
    await requireMember(db, communityId, userId);
  }
  const author = await authorOf(c, row.authorId);
  const origin = new URL(c.req.url).origin;
  return c.json({
    ...share,
    author,
    downloadUrl: `${origin}/api/r2/objects/${row.r2Key}?download=1`,
  });
});

api.delete("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadShareRow(c, c.req.param("id"));
  if (row.authorId !== userId) throw HttpApiError.forbidden("只能删除自己创建的分享");
  await c.env.R2.delete(row.r2Key).catch(() => undefined);
  await db.delete(shares).where(eq(shares.id, row.id));
  return emptyOk(c);
});

// ---------------- 创建快照：POST /snapshot ----------------

api.post(
  "/snapshot",
  validator("json", (v) => v as CreateShareRequest),
  async (c) => {
    const db = dbOf(c);
    const userId = requireUserId(c);
    const body = c.req.valid("json" as never) as CreateShareRequest;
    const channelId = body.channelId;
    if (!channelId) throw HttpApiError.badRequest("channelId 必填");

    const channel = (
      await db.select().from(channels).where(eq(channels.id, channelId)).limit(1)
    )[0];
    if (!channel) throw HttpApiError.notFound("channel not found");
    await requireMember(db, channel.communityId, userId);

    const community = (
      await db.select().from(communities).where(eq(communities.id, channel.communityId)).limit(1)
    )[0];

    // 取该频道最近 200 条主频道直接消息（旧→新；不含讨论组内的消息）
    const rows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.channelId, channelId), isNull(messages.threadId)))
      .orderBy(asc(messages.createdAt))
      .limit(200);

    // 作者资料去重加载
    const authorIds = [...new Set(rows.map((m: MessageRow) => m.authorId))];
    const users = new Map<string, User>();
    for (const id of authorIds) {
      const user = await fetchUserById(c.env.DB, id);
      if (user) users.set(id, user);
    }

    const exportedAt = Date.now();
    const packageBody = {
      snapshotVersion: 1,
      exportedAt,
      community: { id: channel.communityId, name: community?.name ?? "" },
      channel: { id: channel.id, name: channel.name },
      messages: rows.map((m: MessageRow) => ({
        id: m.id,
        authorId: m.authorId,
        authorHandle: users.get(m.authorId)?.handle ?? "",
        authorName: users.get(m.authorId)?.displayName ?? null,
        createdAt: m.createdAt,
        content: m.content,
        attachments: parseJson(m.attachments) ?? [],
        mentions: parseJson<string[]>(m.mentions) ?? [],
        replyToId: m.replyToId,
      })),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(packageBody));

    const shareId = newId();
    const r2Key = `shr${shareId}`;
    const object = await c.env.R2.put(r2Key, bytes, {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { u: userId },
    });
    if (!object) throw HttpApiError.internal("R2 写入失败");

    const now = Date.now();
    const title = (body.title ?? "").trim() || `会话快照：${channel.name}`;
    await db.insert(shares).values({
      id: shareId,
      authorId: userId,
      kind: "channel-snapshot",
      title,
      summary: body.summary?.trim() || null,
      coverUrl: null,
      r2Key,
      sizeBytes: object.size,
      sha256: null,
      manifest: JSON.stringify({
        snapshotVersion: 1,
        exportedAt,
        communityId: channel.communityId,
        channelId,
        messageCount: rows.length,
      }),
      isPublic: community?.privacy === "public",
      downloadCount: 0,
      createdAt: now,
      updatedAt: null,
    });

    const created = (await db.select().from(shares).where(eq(shares.id, shareId)).limit(1))[0];
    if (!created) throw HttpApiError.internal("share row not found");
    const author = await authorOf(c, userId);
    const origin = new URL(c.req.url).origin;
    return c.json(
      {
        share: { ...rowToShare(created), author },
        downloadUrl: `${origin}/api/r2/objects/${r2Key}?download=1`,
      },
      201,
    );
  },
);

// ---------------- 登记会话分享：POST /agent-session ----------------
// 包体由本机 host 打包后经 PUT /api/r2/objects 直传 R2，这里只登记元数据。

api.post(
  "/agent-session",
  validator("json", (v) => v as CreateAgentSessionShareRequest),
  async (c) => {
    const db = dbOf(c);
    const userId = requireUserId(c);
    const body = c.req.valid("json" as never) as CreateAgentSessionShareRequest;

    const r2Key = (body.r2Key ?? "").trim();
    if (!r2Key) throw HttpApiError.badRequest("r2Key 必填");
    const title = (body.title ?? "").trim();
    if (!title) throw HttpApiError.badRequest("title 必填");
    const sizeBytes = Number(body.sizeBytes);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw HttpApiError.badRequest("sizeBytes 无效");
    }
    if (sizeBytes > MAX_SHARE_BYTES) {
      const mb = Math.round(MAX_SHARE_BYTES / 1024 / 1024);
      throw HttpApiError.badRequest(`分享包超过 ${mb} MiB 上限`);
    }

    // 归属社区（可选）：提供时须为成员，并据社区可见性决定是否公开进广场
    const communityId = (body.communityId ?? "").trim() || null;
    let isPublic = false;
    if (communityId) {
      await requireMember(db, communityId, userId);
      const community = (
        await db.select().from(communities).where(eq(communities.id, communityId)).limit(1)
      )[0];
      if (!community) throw HttpApiError.notFound("community not found");
      isPublic = community.privacy === "public";
    }

    const shareId = newId();
    const now = Date.now();
    const manifest = {
      ...(body.manifest ?? {}),
      ...(communityId ? { communityId } : {}),
    };
    await db.insert(shares).values({
      id: shareId,
      authorId: userId,
      kind: "agent-session",
      title,
      summary: body.summary?.trim() || null,
      coverUrl: null,
      r2Key,
      sizeBytes,
      sha256: body.sha256?.trim() || null,
      manifest: JSON.stringify(manifest),
      isPublic,
      downloadCount: 0,
      createdAt: now,
      updatedAt: null,
    });

    const created = (await db.select().from(shares).where(eq(shares.id, shareId)).limit(1))[0];
    if (!created) throw HttpApiError.internal("share row not found");
    const author = await authorOf(c, userId);
    const origin = new URL(c.req.url).origin;
    return c.json(
      {
        share: { ...rowToShare(created), author },
        downloadUrl: `${origin}/api/r2/objects/${r2Key}?download=1`,
      },
      201,
    );
  },
);
