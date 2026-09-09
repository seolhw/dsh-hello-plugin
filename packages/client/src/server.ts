// ================================================================
// Server REST client（浏览器端直连 @dsh-talk/server 后端）
// 认证采用 Better Auth Bearer Token：
//   - /api/auth/*：登录/注册/会话/改密等（见 @dsh-talk/types/api/auth）
//   - 业务 REST：Authorization: Bearer <session token>
// 类型契约复用 @dsh-talk/types/api（请求）+ @dsh-talk/types/entities（实体）。
// ================================================================

import type {
  ApiError,
  AuthUser,
  ChangePasswordRequest,
  CreateChannelRequest,
  CreateChannelResponse,
  CreateCommunityRequest,
  CreateCommunityResponse,
  CreateMessageRequest,
  CreateMessageResponse,
  CreateShareRequest,
  CreateShareResponse,
  DeleteChannelResponse,
  GetCommunityResponse,
  GetMyCommunitiesResponse,
  GetReadStateResponse,
  GetSessionResponse,
  JoinByInviteRequest,
  JoinByInviteResponse,
  JoinCommunityResponse,
  LeaveCommunityResponse,
  ListMembersQuery,
  ListMembersResponse,
  ListMessagesQuery,
  ListMessagesResponse,
  RemoveMemberResponse,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  RotateInviteResponse,
  SendVerificationEmailRequest,
  SendVerificationOTPRequest,
  SignInEmailRequest,
  SignInUsernameRequest,
  SignUpEmailRequest,
  UpdateChannelRequest,
  UpdateChannelResponse,
  UpdateCommunityRequest,
  UpdateCommunityResponse,
  UpdateMemberRoleRequest,
  UpdateMemberRoleResponse,
  UpdateMessageRequest,
  UpdateMessageResponse,
  UpdateReadStateRequest,
  UpdateUserRequest,
  UploadAttachmentResponse,
  VerifyEmailOTPRequest,
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

function toQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] =>
      entry[1] !== undefined && entry[1] !== null && String(entry[1]).length > 0,
  );
  if (entries.length === 0) return "";
  return `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")}`;
}

// ---------- 网络层失败自动重试 ----------
// fetch 只有在「网络层」失败时才会 reject（如 ERR_CONNECTION_REFUSED / ERR_NETWORK，
// 表现为 TypeError: Failed to fetch）；HTTP 状态码错误会正常 resolve，交给 !res.ok 处理。
// 本地开发时后端 wrangler dev 刚启动、端口尚未就绪就会命中这里，做有上限的重试，
// 消除「页面先于后端就绪导致的一次性 REFUSED」。
const NETWORK_RETRY_MAX = 4;
const NETWORK_RETRY_BASE_MS = 1000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= NETWORK_RETRY_MAX; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (attempt === NETWORK_RETRY_MAX) break;
      await sleep(NETWORK_RETRY_BASE_MS * (attempt + 1));
    }
  }
  throw lastError;
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

    const res = await fetchWithRetry(this.url(path), init);
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
    const res = await fetchWithRetry(this.url(path), {
      method,
      headers,
      body: JSON.stringify(body),
    });
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

  /** POST /api/auth/email-otp/send-verification-otp —— 发送 6 位邮箱验证码 */
  sendVerificationOtp(body: SendVerificationOTPRequest): Promise<{ success: boolean }> {
    return this.call<{ success: boolean }>(
      "POST",
      "/api/auth/email-otp/send-verification-otp",
      body,
    );
  }

  /** POST /api/auth/email-otp/verify-email —— 校验 6 位验证码；token 非空时已自动登录 */
  verifyEmail(body: VerifyEmailOTPRequest): Promise<AuthCallResult> {
    return this.authCall("POST", "/api/auth/email-otp/verify-email", body);
  }

  /** POST /api/auth/request-password-reset —— 忘记密码：发重置邮件 */
  requestPasswordReset(body: RequestPasswordResetRequest): Promise<{ status: boolean }> {
    return this.call<{ status: boolean }>("POST", "/api/auth/request-password-reset", body);
  }

  /** POST /api/auth/reset-password —— 用邮件里的 token 重设密码 */
  resetPassword(body: ResetPasswordRequest): Promise<{ status: boolean }> {
    return this.call<{ status: boolean }>("POST", "/api/auth/reset-password", body);
  }

  // ---------- 业务 REST：社区 / 频道 / 成员 ----------

  /** GET /api/communities/mine —— 我加入的社区（含未读概览） */
  myCommunities(): Promise<GetMyCommunitiesResponse> {
    return this.call<GetMyCommunitiesResponse>("GET", "/api/communities/mine", undefined, true);
  }

  /** GET /api/communities/:id —— 社区详情（频道 + 我的角色） */
  getCommunity(communityId: string): Promise<GetCommunityResponse> {
    return this.call<GetCommunityResponse>(
      "GET",
      `/api/communities/${communityId}`,
      undefined,
      true,
    );
  }

  /** POST /api/communities —— 创建社区 */
  createCommunity(body: CreateCommunityRequest): Promise<CreateCommunityResponse> {
    return this.call<CreateCommunityResponse>("POST", "/api/communities", body, true);
  }

  /** POST /api/communities/join-by-code —— 邀请码加入（私有/公开通用） */
  joinByCode(body: JoinByInviteRequest): Promise<JoinByInviteResponse> {
    return this.call<JoinByInviteResponse>("POST", "/api/communities/join-by-code", body, true);
  }

  /** POST /api/communities/:id/join —— 直接加入公开社区 */
  joinCommunity(communityId: string): Promise<JoinCommunityResponse> {
    return this.call<JoinCommunityResponse>(
      "POST",
      `/api/communities/${communityId}/join`,
      {},
      true,
    );
  }

  /** POST /api/communities/:id/leave —— 退出社区（owner 不能退） */
  leaveCommunity(communityId: string): Promise<LeaveCommunityResponse> {
    return this.call<LeaveCommunityResponse>(
      "POST",
      `/api/communities/${communityId}/leave`,
      {},
      true,
    );
  }

  /** POST /api/communities/:id/channels —— 新建频道（owner/admin） */
  createChannel(communityId: string, body: CreateChannelRequest): Promise<CreateChannelResponse> {
    return this.call<CreateChannelResponse>(
      "POST",
      `/api/communities/${communityId}/channels`,
      body,
      true,
    );
  }

  /** PATCH /api/communities/:id —— 改社区（owner/admin） */
  updateCommunity(
    communityId: string,
    body: UpdateCommunityRequest,
  ): Promise<UpdateCommunityResponse> {
    return this.call<UpdateCommunityResponse>(
      "PATCH",
      `/api/communities/${communityId}`,
      body,
      true,
    );
  }

  /** POST /api/communities/:id/rotate-invite —— 轮换邀请码（owner/admin） */
  rotateInvite(communityId: string): Promise<RotateInviteResponse> {
    return this.call<RotateInviteResponse>(
      "POST",
      `/api/communities/${communityId}/rotate-invite`,
      {},
      true,
    );
  }

  /** GET /api/communities/:id/members —— 成员列表（须是成员） */
  listMembers(
    communityId: string,
    query: Pick<ListMembersQuery, "role" | "q" | "limit" | "offset"> = {},
  ): Promise<ListMembersResponse> {
    const qs = toQuery({
      role: query.role ?? "",
      q: query.q ?? "",
      limit: query.limit ?? 100,
      offset: query.offset ?? 0,
    });
    return this.call<ListMembersResponse>(
      "GET",
      `/api/communities/${communityId}/members${qs}`,
      undefined,
      true,
    );
  }

  /** PATCH /api/communities/:id/members/:userId/role —— 角色调整 / owner 转让 */
  updateMemberRole(
    communityId: string,
    userId: string,
    body: UpdateMemberRoleRequest,
  ): Promise<UpdateMemberRoleResponse> {
    return this.call<UpdateMemberRoleResponse>(
      "PATCH",
      `/api/communities/${communityId}/members/${userId}/role`,
      body,
      true,
    );
  }

  /** DELETE /api/communities/:id/members/:userId —— 踢人（owner/admin，不能踢 owner） */
  removeMember(communityId: string, userId: string): Promise<RemoveMemberResponse> {
    return this.call<RemoveMemberResponse>(
      "DELETE",
      `/api/communities/${communityId}/members/${userId}`,
      undefined,
      true,
    );
  }

  /** PATCH /api/channels/:id —— 频道改名/主题/类型（owner/admin） */
  updateChannel(channelId: string, body: UpdateChannelRequest): Promise<UpdateChannelResponse> {
    return this.call<UpdateChannelResponse>("PATCH", `/api/channels/${channelId}`, body, true);
  }

  /** DELETE /api/channels/:id —— 删频道（owner/admin） */
  deleteChannel(channelId: string): Promise<DeleteChannelResponse> {
    return this.call<DeleteChannelResponse>(
      "DELETE",
      `/api/channels/${channelId}`,
      undefined,
      true,
    );
  }

  // ---------- 业务 REST：消息 & 未读 ----------

  /** GET /api/channels/:id/messages —— 历史（desc 新→旧；cursor=某条 createdAt 翻更早） */
  listMessages(
    channelId: string,
    opts: Pick<ListMessagesQuery, "cursor" | "limit" | "direction"> = {},
  ): Promise<ListMessagesResponse> {
    const query = toQuery({
      cursor: opts.cursor ?? "",
      limit: opts.limit ?? 50,
      direction: opts.direction ?? "desc",
    });
    return this.call<ListMessagesResponse>(
      "GET",
      `/api/channels/${channelId}/messages${query}`,
      undefined,
      true,
    );
  }

  /** POST /api/channels/:id/messages —— 发消息 */
  createMessage(channelId: string, body: CreateMessageRequest): Promise<CreateMessageResponse> {
    return this.call<CreateMessageResponse>(
      "POST",
      `/api/channels/${channelId}/messages`,
      body,
      true,
    );
  }

  /** PATCH /api/messages/:id —— 编辑消息（作者或 owner/admin） */
  updateMessage(messageId: string, body: UpdateMessageRequest): Promise<UpdateMessageResponse> {
    return this.call<UpdateMessageResponse>("PATCH", `/api/messages/${messageId}`, body, true);
  }

  /** DELETE /api/messages/:id —— 删除消息（作者或 owner/admin） */
  deleteMessage(messageId: string): Promise<Record<string, never>> {
    return this.call<Record<string, never>>(
      "DELETE",
      `/api/messages/${messageId}`,
      undefined,
      true,
    );
  }

  /** GET /api/channels/:id/read-state —— 未读快照 */
  getReadState(channelId: string): Promise<GetReadStateResponse> {
    return this.call<GetReadStateResponse>(
      "GET",
      `/api/channels/${channelId}/read-state`,
      undefined,
      true,
    );
  }

  /** POST /api/channels/:id/read-state —— 上报已读 */
  markRead(channelId: string, body: UpdateReadStateRequest): Promise<GetReadStateResponse> {
    return this.call<GetReadStateResponse>(
      "POST",
      `/api/channels/${channelId}/read-state`,
      body,
      true,
    );
  }

  // ---------- 业务 REST：会话快照分享 ----------

  /** POST /api/shares/snapshot —— 把某频道消息打包成会话快照 */
  createShareSnapshot(
    channelId: string,
    body: Pick<CreateShareRequest, "title" | "summary">,
  ): Promise<CreateShareResponse> {
    return this.call<CreateShareResponse>(
      "POST",
      "/api/shares/snapshot",
      { channelId, ...body },
      true,
    );
  }

  /**
   * PUT /api/r2/objects —— 直传一个附件文件（body = 文件原始字节，非 JSON）。
   * 文件名为非 ASCII 时浏览器不允许放进请求头，故 X-File-Name 用 URL 编码传输。
   */
  async uploadObject(file: File): Promise<UploadAttachmentResponse> {
    if (!this.hasToken) throw new ServerApiError(401, "UNAUTHORIZED", "未登录");
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.token}`,
      "x-file-name": encodeURIComponent(file.name),
    };
    if (file.type.length > 0) headers["content-type"] = file.type;

    const res = await fetch(this.url("/api/r2/objects"), {
      method: "PUT",
      headers,
      body: file,
    });
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
    return data as UploadAttachmentResponse;
  }
}
