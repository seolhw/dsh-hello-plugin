// ===============================================================
// Hub WebSocket 协议
// 连接：GET /ws 升级，URL 参数：
//   ?token=<jwt-or-bearer-token>    身份令牌（也可以走 Sec-WebSocket-Protocol header）
//   ?compression=0                  预留
//
// 所有帧都是 JSON 文本帧，统一 Envelope 结构：
//   { type: "xxx", payload: {...}, id?: "req-uuid" }
//
// 对于需要应答的请求帧（带 id），服务端回：
//   { type: "ok",    payload: {...}, id: "<同 req 的 id>" }
//   { type: "error", payload: ApiError, id: "<同 req 的 id>" }
//
// 服务端主动推送（无 id）：
//   { type: "evt.xxx", payload: {...} }
// ===============================================================

import type { ApiError, CursorPaginationQuery } from "./api/common";
import type { CreateMessageRequest, UpdateMessageRequest } from "./api/messages";
import type { ChannelReadState, ID, Message, TimestampMs, User } from "./entities";

// ======= 通用信封 =======

export interface ClientReq<TType extends string, TPayload> {
  type: TType;
  payload: TPayload;
  /** 请求 ID；有 id 表示需要服务端回 ok/error */
  id?: string;
}

export interface ServerRespOk<TPayload> {
  type: "ok";
  payload: TPayload;
  id: string;
}

export interface ServerRespError {
  type: "error";
  payload: ApiError;
  id: string;
}

export type ServerResp<TPayload = unknown> = ServerRespOk<TPayload> | ServerRespError;

export interface ServerEvt<TType extends string, TPayload> {
  type: TType;
  payload: TPayload;
  /** 推送发出来的时间（客户端可以拿这个做排序/去抖） */
  ts: TimestampMs;
}

// ======= 连接生命周期 =======

/** 服务端在 WS 握手完成后推的第一帧：确认身份 + 给会话 ID */
export type EvtHello = ServerEvt<
  "evt.hello",
  {
    connectionId: ID;
    user: User & { tokenIat: TimestampMs };
    serverTime: TimestampMs;
    /** 心跳间隔（秒）；客户端每 interval*0.8 秒发 ping */
    heartbeatIntervalSec: number;
  }
>;

/** C→S：心跳 */
export type ReqPing = ClientReq<"ping", { clientTime: TimestampMs }>;
/** S→C：心跳应答 */
export type RespPong = ServerRespOk<{ serverTime: TimestampMs; echoClientTime: TimestampMs }>;

// ======= 房间（频道）管理 =======

/** C→S：加入一个频道（即订阅它的消息推送） */
export interface JoinChannelPayload {
  channelId: ID;
  /** 可选：加入后立即向后拉 N 条历史（相当于一次 history 调用），减少 HTTP 请求 */
  prefetch?: CursorPaginationQuery;
}
export type ReqJoinChannel = ClientReq<"channel.join", JoinChannelPayload>;

export interface JoinChannelRespPayload {
  channelId: ID;
  /** 在线人数（不保证精确，用来显示「当前 x 人在线」） */
  onlineCount: number;
  /** 如果请求带了 prefetch，直接返回首批历史；否则空 */
  prefetch?: {
    items: (Message & { author: User })[];
    nextCursor: string | null;
  };
  /** 我在这个频道当前的未读快照 */
  readState: ChannelReadState & { lastMessageAt: TimestampMs | null };
}
export type RespJoinChannel = ServerRespOk<JoinChannelRespPayload>;

/** C→S：离开 */
export type ReqLeaveChannel = ClientReq<"channel.leave", { channelId: ID }>;
export type RespLeaveChannel = ServerRespOk<{ channelId: ID }>;

// ======= 消息收发 =======

/** C→S：发消息（和 REST POST /messages 等价，MVP 推荐走 WS 实现端到端延迟更低） */
export interface SendMessagePayload extends CreateMessageRequest {
  channelId: ID;
  /** 客户端生成的临时消息 id（UUID），服务端回 ok 时带上映射回真实 id；evt.message.new 也带，方便客户端「假消息」替换 */
  clientMsgId?: ID;
}
export type ReqSendMessage = ClientReq<"message.send", SendMessagePayload>;

export interface SendMessageRespPayload {
  channelId: ID;
  clientMsgId: ID | null;
  message: Message & { author: User };
}
export type RespSendMessage = ServerRespOk<SendMessageRespPayload>;

/** S→C：新消息广播（任何成员 join 的频道里，有消息被创建了） */
export type EvtMessageNew = ServerEvt<
  "evt.message.new",
  {
    channelId: ID;
    message: Message & { author: User };
    clientMsgId?: ID;
    /** 这条消息对我而言是不是 @mention（服务端算好，客户端直接标红） */
    mentionMe: boolean;
  }
>;

/** S→C：消息被更新（作者编辑 / admin 改解决状态等） */
export type EvtMessageUpdated = ServerEvt<
  "evt.message.updated",
  {
    channelId: ID;
    message: Message & { author: User };
  }
>;

/** S→C：消息被删除 */
export type EvtMessageDeleted = ServerEvt<
  "evt.message.deleted",
  {
    channelId: ID;
    messageId: ID;
    /** 删的人（用于 toast：「xxx 撤回了一条消息」） */
    deletedBy: ID;
  }
>;

// ======= 消息编辑 / 删除（WS 也能发；和 REST 二选一） =======

export type ReqUpdateMessage = ClientReq<
  "message.update",
  { messageId: ID } & UpdateMessageRequest
>;
export type RespUpdateMessage = ServerRespOk<{ message: Message & { author: User } }>;

export type ReqDeleteMessage = ClientReq<"message.delete", { messageId: ID }>;
export type RespDeleteMessage = ServerRespOk<{ messageId: ID }>;

// ======= 解决 help（通过 WS 也行，方便实时广播状态变更） =======

export type ReqResolveHelp = ClientReq<
  "message.resolve",
  {
    messageId: ID;
    resolved: boolean;
    answerMessageId?: ID | null;
  }
>;
export type RespResolveHelp = ServerRespOk<{ message: Message & { author: User } }>;

// ======= 未读上报 =======

export type ReqMarkRead = ClientReq<"channel.markRead", { channelId: ID; lastReadMessageId: ID }>;
export type RespMarkRead = ServerRespOk<ChannelReadState>;

/** S→C：有新消息进来时，如果客户端需要更精确的未读计数（可选） */
export type EvtReadStateUpdated = ServerEvt<
  "evt.channel.read-state",
  {
    channelId: ID;
    unreadMentions: number;
    /** 新未读增量；客户端自己累加也可以，用这个简化实现 */
    hasUnread: boolean;
  }
>;

// ======= 用户上线/下线（MVP 可选：只有同社区成员 join 的频道会广播） =======

export type PresenceKind = "online" | "away" | "offline";

export type ReqSetPresence = ClientReq<"presence.set", { kind: PresenceKind }>;
export type RespSetPresence = ServerRespOk<{ kind: PresenceKind }>;

export type EvtPresenceChanged = ServerEvt<
  "evt.user.presence",
  {
    userId: ID;
    kind: PresenceKind;
    /** 哪些社区受影响（避免客户端无意义重绘） */
    communityIds: ID[];
  }
>;

// ======= 联合类型：方便在 switch 里穷举 =======

export type ClientFrame =
  | ReqPing
  | ReqJoinChannel
  | ReqLeaveChannel
  | ReqSendMessage
  | ReqUpdateMessage
  | ReqDeleteMessage
  | ReqResolveHelp
  | ReqMarkRead
  | ReqSetPresence;

export type ServerFrame =
  | RespPong
  | RespJoinChannel
  | RespLeaveChannel
  | RespSendMessage
  | RespUpdateMessage
  | RespDeleteMessage
  | RespResolveHelp
  | RespMarkRead
  | RespSetPresence
  | ServerRespError
  // 主动推送
  | EvtHello
  | EvtMessageNew
  | EvtMessageUpdated
  | EvtMessageDeleted
  | EvtReadStateUpdated
  | EvtPresenceChanged;
