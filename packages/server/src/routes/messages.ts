// ================================================================
// /api/channels/:id/*（消息/未读）与 /api/messages/:id（改/删/解决）
// 权限模型：
//   - 身份：Better Auth 会话（Bearer）
//   - 发消息/看历史/未读：必须是该频道所属社区的成员；
//     公告频道（kind=announcement）发消息额外要求 owner/admin（普通成员只读）
//   - 改/删消息：仅消息作者本人，或该社区 owner/admin
//   - help 解决：提问作者或 owner/admin
//   - 附件：先 PUT /api/r2/objects 上传拿 r2Key，随消息提交；分享卡片尚未纳入 MVP
// ================================================================

import type { D1Database } from "@cloudflare/workers-types";
import type {
  CreateMessageRequest,
  ListMessagesQuery,
  ResolveHelpRequest,
  UpdateMessageRequest,
  UpdateReadStateRequest,
} from "@dsh-talk/types/api";
import type { ChannelReadState, Message, MessageAttachment, User } from "@dsh-talk/types/entities";
import type { EvtMessageDeleted, EvtMessageNew, EvtMessageUpdated } from "@dsh-talk/types/ws";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { MAX_ATTACHMENT_NAME, MAX_ATTACHMENTS_PER_MESSAGE, MAX_MESSAGE_LENGTH } from "../constants";
import {
  type ChannelRow,
  channelReadStates,
  channels,
  type MessageRow,
  messages,
  shares,
} from "../db/schema";
import { requireMember, requireModerator } from "../lib/access";
import { createBearerAuth, requireUserId } from "../lib/auth";
import { db as dbOf } from "../lib/db";
import { HttpApiError } from "../lib/errors";
import { newId } from "../lib/ids";
import { broadcastToChannel } from "../lib/realtime";
import { type AppCtx, emptyOk } from "../lib/response";
import { fetchUserById, resolveUserIdsByHandles } from "../lib/users";
import type { Env, HonoAppVariables } from "../types";

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

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function loadChannelRow(db: ReturnType<typeof dbOf>, channelId: string): Promise<ChannelRow> {
  const row = (await db.select().from(channels).where(eq(channels.id, channelId)).limit(1))[0];
  if (!row) throw HttpApiError.notFound("channel not found");
  return row;
}

/** 频道消息行 -> Message 实体（JSON 字段解码） */
function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    channelId: row.channelId,
    communityId: row.communityId,
    authorId: row.authorId,
    content: row.content,
    attachments: parseJson(row.attachments) ?? [],
    mentions: parseJson<string[]>(row.mentions) ?? [],
    shareCard: parseJson(row.shareCard),
    resolution: parseJson(row.resolution),
    replyToId: row.replyToId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function authorOf(d1: D1Database, userId: string): Promise<User> {
  const user = await fetchUserById(d1, userId);
  if (!user) throw HttpApiError.internal("user not found");
  return user;
}

/** 组装一条对外消息（带 author，可能带 replyTo 及其中层 author） */
async function messageItem(
  db: ReturnType<typeof dbOf>,
  d1: D1Database,
  row: MessageRow,
): Promise<Message & { author: User; replyTo?: (Message & { author: User }) | null }> {
  const base = rowToMessage(row);
  const author = await authorOf(d1, row.authorId);
  let replyTo: (Message & { author: User }) | null = null;
  if (row.replyToId) {
    const parent = (
      await db.select().from(messages).where(eq(messages.id, row.replyToId)).limit(1)
    )[0];
    if (parent) {
      replyTo = { ...rowToMessage(parent), author: await authorOf(d1, parent.authorId) };
    }
  }
  return { ...base, author, replyTo };
}

// ================================================================
// 频道维度：/api/channels/:id/messages + read-state
// ================================================================

const channelMessagesApi = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();

export const channelMessagesRoutes = channelMessagesApi;

channelMessagesApi.use("*", createBearerAuth("required"));

/** 该用户必须是频道所属社区的成员 */
async function requireChannelMember(
  db: ReturnType<typeof dbOf>,
  channel: ChannelRow,
  userId: string,
): Promise<void> {
  await requireMember(db, channel.communityId, userId);
}

// --- GET /:id/messages —— 历史消息（默认倒序 + 游标） ---
channelMessagesApi.get("/:id/messages", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const channelId = c.req.param("id");
  const channel = await loadChannelRow(db, channelId);
  await requireChannelMember(db, channel, userId);

  const d1 = c.env.DB;
  const q = c.req.query() as ListMessagesQuery;
  const rawLimit = c.req.query("limit") ?? "";
  const limit = Math.min(Math.max(Number.parseInt(rawLimit, 10) || 50, 1), 100);
  const direction: "desc" | "asc" = q.direction === "asc" ? "asc" : "desc";
  const cursor = q.cursor && q.cursor.trim().length > 0 ? Number.parseInt(q.cursor, 10) : null;

  const conds = [eq(messages.channelId, channelId)];
  if (cursor !== null && Number.isFinite(cursor)) {
    conds.push(
      direction === "desc" ? lt(messages.createdAt, cursor) : gt(messages.createdAt, cursor),
    );
  }
  const order = direction === "desc" ? desc(messages.createdAt) : asc(messages.createdAt);
  const take = limit + 1; // 多取一条判断是否还有更多
  const rows = await db
    .select()
    .from(messages)
    .where(and(...conds))
    .orderBy(order)
    .limit(take);

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const items: Array<Message & { author: User; replyTo?: (Message & { author: User }) | null }> =
    [];
  for (const row of page) items.push(await messageItem(db, d1, row));

  return c.json({
    items,
    nextCursor: hasMore && last ? String(last.createdAt) : null,
    count: page.length,
  });
});

// --- POST /:id/messages —— 发消息 ---
channelMessagesApi.post("/:id/messages", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const channelId = c.req.param("id");
  const channel = await loadChannelRow(db, channelId);
  await requireChannelMember(db, channel, userId);

  // 公告频道只有 owner/admin 能发（requireModerator 内部已含成员判定）
  if (channel.kind === "announcement") {
    await requireModerator(db, channel.communityId, userId);
  }

  const body = await jsonBody<CreateMessageRequest>(c);
  const d1 = c.env.DB;
  const content = (body.content ?? "").trim();
  if (content.length > MAX_MESSAGE_LENGTH)
    throw HttpApiError.badRequest(`content 超过 ${MAX_MESSAGE_LENGTH} 字符上限`);

  // 附件：r2Key -> R2 实际对象。只允许引用「自己刚上传、尚未被消费」的对象；
  // 落库前以 R2 对象为准回填 name/size/mime（客户端声明仅作预检）。
  const puts = body.attachments ?? [];
  if (puts.length > MAX_ATTACHMENTS_PER_MESSAGE)
    throw HttpApiError.badRequest(`一条消息最多携带 ${MAX_ATTACHMENTS_PER_MESSAGE} 个附件`);
  const origin = new URL(c.req.url).origin;
  const attachments: MessageAttachment[] = [];
  for (const a of puts) {
    if (typeof a.r2Key !== "string" || !a.r2Key.startsWith("att"))
      throw HttpApiError.badRequest("附件 r2Key 无效");
    const name = typeof a.name === "string" ? a.name.trim() : "";
    if (!name || name.length > MAX_ATTACHMENT_NAME)
      throw HttpApiError.badRequest("附件名缺失或超过 200 字符");
    if (!Number.isInteger(a.size) || a.size <= 0) throw HttpApiError.badRequest("附件 size 无效");

    const object = await c.env.R2.get(a.r2Key);
    if (!object) throw HttpApiError.badRequest(`附件「${name}」尚未上传完成或已不存在`);
    if (object.customMetadata?.u !== userId) throw HttpApiError.forbidden("只能引用自己上传的附件");

    const mimeType = object.httpMetadata?.contentType ?? null;
    attachments.push({
      kind: mimeType?.startsWith("image/") ? "image" : "file",
      url: `${origin}/api/r2/objects/${a.r2Key}`,
      name,
      size: object.size,
      mimeType,
      width: typeof a.width === "number" ? a.width : null,
      height: typeof a.height === "number" ? a.height : null,
    });
  }
  if (content.length === 0 && attachments.length === 0)
    throw HttpApiError.badRequest("content 不能为空（纯附件消息也请附上文件）");

  // mentions：@handle -> userId
  const mentions: string[] = [];
  if (body.mentionHandles && body.mentionHandles.length > 0) {
    const resolved = await resolveUserIdsByHandles(d1, body.mentionHandles);
    const unresolved = body.mentionHandles.filter((h) => !resolved.has(h.trim()));
    if (unresolved.length > 0) {
      throw HttpApiError.badRequest(`无法识别的 @handle：${unresolved.join(", ")}`);
    }
    const resolvedIds: string[] = [];
    for (const handle of body.mentionHandles) {
      const id = resolved.get(handle.trim());
      if (id) resolvedIds.push(id);
    }
    mentions.push(...new Set(resolvedIds));
  }

  // replyTo：必须是同频道消息
  if (body.replyToId) {
    const parent = (
      await db.select().from(messages).where(eq(messages.id, body.replyToId)).limit(1)
    )[0];
    if (!parent || parent.channelId !== channelId || parent.communityId !== channel.communityId) {
      throw HttpApiError.badRequest("replyToId 无效（不存在或不在本频道）");
    }
  }

  // shareCard：由 /api/shares 创建后引用（MVP 中 shares 尚未开通，有值即报错）
  let shareCard: Message["shareCard"] = null;
  if (body.shareId) {
    const share = (await db.select().from(shares).where(eq(shares.id, body.shareId)).limit(1))[0];
    if (!share) throw HttpApiError.badRequest("shareId 无效（分享尚未开通或不存在）");
    shareCard = {
      shareId: share.id,
      kind: share.kind,
      title: share.title,
      summary: share.summary,
      coverUrl: share.coverUrl,
    };
  }

  const now = Date.now();
  const messageId = newId();
  await db.insert(messages).values({
    id: messageId,
    channelId,
    communityId: channel.communityId,
    authorId: userId,
    content,
    attachments: JSON.stringify(attachments),
    mentions: JSON.stringify(mentions),
    shareCard: shareCard ? JSON.stringify(shareCard) : null,
    resolution: null,
    replyToId: body.replyToId ?? null,
    createdAt: now,
    updatedAt: null,
  });
  const created = await mustRow(
    db.select().from(messages).where(eq(messages.id, messageId)).limit(1),
    "message",
  );
  const item = await messageItem(db, d1, created);
  const evt: EvtMessageNew = {
    type: "evt.message.new",
    ts: Date.now(),
    payload: { channelId, message: item, mentionMe: false },
  };
  await broadcastToChannel(c.env, channelId, evt);
  return c.json(item, 201);
});

// --- GET /:id/read-state —— 未读状态 ---
channelMessagesApi.get("/:id/read-state", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const channelId = c.req.param("id");
  const channel = await loadChannelRow(db, channelId);
  await requireChannelMember(db, channel, userId);

  const row = (
    await db
      .select()
      .from(channelReadStates)
      .where(and(eq(channelReadStates.userId, userId), eq(channelReadStates.channelId, channelId)))
      .limit(1)
  )[0];
  const lastMessageRow = await db
    .select({ value: sql<number | null>`MAX(created_at)` })
    .from(messages)
    .where(eq(messages.channelId, channelId));
  const lastMessageAt = lastMessageRow[0]?.value ?? null;

  const state: ChannelReadState = row
    ? {
        userId,
        channelId,
        lastReadMessageId: row.lastReadMessageId,
        lastReadAt: row.lastReadAt,
        unreadMentions: row.unreadMentions,
      }
    : { userId, channelId, lastReadMessageId: null, lastReadAt: null, unreadMentions: 0 };
  return c.json({ ...state, lastMessageAt });
});

// --- POST /:id/read-state —— 上报已读 ---
channelMessagesApi.post("/:id/read-state", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const channelId = c.req.param("id");
  const channel = await loadChannelRow(db, channelId);
  await requireChannelMember(db, channel, userId);

  const body = await jsonBody<UpdateReadStateRequest>(c);
  const msg = (
    await db.select().from(messages).where(eq(messages.id, body.lastReadMessageId)).limit(1)
  )[0];
  if (!msg || msg.channelId !== channelId)
    throw HttpApiError.badRequest("lastReadMessageId 不存在或不在本频道");

  const now = Date.now();
  await db
    .insert(channelReadStates)
    .values({
      userId,
      channelId,
      lastReadMessageId: body.lastReadMessageId,
      lastReadAt: now,
      unreadMentions: 0,
    })
    .onConflictDoUpdate({
      target: [channelReadStates.userId, channelReadStates.channelId],
      set: { lastReadMessageId: body.lastReadMessageId, lastReadAt: now, unreadMentions: 0 },
    });
  const row = await mustRow(
    db
      .select()
      .from(channelReadStates)
      .where(and(eq(channelReadStates.userId, userId), eq(channelReadStates.channelId, channelId)))
      .limit(1),
    "read state",
  );
  return c.json({
    userId: row.userId,
    channelId: row.channelId,
    lastReadMessageId: row.lastReadMessageId,
    lastReadAt: row.lastReadAt,
    unreadMentions: row.unreadMentions,
  } satisfies ChannelReadState);
});

// ================================================================
// 消息维度：/api/messages/:id（改/删/解决）
// ================================================================

const messagesApi = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();

export const messagesRoutes = messagesApi;

messagesApi.use("*", createBearerAuth("required"));

async function loadMessageRow(db: ReturnType<typeof dbOf>, messageId: string): Promise<MessageRow> {
  const row = (await db.select().from(messages).where(eq(messages.id, messageId)).limit(1))[0];
  if (!row) throw HttpApiError.notFound("message not found");
  return row;
}

/** 谁能改/删：作者本人 or 社区 owner/admin */
async function assertCanModifyMessage(
  db: ReturnType<typeof dbOf>,
  row: MessageRow,
  userId: string,
): Promise<void> {
  if (row.authorId === userId) return;
  await requireModerator(db, row.communityId, userId);
}

// --- PATCH /:id —— 改消息（作者或 owner/admin） ---
messagesApi.patch("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadMessageRow(db, c.req.param("id"));
  await assertCanModifyMessage(db, row, userId);
  const body = await jsonBody<UpdateMessageRequest>(c);
  if (body.content === undefined) throw HttpApiError.badRequest("content required");
  const content = body.content.trim();
  if (content.length === 0) throw HttpApiError.badRequest("content 不能为空");
  if (content.length > MAX_MESSAGE_LENGTH) throw HttpApiError.badRequest("content 超长");
  await db.update(messages).set({ content, updatedAt: Date.now() }).where(eq(messages.id, row.id));
  const updated = await mustRow(
    db.select().from(messages).where(eq(messages.id, row.id)).limit(1),
    "message",
  );
  const item = await messageItem(db, c.env.DB, updated);
  const evt: EvtMessageUpdated = {
    type: "evt.message.updated",
    ts: Date.now(),
    payload: { channelId: row.channelId, message: item },
  };
  await broadcastToChannel(c.env, row.channelId, evt);
  return c.json(item);
});

// --- DELETE /:id —— 删消息（作者或 owner/admin） ---
messagesApi.delete("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadMessageRow(db, c.req.param("id"));
  await assertCanModifyMessage(db, row, userId);
  await db.delete(messages).where(eq(messages.id, row.id));
  const evt: EvtMessageDeleted = {
    type: "evt.message.deleted",
    ts: Date.now(),
    payload: { channelId: row.channelId, messageId: row.id, deletedBy: userId },
  };
  await broadcastToChannel(c.env, row.channelId, evt);
  return emptyOk(c);
});

// --- POST /:id/resolve —— help 频道解决/取消 ---
messagesApi.post("/:id/resolve", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadMessageRow(db, c.req.param("id"));
  const body = await jsonBody<ResolveHelpRequest>(c);

  const channel = (
    await db.select().from(channels).where(eq(channels.id, row.channelId)).limit(1)
  )[0];
  if (channel?.kind !== "help")
    throw HttpApiError.badRequest("只有求助（kind=help）频道的消息可以标记解决状态");

  // 权限：提问作者 or 社区 owner/admin
  if (row.authorId !== userId) {
    await requireModerator(db, row.communityId, userId);
  }

  let resolution: Message["resolution"] = null;
  if (body.resolved) {
    if (body.answerMessageId) {
      const answer = (
        await db.select().from(messages).where(eq(messages.id, body.answerMessageId)).limit(1)
      )[0];
      if (!answer || answer.channelId !== row.channelId) {
        throw HttpApiError.badRequest("answerMessageId 不存在或不在本频道");
      }
    }
    resolution = {
      resolvedBy: userId,
      resolvedAt: Date.now(),
      answerMessageId: body.answerMessageId ?? null,
    };
  }
  await db
    .update(messages)
    .set({ resolution: resolution ? JSON.stringify(resolution) : null, updatedAt: Date.now() })
    .where(eq(messages.id, row.id));
  const updated = await mustRow(
    db.select().from(messages).where(eq(messages.id, row.id)).limit(1),
    "message",
  );
  return c.json(await messageItem(db, c.env.DB, updated));
});
