// ================================================================
// 讨论组（thread）生命周期 REST：
//   - /api/channels/:channelId/threads   GET 列表(active/archived) / POST 创建
//   - /api/threads/:id                   GET 详情 / PATCH 改名 / DELETE 删除
//   - /api/threads/:id/archive | reopen  手动归档 / 恢复
//   - /api/threads/:id/read-state        GET/POST 讨论组已读
// 讨论内的消息读写复用 /api/channels/:id/messages（?threadId= / body.threadId）。
// ================================================================

import type {
  CreateThreadRequest,
  ListThreadsResponse,
  UpdateThreadReadStateRequest,
  UpdateThreadRequest,
} from "@dsh-talk/types/api";
import type { ThreadReadState } from "@dsh-talk/types/entities";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { THREAD_NAME_MAX, THREAD_STARTER_SNIPPET_MAX } from "../constants";
import {
  type ChannelRow,
  channels,
  messages,
  type ThreadRow,
  threadReadStates,
  threads,
} from "../db/schema";
import { requireMember, requireModerator } from "../lib/access";
import { createBearerAuth, requireCurrentUser, requireUserId } from "../lib/auth";
import { db as dbOf } from "../lib/db";
import { HttpApiError } from "../lib/errors";
import { newId } from "../lib/ids";
import { type AppCtx, emptyOk } from "../lib/response";
import { getThreadSummary, listThreadSummaries } from "../lib/threads";
import type { Env, HonoAppVariables } from "../types";

function jsonBody<T>(c: AppCtx): Promise<T> {
  return c.req.json() as Promise<T>;
}

async function loadThreadRow(db: ReturnType<typeof dbOf>, threadId: string): Promise<ThreadRow> {
  const row = (await db.select().from(threads).where(eq(threads.id, threadId)).limit(1))[0];
  if (!row) throw HttpApiError.notFound("thread not found");
  return row;
}

async function loadChannelRow(db: ReturnType<typeof dbOf>, channelId: string): Promise<ChannelRow> {
  const row = (await db.select().from(channels).where(eq(channels.id, channelId)).limit(1))[0];
  if (!row) throw HttpApiError.notFound("channel not found");
  return row;
}

/** 讨论组/话题支持范围：text / forum（公告频道保持只读整洁） */
function assertThreadable(kind: ChannelRow["kind"]): void {
  if (kind !== "text" && kind !== "forum")
    throw HttpApiError.badRequest("该频道类型不支持讨论组/话题（仅文字/话题频道）");
}

function assertThreadName(name: string): string {
  const trimmed = (name ?? "").trim();
  if (trimmed.length === 0 || trimmed.length > THREAD_NAME_MAX)
    throw HttpApiError.badRequest(`讨论组名称需为 1~${THREAD_NAME_MAX} 字符`);
  return trimmed;
}

// ================================================================
// 频道维度：/api/channels/:channelId/threads
// ================================================================

const channelThreadsApi = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();
export const channelThreadsRoutes = channelThreadsApi;
channelThreadsApi.use("*", createBearerAuth("required"));

// --- GET /:channelId/threads —— 该频道讨论组（默认活跃；?archived=all 附已归档） ---
channelThreadsApi.get("/:channelId/threads", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const channelId = c.req.param("channelId");
  const channel = await loadChannelRow(db, channelId);
  await requireMember(db, channel.communityId, userId);

  const all = (c.req.query("archived") ?? "").trim() === "all";
  const items = await listThreadSummaries(db, { channelId }, userId);
  const body: ListThreadsResponse = {
    active: items.filter((t) => t.status === "active"),
    archived: all ? items.filter((t) => t.status === "archived") : [],
  };
  return c.json(body);
});

// --- POST /:channelId/threads —— 创建讨论组（可带起点消息） ---
channelThreadsApi.post("/:channelId/threads", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const channelId = c.req.param("channelId");
  const channel = await loadChannelRow(db, channelId);
  await requireMember(db, channel.communityId, userId);
  assertThreadable(channel.kind);

  const body = await jsonBody<CreateThreadRequest>(c);
  const name = assertThreadName(body.name ?? "");
  const user = requireCurrentUser(c);

  // 起点消息必须存在于本频道且不在任何讨论组里
  let starterSnippet: string | null = null;
  if (body.starterMessageId) {
    const starter = (
      await db.select().from(messages).where(eq(messages.id, body.starterMessageId)).limit(1)
    )[0];
    if (!starter || starter.channelId !== channelId || starter.threadId !== null)
      throw HttpApiError.badRequest("starterMessageId 无效（不存在、不在本频道或在讨论组内）");
    const raw = starter.content.replace(/\s+/g, " ").trim();
    starterSnippet =
      raw.length === 0
        ? (starter.attachments?.length ?? 0) > 0
          ? "[附件]"
          : null
        : raw.length > THREAD_STARTER_SNIPPET_MAX
          ? `${raw.slice(0, THREAD_STARTER_SNIPPET_MAX)}…`
          : raw;
  }

  const now = Date.now();
  const threadId = newId();
  await db.insert(threads).values({
    id: threadId,
    communityId: channel.communityId,
    channelId,
    name,
    starterMessageId: body.starterMessageId ?? null,
    createdBy: userId,
    creatorHandle: user.handle,
    creatorDisplayName: user.displayName,
    creatorAvatarUrl: user.avatarUrl,
    starterSnippet,
    status: "active",
    messageCount: 0,
    lastMessageId: null,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
  const summary = await getThreadSummary(db, threadId, userId);
  if (!summary) throw HttpApiError.internal("thread row not found");
  return c.json(summary, 201);
});

// ================================================================
// 讨论组维度：/api/threads/:id
// ================================================================

const threadsApi = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();
export const threadRoutes = threadsApi;
threadsApi.use("*", createBearerAuth("required"));

async function assertCanManage(
  db: ReturnType<typeof dbOf>,
  row: ThreadRow,
  userId: string,
): Promise<void> {
  if (row.createdBy === userId) return;
  await requireModerator(db, row.communityId, userId);
}

async function summaryOrThrow(db: ReturnType<typeof dbOf>, threadId: string, userId: string) {
  const summary = await getThreadSummary(db, threadId, userId);
  if (!summary) throw HttpApiError.internal("thread row not found");
  return summary;
}

// --- GET /:id —— 单条详情（含我未读；打开/恢复讨论用） ---
threadsApi.get("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadThreadRow(db, c.req.param("id"));
  await requireMember(db, row.communityId, userId);
  return c.json(await summaryOrThrow(db, row.id, userId));
});

// --- PATCH /:id —— 改名（发起人或 owner/admin） ---
threadsApi.patch("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadThreadRow(db, c.req.param("id"));
  await requireMember(db, row.communityId, userId);
  await assertCanManage(db, row, userId);
  const body = await jsonBody<UpdateThreadRequest>(c);
  const name = assertThreadName(body.name ?? "");
  await db.update(threads).set({ name, updatedAt: Date.now() }).where(eq(threads.id, row.id));
  return c.json(await summaryOrThrow(db, row.id, userId));
});

// --- POST /:id/archive —— 手动归档（发起人或 owner/admin） ---
threadsApi.post("/:id/archive", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadThreadRow(db, c.req.param("id"));
  await requireMember(db, row.communityId, userId);
  await assertCanManage(db, row, userId);
  const now = Date.now();
  await db
    .update(threads)
    .set({ status: "archived", archivedAt: now, updatedAt: now })
    .where(eq(threads.id, row.id));
  return c.json(await summaryOrThrow(db, row.id, userId));
});

// --- POST /:id/reopen —— 恢复活跃（频道成员即可；后续发言也会自动恢复） ---
threadsApi.post("/:id/reopen", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadThreadRow(db, c.req.param("id"));
  await requireMember(db, row.communityId, userId);
  const now = Date.now();
  await db
    .update(threads)
    .set({ status: "active", archivedAt: null, updatedAt: now, lastActivityAt: now })
    .where(eq(threads.id, row.id));
  return c.json(await summaryOrThrow(db, row.id, userId));
});

// --- DELETE /:id —— 删除讨论组（级联消息/已读；发起人或 owner/admin） ---
threadsApi.delete("/:id", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadThreadRow(db, c.req.param("id"));
  await requireMember(db, row.communityId, userId);
  await assertCanManage(db, row, userId);
  // D1 外键默认可能不强制，显式清理消息 + 已读 + 讨论组
  await db.delete(messages).where(eq(messages.threadId, row.id));
  await db.delete(threadReadStates).where(eq(threadReadStates.threadId, row.id));
  await db.delete(threads).where(eq(threads.id, row.id));
  return emptyOk(c);
});

// --- GET /:id/read-state —— 我在这条讨论组的已读 ---
threadsApi.get("/:id/read-state", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadThreadRow(db, c.req.param("id"));
  await requireMember(db, row.communityId, userId);

  const read = (
    await db
      .select()
      .from(threadReadStates)
      .where(and(eq(threadReadStates.threadId, row.id), eq(threadReadStates.userId, userId)))
      .limit(1)
  )[0];
  const lastRow = await db
    .select({ value: sql<number | null>`MAX(created_at)` })
    .from(messages)
    .where(eq(messages.threadId, row.id));
  const lastMessageAt = lastRow[0]?.value ?? null;
  const state: ThreadReadState = read
    ? {
        userId: read.userId,
        threadId: read.threadId,
        lastReadMessageId: read.lastReadMessageId,
        lastReadAt: read.lastReadAt,
      }
    : { userId, threadId: row.id, lastReadMessageId: null, lastReadAt: null };
  return c.json({ ...state, lastMessageAt });
});

// --- POST /:id/read-state —— 上报读到哪条（必须是本讨论组内的消息） ---
threadsApi.post("/:id/read-state", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const row = await loadThreadRow(db, c.req.param("id"));
  await requireMember(db, row.communityId, userId);

  const body = await jsonBody<UpdateThreadReadStateRequest>(c);
  const msg = (
    await db.select().from(messages).where(eq(messages.id, body.lastReadMessageId)).limit(1)
  )[0];
  if (!msg || msg.threadId !== row.id)
    throw HttpApiError.badRequest("lastReadMessageId 不存在或不在本讨论组");
  const now = Date.now();
  await db
    .insert(threadReadStates)
    .values({
      userId,
      threadId: row.id,
      lastReadMessageId: msg.id,
      lastReadAt: now,
    })
    .onConflictDoUpdate({
      target: [threadReadStates.userId, threadReadStates.threadId],
      set: { lastReadMessageId: msg.id, lastReadAt: now },
    });
  return c.json({
    userId,
    threadId: row.id,
    lastReadMessageId: msg.id,
    lastReadAt: now,
  });
});
