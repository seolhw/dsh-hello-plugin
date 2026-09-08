import type { ID, TimestampMs } from "../entities";

// ===============================================================
// API 通用类型：分页、错误、空响应
// ===============================================================

/** 游标分页请求（按 createdAt 倒序） */
export interface CursorPaginationQuery {
  /** 返回条数上限，默认 50 */
  limit?: number;
  /** 游标：上次最后一条的 createdAt / id；null = 从头开始 */
  cursor?: string | null;
}

/** 游标分页响应 */
export interface CursorPaginated<T> {
  items: T[];
  /** 下一页游标，null 表示没有更多 */
  nextCursor: string | null;
  /** 本页条数 */
  count: number;
}

/** 偏移分页请求（小数据量场景，如社区列表、成员列表） */
export interface OffsetPaginationQuery {
  limit?: number;
  offset?: number;
}

export interface OffsetPaginated<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

/** 统一错误响应体 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** 可选的字段级错误 */
  details?: Record<string, string[]>;
  requestId?: string;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "PAYLOAD_TOO_LARGE"
  | "INVITE_CODE_INVALID"
  | "INVITE_CODE_USED"
  | "COMMUNITY_DAILY_LIMIT"
  | "COMMUNITY_TOTAL_LIMIT"
  | "RATE_LIMITED"
  | "INTERNAL";

/** 空成功响应（200 / 204） */
export type EmptyResponse = Record<never, never>;

/** R2 预签名上传请求 */
export interface R2SignedUploadRequest {
  /** 逻辑文件分类：message-attachment / share-package / avatar */
  intent: "message-attachment" | "share-package" | "avatar" | "community-icon" | "community-banner";
  fileName: string;
  /** 字节数 */
  size: number;
  /** MIME 类型 */
  contentType: string;
  /** 关联上下文（可选），如 messageId / shareId */
  contextId?: ID;
}

/** R2 预签名上传响应 */
export interface R2SignedUploadResponse {
  /** PUT 到这个 URL */
  uploadUrl: string;
  /** 上传后，调用下游 API（如发消息、创建分享）时带这个 r2Key */
  r2Key: string;
  /** 有效期 ms */
  expiresAt: TimestampMs;
  /** 建议添加的请求头（AWS SigV4 需要的 x-amz-*） */
  requiredHeaders: Record<string, string>;
  /** 上传完成后可公开访问的 URL（若对象设为 public-read）；否则 null，客户端统一走后端代取 */
  publicUrl: string | null;
}
