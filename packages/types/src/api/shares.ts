import type { ID, Share, User } from "../entities";

// ===============================================================
// /api/shares/*  ——  DSH 会话分享
//   agent-session：把本机 DSH 会话打包（host 打包后直传 R2，这里只登记元数据）
// 可见性：归属社区为公开社区时置 isPublic=true；其余仅来源社区成员/作者可见。
// ===============================================================

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

/** POST /api/shares/agent-session 的响应 */
export interface CreateAgentSessionShareResponse {
  share: Share & { author: User };
  /** 包体下载地址（GET /api/r2/objects/<key>?download=1，公开但 key 不可枚举） */
  downloadUrl: string;
}

/** GET /api/shares/:id —— 分享元数据 + 下载地址 */
export type GetShareResponse = Share & {
  author: User;
  downloadUrl: string;
};
