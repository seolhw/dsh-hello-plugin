import type { ID, Share, ShareKind, User } from "../entities";
import type { CursorPaginated, CursorPaginationQuery, EmptyResponse } from "./common";

// ===============================================================
// /api/shares/*  ——  分享（两种来源）
//   channel-snapshot：把某个频道最近的消息打成 JSON 包（服务端读 D1 打包）
//   agent-session   ：把本机 DSH 会话打包（host 打包后直传 R2，这里只登记元数据）
// 可见性：来源为公开社区时置 isPublic=true（进分享广场）；其余仅来源社区成员/作者可见。
// ===============================================================

/** POST /api/shares/snapshot —— 频道快照（须为该社区成员） */
export interface CreateShareRequest {
  kind?: "channel-snapshot";
  channelId: ID;
  /** 缺省用「频道快照：<channel name>」 */
  title?: string;
  summary?: string | null;
}

export interface CreateShareResponse {
  share: Share & { author: User };
  /** 包体下载地址（GET /api/r2/objects/<key>?download=1，公开但 key 不可枚举） */
  downloadUrl: string;
}

/**
 * POST /api/shares/agent-session —— 登记一条 DSH 会话分享。
 * 包体由本机 host 打包后经 PUT /api/r2/objects 直传 R2，服务端只落元数据。
 */
export interface CreateAgentSessionShareRequest {
  /** 包体在 R2 的 key（host 上传后拿到） */
  r2Key: string;
  title: string;
  summary?: string | null;
  sizeBytes: number;
  sha256?: string | null;
  /** 会话包 manifest 快照（cwd / sessionId / eventCount 等，供卡片与克隆校验） */
  manifest?: Record<string, unknown>;
  /** 归属社区：提供时要求是成员，并据社区可见性决定是否公开上广场 */
  communityId?: ID | null;
}

export type CreateAgentSessionShareResponse = CreateShareResponse;

/** GET /api/shares/:id —— 分享元数据 + 下载地址 */
export type GetShareResponse = Share & {
  author: User;
  downloadUrl: string;
};

/** GET /api/shares/discover —— 公开分享流（仅 isPublic=true） */
export interface ListSharesQuery extends CursorPaginationQuery {
  kind?: ShareKind;
  authorId?: ID;
  q?: string;
}
export type ListSharesResponse = CursorPaginated<Share & { author: User }>;

/** GET /api/shares/mine —— 我创建的分享 */
export interface ListMySharesQuery extends CursorPaginationQuery {
  kind?: ShareKind;
}
export type ListMySharesResponse = CursorPaginated<Share & { author: User }>;

/** DELETE /api/shares/:id —— 删除自己创建的分享（含 R2 包体） */
export type DeleteShareResponse = EmptyResponse;
