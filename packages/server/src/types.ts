// ================================================================
// Worker Bindings & Context 类型
// ================================================================

import type { D1Database, DurableObjectNamespace, R2Bucket } from "@cloudflare/workers-types";
import type { ID, User } from "@dsh-talk/types/entities";
import type { Db } from "./db";

export interface Env {
  // ---------- Wrangler.toml bindings ----------
  DB: D1Database;
  R2: R2Bucket;
  ROOM_ACTOR: DurableObjectNamespace;

  // ---------- Better Auth 密钥（本地放 packages/server/.dev.vars / 根 .env；生产用 wrangler secret put） ----------
  /** 会话签名密钥，≥32 字符，必填 */
  BETTER_AUTH_SECRET?: string;

  // ---------- GitHub OAuth（配置了才启用 github 登录） ----------
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;

  // ---------- Resend 事务邮件 ----------
  RESEND_API_KEY?: string;
}

// Hono ctx.set(...) 注入的变量
export interface HonoAppVariables {
  userId?: ID;
  currentUser?: User;
  requestId?: string;
  /** Drizzle D1 实例（中间件在 * 上注入一次） */
  db: Db;
}

// Worker -> DO 传递的连接元数据（通过 fetch 路径带 header）
export interface RoomActorConnectionMeta {
  userId: ID;
  connectionId: string;
  handle: string;
}
