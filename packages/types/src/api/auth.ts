// ===============================================================
// /api/auth/* —— 由 Better Auth 提供（登录/注册/会话/邮箱验证/改密/找回密码）
//
// 本文件只是「面向 API 客户端的类型契约」，服务端实现是 mounted 在
// /api/auth/* 的 Better Auth handler（见 server/src/lib/auth.ts）。
//
// 会话方式（Bearer Token Authentication）：
//   - 登录/注册成功后，响应头 `set-auth-token` 携带会话 token；
//     客户端把该 token 存为本地 secret，之后每次请求带
//     `Authorization: Bearer <token>`（或 WebSocket 用 `?token=`）。
//   - 登录态信息用 GET /api/auth/get-session 校验/读取。
// ===============================================================

// ---------- Better Auth user（session 里返回的形态） ----------

export interface AuthUser {
  id: string;
  /** 展示名（注册时必填 name） */
  name: string;
  email: string;
  emailVerified: boolean;
  /** 头像 URL（可空） */
  image: string | null;
  /** 归一化后的用户名（小写；可选注册）。等价旧的 @handle */
  username: string | null;
  /** 未归一化的用户名展示形态（可选） */
  displayUsername?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  /** 会话 token（存起来当 Bearer 用） */
  token: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- GET /api/auth/get-session ----------
// 注意：会话无效/被吊销时 Better Auth 返回 200 + null body（不是 401）

export interface GetSessionResponse {
  session: AuthSession | null;
  user: AuthUser | null;
}

// ---------- 注册 / 登录 ----------

/** POST /api/auth/sign-up/email（用户名可选） */
export interface SignUpEmailRequest {
  name: string;
  email: string;
  password: string;
  username?: string;
  displayUsername?: string;
  image?: string;
  callbackURL?: string;
}

/** POST /api/auth/sign-in/email（邮箱登录；密码登录通用入口） */
export interface SignInEmailRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  callbackURL?: string;
}

/** POST /api/auth/sign-in/username（用户名 + 密码登录，username 插件） */
export interface SignInUsernameRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
  callbackURL?: string;
}

// ---------- 登出 / 改密 / 资料 ----------

/** POST /api/auth/sign-out */
export type SignOutResponse = { success: boolean };

/** POST /api/auth/change-password */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}

/** POST /api/auth/update-user（含改用户名） */
export interface UpdateUserRequest {
  name?: string;
  image?: string | null;
  username?: string;
  displayUsername?: string;
}

// ---------- 邮箱验证 / 忘记密码 ----------

/** POST /api/auth/send-verification-email */
export interface SendVerificationEmailRequest {
  email: string;
  callbackURL?: string;
}

/** POST /api/auth/email-otp/send-verification-otp —— 发送 6 位邮箱验证码 */
export interface SendVerificationOTPRequest {
  email: string;
  type: "email-verification";
}

/** POST /api/auth/email-otp/verify-email —— 用 6 位验证码校验邮箱 */
export interface VerifyEmailOTPRequest {
  email: string;
  otp: string;
}

/** POST /api/auth/email-otp/verify-email 成功返回；token 非空 = 已自动登录（autoSignInAfterVerification） */
export interface VerifyEmailOTPResponse {
  status: boolean;
  token: string | null;
  user: AuthUser;
}

/** POST /api/auth/email-otp/request-password-reset —— 忘记密码：向邮箱发 6 位重置验证码 */
export interface RequestPasswordResetOTPRequest {
  email: string;
}

export type RequestPasswordResetOTPResponse = { success: boolean };

/** POST /api/auth/email-otp/reset-password —— 用验证码重置密码（应用内完成，无需打开邮件链接） */
export interface ResetPasswordWithOTPRequest {
  email: string;
  otp: string;
  /** 新密码（>= 8 位） */
  password: string;
}

export type ResetPasswordWithOTPResponse = { success: boolean };

/** POST /api/auth/request-password-reset（邮箱链接版：发重置邮件，需到浏览器打开链接） */
export interface RequestPasswordResetRequest {
  email: string;
  redirectTo?: string;
}

/** POST /api/auth/reset-password（用邮件里的 token 重设密码） */
export interface ResetPasswordRequest {
  newPassword: string;
  token: string;
}

/** POST /api/auth/reset-password/{token}（邮件链接指向的页面再 POST 到这里） */
export type ResetPasswordResponse = { status: boolean };
