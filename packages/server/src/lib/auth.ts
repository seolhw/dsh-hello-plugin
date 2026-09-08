// ================================================================
// Better Auth 装配 + 应用鉴权中间件（Bearer Token 会话）
//
// 以 Better Auth 作为整个应用的身份/认证/授权地基：
//   - emailAndPassword：邮箱 + 密码
//   - username 插件：用户名 + 密码（注册时邮箱必填、用户名可选）
//   - github social provider：GitHub OAuth 登录（配置了凭据才启用）
//   - bearer 插件：纯 API/桌面端通过 Authorization: Bearer <session token>
//     认证；登录成功响应头 set-auth-token 即会话 token
//   - emailVerification / sendResetPassword：邮箱验证 + 忘记密码（Resend 发送）
//   - database: env.DB（Cloudflare D1 原生适配，Kysely 内建）
// 认证表（user/session/account/verification）由 better-auth/db/migration
// 程序化迁移创建，见 ensureAuthSchema()。
// ================================================================

import type { User as AppUser, ID } from "@dsh-talk/types/entities";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { bearer, username } from "better-auth/plugins";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { Env, HonoAppVariables } from "../types";
import { dispatchResetPasswordEmail, dispatchVerificationEmail } from "./email";
import { HttpApiError } from "./errors";

// better-auth 选项类型（不显式 import，避免与实例泛型不一致）
type BetterAuthOptions = Parameters<typeof betterAuth>[0];

// ================================================================
// Better Auth 实例装配 & 缓存（每个 isolate 惰性构建一次）
// ================================================================

// 未配置 BETTER_AUTH_URL 时，按请求 Host 从该白名单挑 base（本地 + workers/pages 预览）。
// 生产建议直接设 BETTER_AUTH_URL，此处白名单便不再参与。
const AUTH_ALLOWED_HOSTS = [
  "localhost:8787",
  "127.0.0.1:8787",
  "*.workers.dev",
  "*.pages.dev",
] as const;

function buildAuthOptions(env: Env): BetterAuthOptions {
  const secret = env.BETTER_AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "[auth] BETTER_AUTH_SECRET 未配置或过短（需 ≥32 字符）。" +
        "本地：写入 packages/server/.dev.vars（或根 .env 由 predev 同步）；生产：wrangler secret put BETTER_AUTH_SECRET",
    );
  }

  // baseURL：配了 BETTER_AUTH_URL 就用它（GitHub 回调 / 邮箱验证 / 重置链接都基于此地址）；
  // 没配则按请求 Host 从白名单推导（适合本地 dev）
  const authUrl = env.BETTER_AUTH_URL?.trim();
  const baseURL: BetterAuthOptions["baseURL"] = authUrl
    ? authUrl
    : { allowedHosts: [...AUTH_ALLOWED_HOSTS] };

  const githubClientId = env.GITHUB_CLIENT_ID?.trim();
  const githubClientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  const socialProviders =
    githubClientId && githubClientSecret
      ? { github: { clientId: githubClientId, clientSecret: githubClientSecret } }
      : undefined;

  return {
    appName: "dsh-talk",
    baseURL,
    secret,
    database: env.DB,
    // 邮箱/密码是主体登录方式；忘记密码的邮件发送挂在 emailAndPassword
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // 注册即发验证邮件但不强制验证后登录；如需强制改这里为 true
      requireEmailVerification: false,
      // 不 await，交给 runDetached -> waitUntil（Cloudflare 响应返回后仍继续投递）
      sendResetPassword: async ({ user, url }, request) => {
        dispatchResetPasswordEmail(env, request, user, url);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }, request) => {
        dispatchVerificationEmail(env, request, user, url);
      },
    },
    ...(socialProviders ? { socialProviders } : {}),
    plugins: [
      username(),
      // 纯 API / 桌面端认证：登录响应头 set-auth-token 即会话 token，
      // 之后所有请求带 Authorization: Bearer <token> 即等价于带 session cookie
      bearer(),
    ],
    advanced: {
      // 与默认 /api/auth 一致即可；前缀定短一点避免与业务混淆
      cookiePrefix: "dsh_talk",
    },
  };
}

export function createAuth(env: Env) {
  return betterAuth(buildAuthOptions(env));
}

/** 装配好的 Better Auth 实例类型（含 username/bearer 插件的推断） */
export type Auth = ReturnType<typeof createAuth>;

/** 当前 isolate 内按 Env 缓存 Better Auth 实例（弱引用，测试多实例安全） */
const authCache = new WeakMap<object, Auth>();

export function getAuth(env: Env): Auth {
  const cached = authCache.get(env);
  if (cached) return cached;
  const auth = createAuth(env);
  authCache.set(env, auth);
  return auth;
}

// ================================================================
// D1 认证表程序化迁移（Cloudflare 无法直接跑 CLI）
// 每次 isolate 首次访问时把 user/session/account/verification（含插件字段）建出来，
// 幂等；如需在生产关闭自动迁移，把这里改为 return Promise.resolve() 并人工执行迁移。
// ================================================================

const schemaReady = new WeakMap<object, Promise<void>>();

export function ensureAuthSchema(env: Env): Promise<void> {
  let ready = schemaReady.get(env);
  if (!ready) {
    ready = (async () => {
      const auth = getAuth(env);
      const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
      if (toBeCreated.length > 0 || toBeAdded.length > 0) {
        console.info(
          `[auth] 创建认证表：created=${toBeCreated.map((t) => t.table).join(",") || "-"} ` +
            `added=${toBeAdded.map((t) => t.table).join(",") || "-"}`,
        );
        await runMigrations();
      }
    })();
    schemaReady.set(env, ready);
  }
  return ready;
}

// ================================================================
// Session -> 应用 User 实体映射
// ================================================================

interface BetterAuthUserLike {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  username?: string | null;
  createdAt?: unknown;
}

function toAppUser(user: BetterAuthUserLike): AppUser {
  const emailPrefix = user.email.split("@")[0] || user.id;
  const createdAt =
    typeof user.createdAt === "number"
      ? user.createdAt
      : user.createdAt instanceof Date
        ? user.createdAt.getTime()
        : typeof user.createdAt === "string"
          ? Date.parse(user.createdAt)
          : Date.now();
  return {
    id: user.id as ID,
    handle: user.username?.trim() || emailPrefix,
    displayName: user.name || null,
    avatarUrl: user.image ?? null,
    createdAt,
  };
}

export { toAppUser };

export type AuthSessionUser = ReturnType<typeof toAppUser>;

/** better-auth getSession 的返回形态（粗略，够中间件用） */
interface ResolvedSession {
  session: { id: string; token: string; expiresAt: Date };
  user: BetterAuthUserLike;
}

// ================================================================
// Bearer / 会话鉴权中间件（替换旧的 tokenHash 鉴权）
// ================================================================

type HonoContext = Context<{ Bindings: Env; Variables: HonoAppVariables }>;

/** 从请求里取会话 token：优先 Authorization 头，其次 ?token=（WS/桌面端） */
export function extractSessionToken(c: HonoContext): string | null {
  const authHeader = c.req.header("Authorization") ?? c.req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (match?.[1]) return match[1].trim();
  const queryToken = c.req.query("token");
  if (queryToken) return queryToken.trim();
  return null;
}

export type BearerStrategy = "required" | "optional";

export function createBearerAuth(strategy: BearerStrategy = "required") {
  return createMiddleware<{ Bindings: Env; Variables: HonoAppVariables }>(async (c, next) => {
    const token = extractSessionToken(c);
    // 认证表必须已就绪，否则 getSession 会因表缺失而 500
    await ensureAuthSchema(c.env);

    // raw headers 里含 Cookie；把 header/query 里的 bearer 合成进去再验
    const headers = new Headers(c.req.raw.headers);
    if (token) headers.set("authorization", `Bearer ${token}`);
    const session = (await getAuth(c.env).api.getSession({ headers })) as ResolvedSession | null;

    if (session) {
      c.set("userId", session.user.id as ID);
      c.set("currentUser", toAppUser(session.user));
      return next();
    }

    if (strategy === "optional" && !token) {
      return next();
    }
    throw HttpApiError.unauthorized("invalid or missing session token");
  });
}

/** 通过鉴权后直接从 ctx 取 userId（保证非空） */
export function requireUserId(c: Context<{ Bindings: Env; Variables: HonoAppVariables }>): ID {
  const id = c.var.userId;
  if (!id) throw HttpApiError.unauthorized("no user");
  return id;
}

/** 取当前登录用户实体（非空；等价 requireUserId 但拿完整资料） */
export function requireCurrentUser(
  c: Context<{ Bindings: Env; Variables: HonoAppVariables }>,
): AppUser {
  const user = c.var.currentUser;
  if (!user) throw HttpApiError.unauthorized("no user");
  return user;
}
