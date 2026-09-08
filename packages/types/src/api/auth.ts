import type { User } from "../entities";
import type { EmptyResponse } from "./common";

// ===============================================================
// /api/auth/*  ——  身份 & 注册码 & 当前用户
// ===============================================================

/** POST /api/auth/exchange-invite —— 用平台注册码换令牌 */
export interface ExchangeInviteRequest {
  /** AUTH_INVITE_CODES 里种子的那个码，一次性 */
  inviteCode: string;
  /** 用户自己填的 @handle（全局唯一） */
  handle: string;
  /** 可选显示名 */
  displayName?: string | null;
}

export interface ExchangeInviteResponse {
  token: string;
  user: User;
}

/** GET /api/auth/me —— 当前登录用户（401 表示令牌无效/过期） */
export type GetMeResponse = User;

/** PATCH /api/auth/me —— 修改自己的资料 */
export interface UpdateMeRequest {
  displayName?: string | null;
  avatarUrl?: string | null;
  /** handle 一般不允许改，留位；改了需要服务端校验唯一性 */
  handle?: string;
}

export type UpdateMeResponse = User;

/** POST /api/auth/logout —— 吊销当前令牌（可选，当前 MVP 无会话表可空操作） */
export type LogoutResponse = EmptyResponse;
