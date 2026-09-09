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
  | "ALREADY_MEMBER"
  | "INVITE_DUPLICATE"
  | "INVITE_INVALID"
  | "COMMUNITY_DAILY_LIMIT"
  | "COMMUNITY_TOTAL_LIMIT"
  | "RATE_LIMITED"
  | "RETRACT_EXPIRED"
  | "INTERNAL";

/** 空成功响应（200 / 204） */
export type EmptyResponse = Record<never, never>;
