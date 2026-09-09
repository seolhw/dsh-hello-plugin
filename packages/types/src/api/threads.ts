import type { ID, Thread, ThreadReadState, TimestampMs } from "../entities";
import type { EmptyResponse } from "./common";

// ===============================================================
// 讨论组（thread）—— 依附主频道、可自动归档的临时子空间
// 消息本体复用 /api/channels/:channelId/messages（带 ?threadId= / body.threadId），
// 这里只管讨论组生命周期与列表。
// ===============================================================

/** 讨论组列表项：在 Thread 基础上叠加「我」的未读信息 */
export interface ThreadSummary extends Thread {
  /** 我未读的消息数（只数自己没读到的、别人发的消息行） */
  unreadCount: number;
  /** 未读里 @到我的条数 */
  unreadMentions: number;
}

// ------- /api/channels/:channelId/threads -------

/** GET /api/channels/:channelId/threads?archived=all —— 该频道的讨论组列表（含未读） */
export interface ListThreadsQuery {
  /** 默认只列活跃；传 all 同时返回已归档分组 */
  archived?: "all";
}
export type ListThreadsResponse = {
  active: ThreadSummary[];
  archived: ThreadSummary[];
};

/** POST /api/channels/:channelId/threads —— 从消息/空白创建讨论组 */
export interface CreateThreadRequest {
  name: string;
  /** 若从某条主频道消息发起，填它的 id（否则为空白讨论组） */
  starterMessageId?: ID;
}
export type CreateThreadResponse = ThreadSummary;

// ------- /api/threads/:id -------

/** PATCH /api/threads/:id —— 改名（发起人或 owner/admin） */
export interface UpdateThreadRequest {
  name: string;
}
export type UpdateThreadResponse = ThreadSummary;

/** POST /api/threads/:id/archive —— 手动归档（发起人或 owner/admin） */
export type ArchiveThreadResponse = ThreadSummary;

/** POST /api/threads/:id/reopen —— 恢复活跃（频道成员；发言也会自动恢复） */
export type ReopenThreadResponse = ThreadSummary;

/** DELETE /api/threads/:id —— 删除讨论组（级联删其消息；owner/admin 或发起人） */
export type DeleteThreadResponse = EmptyResponse;

// ------- 已读 -------

/** GET /api/threads/:id/read-state —— 我在该讨论组的已读 */
export type GetThreadReadStateResponse = ThreadReadState & { lastMessageAt: TimestampMs | null };

/** POST /api/threads/:id/read-state —— 上报「读到哪条」（必须属于该讨论组） */
export interface UpdateThreadReadStateRequest {
  lastReadMessageId: ID;
}
export type UpdateThreadReadStateResponse = ThreadReadState;
