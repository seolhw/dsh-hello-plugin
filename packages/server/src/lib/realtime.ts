// ================================================================
// 实时广播：REST 写入成功后，用类型化 RPC 通知该频道的 ChannelActor(DO)。
//   每个频道一个 DO（idFromName(channelId)），DO 实例内扇出给在线订阅者。
//   失败不抛给业务（REST 写库成功才是关键；广播是尽力而为）。
//   数据隔离：广播只走 DO；消息等规范数据始终在业务 D1。
// ================================================================

import type { ServerFrame } from "@dsh-talk/types/ws";
import { eq } from "drizzle-orm";
import { createDbForWorker } from "../db";
import { channels, threads } from "../db/schema";
import type { Env } from "../types";

export async function broadcastToChannel(
  env: Env,
  channelId: string,
  frame: ServerFrame,
): Promise<void> {
  try {
    const stub = env.ROOM_ACTOR.get(env.ROOM_ACTOR.idFromName(channelId));
    await stub.broadcast(frame);
  } catch (error) {
    console.warn(`[realtime] broadcast failed for channel ${channelId}:`, error);
  }
}

/**
 * 通知一批房间（频道 / 讨论组）的 DO：重校验在线连接，失去 VIEW_CHANNEL 者被断开，
 * 其余收到 evt.community.access.changed 刷新 UI。用于社区被删除（房间行已不在库里）等场景。
 */
export async function notifyRoomsAccessChanged(
  env: Env,
  communityId: string,
  roomIds: readonly string[],
): Promise<void> {
  await Promise.all(
    roomIds.map(async (roomId) => {
      try {
        const stub = env.ROOM_ACTOR.get(env.ROOM_ACTOR.idFromName(roomId));
        await stub.accessChanged({ communityId, roomId });
      } catch (error) {
        console.warn(`[realtime] access-changed failed for room ${roomId}:`, error);
      }
    }),
  );
}

/**
 * 社区权限配置变更（角色 / 成员角色 / 频道覆盖 / 踢人 / 封禁 / 转让）后的通知：
 * 逐个通知该社区全部频道与讨论组的 DO。
 */
export async function notifyCommunityAccessChanged(env: Env, communityId: string): Promise<void> {
  try {
    const db = createDbForWorker(env.DB);
    const [channelRows, threadRows] = await Promise.all([
      db.select({ id: channels.id }).from(channels).where(eq(channels.communityId, communityId)),
      db.select({ id: threads.id }).from(threads).where(eq(threads.communityId, communityId)),
    ]);
    await notifyRoomsAccessChanged(
      env,
      communityId,
      [...channelRows, ...threadRows].map((row) => row.id),
    );
  } catch (error) {
    console.warn(`[realtime] access-changed notify failed for community ${communityId}:`, error);
  }
}
