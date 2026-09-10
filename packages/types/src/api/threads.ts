import type {
  ID,
  Thread,
  ThreadMember,
  ThreadReadState,
  ThreadVisibility,
  TimestampMs,
  User,
} from "../entities";
import type { EmptyResponse } from "./common";

// ===============================================================
// 讨论组（thread）—— 依附主频道、可自动归档的临时子空间
// 消息本体复用 /api/channels/:channelId/messages（带 ?threadId= / body.threadId），
// 这里只管讨论组生命周期、可见性与成员。
//
// 可见性：public = 社区成员自由进出；private = 仅成员可进出，非成员可见但加锁
//   - 私密组设了密码 → 可 POST /:id/join 凭密码进入
//   - 私密组未设密码 → 只能由已在组内的成员 POST /:id/members 直接拉入
//   - 邀请候选池 = 社区成员（当前频道没有独立成员体系）
// ===============================================================

/** 讨论组列表项：在 Thread 基础上叠加「我」的未读与锁态 */
export interface ThreadSummary extends Thread {
  /** 我未读的消息数（只数自己没读到的、别人发的消息行） */
  unreadCount: number;
  /** 未读里 @到我的条数 */
  unreadMentions: number;
  /** 我是否在成员名单内（发起人/被邀请者；公开讨论组恒为 true） */
  isMember: boolean;
  /** 可见但进不去：私密组且我既非成员也不是社区 owner/admin */
  locked: boolean;
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
  /** 可见性，默认 public */
  visibility?: ThreadVisibility;
  /** 私密组可选的进入密码；仅 visibility=private 时生效 */
  passcode?: string | null;
}
export type CreateThreadResponse = ThreadSummary;

// ------- /api/threads/:id -------

/** PATCH /api/threads/:id —— 改名 / 改可见性 / 改密码（发起人或 owner/admin） */
export interface UpdateThreadRequest {
  name?: string;
  /** 改可见性；public ↔ private 互转 */
  visibility?: ThreadVisibility;
  /** 密码：undefined = 不变，null = 清除，字符串 = 设置（仅私密组有意义） */
  passcode?: string | null;
}
export type UpdateThreadResponse = ThreadSummary;

/** POST /api/threads/:id/archive —— 手动归档（发起人或 owner/admin） */
export type ArchiveThreadResponse = ThreadSummary;

/** POST /api/threads/:id/reopen —— 恢复活跃（可进入该组的成员；发言也会自动恢复） */
export type ReopenThreadResponse = ThreadSummary;

/** DELETE /api/threads/:id —— 删除讨论组（级联删其消息/成员/已读；owner/admin 或发起人） */
export type DeleteThreadResponse = EmptyResponse;

// ------- 进入 / 成员 -------

/** POST /api/threads/:id/join —— 凭密码进入私密讨论组（公开组为幂等无操作） */
export interface JoinThreadRequest {
  /** 私密讨论组的进入密码；未设密码的私密组不能自行加入 */
  passcode?: string;
}
export type JoinThreadResponse = ThreadSummary;

/** 讨论组成员项：成员行 + 用户公开资料 */
export type ThreadMemberItem = ThreadMember & { user: User };

/** GET /api/threads/:id/members —— 成员名单（需可进入该讨论组） */
export type ListThreadMembersResponse = { items: ThreadMemberItem[] };

/** GET /api/threads/:id/candidates?q= —— 可邀请的人（社区成员中尚未在组内的） */
export interface ListThreadCandidatesQuery {
  /** 模糊匹配 handle / displayName */
  q?: string;
}
export type ListThreadCandidatesResponse = { items: User[] };

/** POST /api/threads/:id/members —— 直接把社区成员拉入（仅组内成员可用） */
export interface AddThreadMemberRequest {
  userId: ID;
}
export type AddThreadMemberResponse = ThreadMemberItem;

/** DELETE /api/threads/:id/members/:userId —— 移除成员（发起人/owner·admin）；移除自己即退出 */
export type RemoveThreadMemberResponse = EmptyResponse;

// ------- 已读 -------

/** GET /api/threads/:id/read-state —— 我在该讨论组的已读 */
export type GetThreadReadStateResponse = ThreadReadState & { lastMessageAt: TimestampMs | null };

/** POST /api/threads/:id/read-state —— 上报「读到哪条」（必须属于该讨论组） */
export interface UpdateThreadReadStateRequest {
  lastReadMessageId: ID;
}
export type UpdateThreadReadStateResponse = ThreadReadState;
