// ================================================================
// Server REST client（浏览器端直连 @dsh-talk/server 后端）
// 所有调用类型严格复用 @dsh-talk/types/api 的路由契约
// ================================================================

import type {
  ApiError,
  ExchangeInviteRequest,
  ExchangeInviteResponse,
  GetMeResponse,
  GetMyCommunitiesResponse,
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

const errorMessage = (data: ApiError | null, text: string): string =>
  data?.message ?? (text.length > 0 ? text : "request failed");

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
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
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
        err?.code ?? "INTERNAL",
        errorMessage(err, text),
        err?.requestId,
        err?.details,
      );
    }
    return data as T;
  }

  /** POST /api/auth/exchange-invite —— 平台注册码换令牌（无需鉴权） */
  exchangeInvite(body: ExchangeInviteRequest): Promise<ExchangeInviteResponse> {
    return this.call<ExchangeInviteResponse>("POST", "/api/auth/exchange-invite", body);
  }

  /** GET /api/auth/me —— 当前用户 */
  me(): Promise<GetMeResponse> {
    return this.call<GetMeResponse>("GET", "/api/auth/me", undefined, true);
  }

  /** GET /api/communities/mine —— 我加入的社区 */
  myCommunities(): Promise<GetMyCommunitiesResponse> {
    return this.call<GetMyCommunitiesResponse>("GET", "/api/communities/mine", undefined, true);
  }
}
