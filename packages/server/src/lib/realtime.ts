// ================================================================
// 实时广播：REST 写入成功后，用类型化 RPC 通知该频道的 ChannelActor(DO)。
//   每个频道一个 DO（idFromName(channelId)），DO 实例内扇出给在线订阅者。
//   失败不抛给业务（REST 写库成功才是关键；广播是尽力而为）。
//   数据隔离：广播只走 DO；消息等规范数据始终在业务 D1。
// ================================================================

import type { ServerFrame } from "@dsh-talk/types/ws";
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
