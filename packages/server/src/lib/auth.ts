// ================================================================
// Bearer Token 鉴权中间件
// MVP：令牌是 32 字节随机 hex（注册码换令牌时生成），
//      DB 存 SHA-256(token)，请求头 Authorization: Bearer <token>
// TODO(P1)：JWT / 令牌过期 / 吊销列表
// ================================================================

import type { ID } from "@dsh-talk/types/entities";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { Env, HonoAppVariables } from "../types";
import { HttpApiError } from "./errors";

export type BearerStrategy = "required" | "optional";

export function sha256Hex(input: string): string {
  // Cloudflare Workers 全局有 crypto.subtle；MVP 用同步 Digest（字符串长度短，可接受）
  // 注意：在 Worker 里是 async 的，这里给同步签名留了接口，真正实现在下方 async 函数
  void input;
  throw new Error("use sha256HexAsync instead");
}

export async function sha256HexAsync(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createBearerAuth(strategy: BearerStrategy = "required") {
  return createMiddleware<{ Bindings: Env; Variables: HonoAppVariables }>(async (c, next) => {
    const authHeader = c.req.header("Authorization") ?? "";
    const m = /^Bearer\s+(.+)$/i.exec(authHeader);
    const token = m?.[1]?.trim() ?? null;

    if (!token) {
      if (strategy === "optional") return next();
      throw HttpApiError.unauthorized("missing bearer token");
    }

    // TODO(M1 implement)：查 users.token_hash = sha256(token)
    //   const hash = await sha256HexAsync(token);
    //   const row = await c.env.DB
    //     .prepare("SELECT id, handle, display_name, avatar_url, created_at FROM users WHERE token_hash = ?")
    //     .bind(hash)
    //     .first<User>();
    //   if (!row) throw HttpApiError.unauthorized("invalid token");

    // 骨架阶段：把 token 内容 itself 作为 userId（MVP 占位 501）
    const fakeUserId: ID = `u|${token.slice(0, 16)}`;
    c.set("userId", fakeUserId);

    return next();
  });
}

/** 已通过 auth 中间件后，直接从 ctx 取 userId（保证非空） */
export function requireUserId(c: Context<{ Bindings: Env; Variables: HonoAppVariables }>): ID {
  const id = c.var.userId;
  if (!id) throw HttpApiError.unauthorized("no user");
  return id;
}
