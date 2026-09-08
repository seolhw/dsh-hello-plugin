import type { ChannelReadState, ID, Message, User } from "../entities";
import type { CursorPaginated, CursorPaginationQuery, EmptyResponse } from "./common";
import type { MessageAttachmentPut } from "./r2";

// ===============================================================
// /api/channels/:id/*  ——  频道消息 & 未读
// ===============================================================

/** GET /api/channels/:id/messages —— 历史消息（倒序 = 最新在前；倒序翻页靠 cursor） */
export interface ListMessagesQuery extends CursorPaginationQuery {
  /** 可选：只看某个线程（未来 P1）；MVP 留空 */
  threadId?: ID | null;
  /** 默认倒序（新→旧）。传 asc = 旧→新 */
  direction?: "desc" | "asc";
}

export type ListMessagesResponse = CursorPaginated<
  Message & { author: User; replyTo?: (Message & { author: User }) | null }
>;

/** POST /api/channels/:id/messages —— 发消息（实时广播走 WS） */
export interface CreateMessageRequest {
  content: string;
  /** 附件：先 PUT /api/r2/objects 拿 r2Key 列表再随消息提交 */
  attachments?: MessageAttachmentPut[];
  /** @handle 列表（前端传 handle，后端解析成 userId 存入 mentions） */
  mentionHandles?: string[];
  /** 回复的父消息 */
  replyToId?: ID | null;
  /** 挂一张分享卡片（通过 POST /api/shares 先创建，拿 id） */
  shareId?: ID | null;
}

export type CreateMessageResponse = Message & { author: User };

/** PATCH /api/messages/:id —— 改消息（作者本人 or admin） */
export interface UpdateMessageRequest {
  content?: string;
}
export type UpdateMessageResponse = Message & { author: User };

/** DELETE /api/messages/:id —— 删消息（作者 or admin） */
export type DeleteMessageResponse = EmptyResponse;

// ------- #help 解决闭环 --------------------------------------------------

/** POST /api/messages/:id/resolve —— 标记/取消 help 提问已解决（提问作者 + 社区 admin/owner） */
export interface ResolveHelpRequest {
  resolved: boolean;
  /** 引用哪条消息作为「答案」（可选） */
  answerMessageId?: ID | null;
}

export type ResolveHelpResponse = Message & { author: User };

// ------- 未读 -----------------------------------------------------------

/** GET /api/channels/:id/read-state —— 我在该频道的未读 */
export type GetReadStateResponse = ChannelReadState & { lastMessageAt: number | null };

/** POST /api/channels/:id/read-state —— 上报「读到了哪条」（一般 WS 里也能发，HTTP 兜底） */
export interface UpdateReadStateRequest {
  lastReadMessageId: ID;
}
export type UpdateReadStateResponse = ChannelReadState;
