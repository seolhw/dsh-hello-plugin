// ================================================================
// Server REST client（浏览器端直连 @dsh-talk/server 后端）
// 认证采用 Better Auth Bearer Token：
//   - /api/auth/*：登录/注册/会话/改密等（见 @dsh-talk/types/api/auth）
//   - 业务 REST：Authorization: Bearer <session token>
// 类型契约复用 @dsh-talk/types/api。
// ================================================================

import type {
  ApiError,
  AuthUser,
  ChangePasswordRequest,
  GetMyCommunitiesResponse,
  GetSessionResponse,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  SendVerificationEmailRequest,
  SignInEmailRequest,
  SignInUsernameRequest,
  SignUpEmailRequest,
  UpdateUserRequest,
} from "@dsh-talk/types/api";

export class ServerApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string | undefined,
    readonly details?: Record<string, string[]> | undefined,
  ) {
    super(message);
  }
}

const errorMessage = (data: unknown, text: string): string => {
  if (data && typeof data === "object") {
    const maybe = data as { message?: unknown; error?: unknown };
    if (typeof maybe.message === "string" && maybe.message.length > 0) return maybe.message;
    if (typeof maybe.error === "string" && maybe.error.length > 0) return maybe.error;
    // Better Auth 字段级错误：{ error: { field: [...] } }
    if (maybe.error && typeof maybe.error === "object") {
      const first = Object.values(maybe.error)[0];
      if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    }
  }
  return text.length > 0 ? text : "request failed";
};

/** 登录/注册类端点返回：user + 会话 token（响应头 set-auth-token 或 body.token） */
export interface AuthCallResult {
  user: AuthUser | null;
  token: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class ServerClient {
  readonly baseUrl: string;
  token: string | null;

  constructor(baseUrl: string, token: string | null = null) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
  }

  get hasToken(): boolean {
    return this.token !== null && this.token.length > 0;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private async call<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (auth && this.hasToken) headers.authorization = `Bearer ${this.token}`;

    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);

    const res = await fetch(this.url(path), init);
    const text = await res.text();
    let data: unknown = null;
    if (text.length > 0) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const err = data as ApiError | null;
      throw new ServerApiError(
        res.status,
        err?.code ?? "AUTH_ERROR",
        errorMessage(data, text),
        err?.requestId,
        err?.details,
      );
    }
    return data as T;
  }

  /** 登录/注册专用：同时从响应头/body 收集会话 token（Bearer 用） */
  private async authCall(method: string, path: string, body: unknown): Promise<AuthCallResult> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.hasToken) headers.authorization = `Bearer ${this.token}`;
    const res = await fetch(this.url(path), { method, headers, body: JSON.stringify(body) });
    const text = await res.text();
    let data: unknown = null;
    if (text.length > 0) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const err = data as ApiError | null;
      throw new ServerApiError(
        res.status,
        err?.code ?? "AUTH_ERROR",
        errorMessage(data, text),
        err?.requestId,
        err?.details,
      );
    }
    const tokenFromHeader = res.headers.get("set-auth-token");
    const tokenFromBody = isRecord(data) && typeof data.token === "string" ? data.token : null;
    const user = isRecord(data) && isRecord(data.user) ? (data.user as unknown as AuthUser) : null;
    return { user, token: tokenFromHeader ?? tokenFromBody };
  }

  // ---------- /api/auth/*（Better Auth） ----------

  /** POST /api/auth/sign-up/email —— 邮箱注册（用户名可选） */
  signUpEmail(body: SignUpEmailRequest): Promise<AuthCallResult> {
    return this.authCall("POST", "/api/auth/sign-up/email", body);
  }

  /** POST /api/auth/sign-in/email —— 邮箱登录 */
  signInEmail(body: SignInEmailRequest): Promise<AuthCallResult> {
    return this.authCall("POST", "/api/auth/sign-in/email", body);
  }

  /** POST /api/auth/sign-in/username —— 用户名登录 */
  signInUsername(body: SignInUsernameRequest): Promise<AuthCallResult> {
    return this.authCall("POST", "/api/auth/sign-in/username", body);
  }

  /** POST /api/auth/sign-out —— 登出（吊销当前会话）。Better Auth 要求 JSON body */
  signOut(): Promise<{ success: boolean }> {
    return this.call<{ success: boolean }>("POST", "/api/auth/sign-out", {}, true);
  }

  /**
   * GET /api/auth/get-session —— 当前登录态。
   * 注意：token 失效/被吊销时返回 200 + null（不是 401），调用方需判空。
   */
  getSession(): Promise<GetSessionResponse | null> {
    return this.call<GetSessionResponse | null>("GET", "/api/auth/get-session", undefined, true);
  }

  /** POST /api/auth/change-password —— 修改密码 */
  changePassword(body: ChangePasswordRequest): Promise<{ status: boolean }> {
    return this.call<{ status: boolean }>("POST", "/api/auth/change-password", body, true);
  }

  /** POST /api/auth/update-user —— 改资料/改用户名 */
  updateUser(body: UpdateUserRequest): Promise<{ user: AuthUser }> {
    return this.call<{ user: AuthUser }>("POST", "/api/auth/update-user", body, true);
  }

  /** POST /api/auth/send-verification-email —— 重发验证邮件 */
  sendVerificationEmail(body: SendVerificationEmailRequest): Promise<{ status: boolean }> {
    return this.call<{ status: boolean }>("POST", "/api/auth/send-verification-email", body);
  }

  /** POST /api/auth/request-password-reset —— 忘记密码：发重置邮件 */
  requestPasswordReset(body: RequestPasswordResetRequest): Promise<{ status: boolean }> {
    return this.call<{ status: boolean }>("POST", "/api/auth/request-password-reset", body);
  }

  /** POST /api/auth/reset-password —— 用邮件里的 token 重设密码 */
  resetPassword(body: ResetPasswordRequest): Promise<{ status: boolean }> {
    return this.call<{ status: boolean }>("POST", "/api/auth/reset-password", body);
  }

  // ---------- 业务 REST ----------

  /** GET /api/communities/mine —— 我加入的社区 */
  myCommunities(): Promise<GetMyCommunitiesResponse> {
    return this.call<GetMyCommunitiesResponse>("GET", "/api/communities/mine", undefined, true);
  }
}
