// ================================================================
// 频道共享逻辑：按 id 取频道、社区下频道列表（路由多处复用）
// ================================================================

import { asc, eq } from "drizzle-orm";
import type { Db } from "../db";
import { type ChannelRow, channels } from "../db/schema";
import { firstOr404 } from "./response";

/** 按 id 取频道；不存在 404 */
export function loadChannelRow(db: Db, channelId: string): Promise<ChannelRow> {
  return firstOr404(
    db.select().from(channels).where(eq(channels.id, channelId)).limit(1),
    "channel not found",
  );
}

/** 某社区下的频道列表（按 position 升序） */
export function listChannels(db: Db, communityId: string): Promise<ChannelRow[]> {
  return db
    .select()
    .from(channels)
    .where(eq(channels.communityId, communityId))
    .orderBy(asc(channels.position));
}
