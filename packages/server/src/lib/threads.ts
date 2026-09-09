// ================================================================
// 讨论组（thread）共享逻辑：行 → Thread 实体、惰性自动归档、按用户汇总未读
// 路由（REST/WS）与社区详情复用这里，避免各处重复。
// ================================================================

import type { ThreadSummary } from "@dsh-talk/types/api";
import type { Thread } from "@dsh-talk/types/entities";
import { and, desc, eq, gt, inArray, type SQL, sql } from "drizzle-orm";
import { THREAD_AUTO_ARCHIVE_MS } from "../constants";
import { messages, type ThreadRow, threadReadStates, threads } from "../db/schema";
import type { db as dbOf } from "./db";

type Db = ReturnType<typeof dbOf>;

/** threads 行 → Thread 实体 */
function toThread(row: ThreadRow, archived: boolean, archivedAt: number | null): Thread {
  return {
    id: row.id,
    communityId: row.communityId,
    channelId: row.channelId,
    name: row.name,
    starterMessageId: row.starterMessageId,
    createdBy: row.createdBy,
    creatorHandle: row.creatorHandle,
    creatorDisplayName: row.creatorDisplayName,
    creatorAvatarUrl: row.creatorAvatarUrl,
    starterSnippet: row.starterSnippet,
    status: archived ? "archived" : "active",
    messageCount: row.messageCount,
    lastMessageId: row.lastMessageId,
    lastActivityAt: row.lastActivityAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt,
  };
}

/** 对若干 threads 行补「我」的未读数（每条一个聚合查询；MVP 讨论组数量有限） */
async function enrichWithUnread(
  db: Db,
  rows: ThreadRow[],
  userId: string,
): Promise<ThreadSummary[]> {
  const out: ThreadSummary[] = [];
  for (const row of rows) {
    const read = (
      await db
        .select()
        .from(threadReadStates)
        .where(and(eq(threadReadStates.threadId, row.id), eq(threadReadStates.userId, userId)))
        .limit(1)
    )[0];
    const lastReadAt = read?.lastReadAt ?? 0;
    const agg = await db
      .select({
        unread: sql<number>`COUNT(*)`,
        mentions: sql<number>`COALESCE(SUM(CASE WHEN instr(${messages.mentions}, ${`"${userId}"`}) > 0 THEN 1 ELSE 0 END), 0)`,
      })
      .from(messages)
      .where(and(eq(messages.threadId, row.id), gt(messages.createdAt, lastReadAt)));
    const archived = row.status === "archived";
    const entity = toThread(row, archived, row.archivedAt);
    out.push({
      ...entity,
      unreadCount: Number(agg[0]?.unread ?? 0),
      unreadMentions: Number(agg[0]?.mentions ?? 0),
    });
  }
  return out;
}

/**
 * 惰性自动归档 + 汇总列表：若某讨论组超过 24h 无活跃，先把状态刷成 archived
 * 再返回 ThreadSummary[]（按最近活跃倒序）。
 */
export async function listThreadSummaries(
  db: Db,
  scope: { communityId?: string; channelId?: string },
  userId: string,
): Promise<ThreadSummary[]> {
  const conds: SQL[] = [];
  if (scope.communityId) conds.push(eq(threads.communityId, scope.communityId));
  if (scope.channelId) conds.push(eq(threads.channelId, scope.channelId));
  const rows = await db
    .select()
    .from(threads)
    .where(and(...conds))
    .orderBy(desc(threads.lastActivityAt));

  // 惰性自动归档（本地无定时器，靠读写路径触发）
  const now = Date.now();
  const idleIds = rows
    .filter((r) => r.status === "active" && now - r.lastActivityAt > THREAD_AUTO_ARCHIVE_MS)
    .map((r) => r.id);
  if (idleIds.length > 0) {
    await db
      .update(threads)
      .set({ status: "archived", archivedAt: now, updatedAt: now })
      .where(inArray(threads.id, idleIds));
  }

  const summaries = await enrichWithUnread(db, rows, userId);
  // 已被本次惰性归档的，返回实体时也反映为 archived
  const idle = new Set(idleIds);
  for (const s of summaries) {
    if (s.status === "active" && idle.has(s.id)) {
      s.status = "archived";
      s.archivedAt = now;
    }
  }
  return summaries;
}

/** 单条讨论组详情（含我未读数）；不存在返回 null */
export async function getThreadSummary(
  db: Db,
  threadId: string,
  userId: string,
): Promise<ThreadSummary | null> {
  const row = (await db.select().from(threads).where(eq(threads.id, threadId)).limit(1))[0];
  if (!row) return null;
  const [summary] = await enrichWithUnread(db, [row], userId);
  return summary ?? null;
}
