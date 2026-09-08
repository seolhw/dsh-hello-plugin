import type { ID, Share, ShareKind, User } from "../entities";
import type {
  CursorPaginated,
  CursorPaginationQuery,
  R2SignedUploadRequest,
  R2SignedUploadResponse,
} from "./common";

// ===============================================================
// /api/shares/*  ——  会话克隆包 / workflow 分享
// 两步：① 拿 R2 预签名上传 URL → ② 直传 R2 → ③ POST /api/shares 落元数据
// ===============================================================

/** POST /api/r2/sign-upload（通用签名；shares 用 intent=share-package） */
export type SignShareUploadRequest = R2SignedUploadRequest & { intent: "share-package" };
export type SignShareUploadResponse = R2SignedUploadResponse;

/** POST /api/shares —— 上传完 R2 后，落元数据 */
export interface CreateShareRequest {
  kind: ShareKind;
  title: string;
  summary?: string | null;
  coverUrl?: string | null;
  /** 从 sign-upload 响应里拿的 */
  r2Key: string;
  sizeBytes: number;
  sha256?: string | null;
  /** 克隆包/workflow 的 manifest 快照（前端/host 打包时生成，原样存 JSONB） */
  manifest: Record<string, unknown>;
  /** 发布到哪个 showcase 频道（可选）。不传 = 只在「我的分享」里，不进频道 */
  publishToChannelId?: ID | null;
  /** 发布时附带的频道消息正文（不传就发一张纯卡片） */
  publishMessageText?: string | null;
}

export interface CreateShareResponse {
  share: Share & { author: User };
  /** 如果指定了 publishToChannelId，会自动创建一条带 shareCard 的消息 */
  publishedMessageId?: ID | null;
}

/** GET /api/shares/:id —— 取分享元数据（决定要不要点克隆） */
export type GetShareResponse = Share & {
  author: User;
  /** 下载链接（预签名，短期有效）。给 client 的 host 调下载用 */
  downloadUrl: string;
};

/** GET /api/shares/discover —— showcase 聚合页（跨社区，或限定社区内） */
export interface ListSharesQuery extends CursorPaginationQuery {
  kind?: ShareKind;
  communityId?: ID;
  authorId?: ID;
  q?: string;
}
export type ListSharesResponse = CursorPaginated<Share & { author: User }>;

/** GET /api/shares/mine —— 我自己的分享列表 */
export type ListMySharesQuery = CursorPaginationQuery & { kind?: ShareKind };
export type ListMySharesResponse = CursorPaginated<Share & { author: User }>;

/** DELETE /api/shares/:id —— 删自己的分享（作者 + admin） */
export type DeleteShareResponse = { ok: true };
