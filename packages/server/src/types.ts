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

  // ---------- [vars] ----------
  COMMUNITY_CREATE_DAILY_LIMIT: string;
  MAX_COMMUNITIES_PER_USER: string;
  ADMIN_HANDLES: string;
  MAX_MESSAGE_LENGTH: string;
  MAX_SHARE_BYTES: string;

  // ---------- Secrets（wrangler secret put / 环境变量注入） ----------
  AUTH_INVITE_CODES?: string;
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
