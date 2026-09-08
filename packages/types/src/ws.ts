// ===============================================================
// Server WebSocket 协议（每条连接 = 一个频道 DO，一频道一实例）
//
// 连接：GET /ws?token=<session-token>&channelId=<id>
//   Worker 完成 Better Auth 鉴权 → 路由到该频道的 Durable Object
//   （ROOM_ACTOR.idFromName(channelId)），DO 再校验社区成员资格并 accept。
//   因此协议层面没有 channel.join/leave——连接建立即代表订阅该频道。
//
// 所有帧都是 JSON 文本帧，统一 Envelope 结构：
//   { type: "xxx", payload: {...}, id?: "req-uuid" }
//
// 对带 id 的请求帧，服务端回：
//   { type: "ok",    payload: {...}, id: "<同 req 的 id>" }
//   { type: "error", payload: ApiError, id: "<同 req 的 id>" }
//
// 服务端主动推送（无 id）：
//   { type: "evt.xxx", payload: {...}, ts: <发送时间> }
//
// 数据归属（隔离原则）：
//   - 消息/未读/成员/社区等共享规范数据 => 业务 D1（REST 读写）
//   - 该频道的在线 presence / 连接订阅等房间私有热状态 => 频道 DO
//     （内存索引 + WebSocket attachment；presence 落 DO 私有 SQLite）
//   - 实时广播：REST 写入成功 → RPC 通知该频道 DO 实例内扇出
// ===============================================================

import type { ApiError } from "./api/common";
import type { ID, Message, TimestampMs, User } from "./entities";

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

/** 服务端在 WS 握手完成后推的第一帧：确认身份 + 所订阅频道 */
export type EvtHello = ServerEvt<
  "evt.hello",
  {
    connectionId: ID;
    /** 本条连接订阅的频道（= 频道 DO 的稳定名字 id） */
    channelId: ID;
    user: User & { tokenIat: TimestampMs };
    serverTime: TimestampMs;
    /** 心跳间隔（秒）；客户端每 interval*0.8 秒发一次 JSON ping */
    heartbeatIntervalSec: number;
    /** 当前该频道的在线连接数（同人多端会重复计，仅作展示） */
    onlineCount: number;
  }
>;

/** C→S：心跳（协议级 ping 由运行时应答，这里是应用层保活/RTT） */
export type ReqPing = ClientReq<"ping", { clientTime: TimestampMs }>;
/** S→C：心跳应答 */
export type RespPong = ServerRespOk<{ serverTime: TimestampMs; echoClientTime: TimestampMs }>;

// ======= 在线状态（presence，仅影响本频道） =======

export type PresenceKind = "online" | "away" | "offline";

export type ReqSetPresence = ClientReq<"presence.set", { kind: PresenceKind }>;
export type RespSetPresence = ServerRespOk<{ kind: PresenceKind }>;

// ======= 服务端主动推送：频道消息事件 =======

/** S→C：新消息（REST 写库成功后经 RPC 广播到这里扇出） */
export type EvtMessageNew = ServerEvt<
  "evt.message.new",
  {
    channelId: ID;
    message: Message & { author: User };
    /** 这条消息对我而言是不是 @mention（服务端按接收者算好） */
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

// ======= 未读（走 REST，见 messages.ts 的 read-state 端点） =======
// 说明：未读/已读状态需要跨频道的聚合（社区侧边栏 × 频道），
// 放业务 D1 才是正确归属；频道 DO 不做持久化副本，因此这里没有相关帧。

// ======= 联合类型：方便在 switch 里穷举 =======

export type ClientFrame = ReqPing | ReqSetPresence;

export type ServerFrame =
  | RespPong
  | RespSetPresence
  | ServerRespError
  | EvtHello
  | EvtMessageNew
  | EvtMessageUpdated
  | EvtMessageDeleted;
