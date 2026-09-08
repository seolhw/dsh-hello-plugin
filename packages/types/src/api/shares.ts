import type { ID, Share, ShareKind, User } from "../entities";
import type { CursorPaginated, CursorPaginationQuery, EmptyResponse } from "./common";

// ===============================================================
// /api/shares/*  ——  会话快照分享（session）
// 概念：把某个频道最近的消息打成 JSON 包存进 R2，落一份分享元数据；
//       快照可公开（源自公开社区）或仅社区成员/作者可见，供克隆还原（阶段3 host）。
// 流程：POST /api/shares/snapshot（服务端读 D1 打包）→ 拿 share + downloadUrl
// ===============================================================

/** POST /api/shares/snapshot —— 快照一个频道的会话（须为该社区成员） */
export interface CreateShareRequest {
  kind?: "session";
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

/** GET /api/shares/:id —— 分享元数据 + 下载地址 */
export type GetShareResponse = Share & {
  author: User;
  downloadUrl: string;
};

/** GET /api/shares/discover —— 公开快照流（仅 isPublic=true 的快照） */
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
