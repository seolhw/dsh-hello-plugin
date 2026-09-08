// ================================================================
// 全局中间件装配：CORS / requestId / onError 统一 ApiError 响应
// ================================================================

import type { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import type { Env, HonoAppVariables } from "../types";
import { injectDb } from "./db";
import type { ApiErrorShape } from "./errors";
import { HttpApiError } from "./errors";

export function applyGlobalMiddleware(app: Hono<{ Bindings: Env; Variables: HonoAppVariables }>) {
  // 0. Drizzle DB：每个请求挂载一次，handler 通过 c.var.db 使用
  app.use("*", injectDb);

  // 1. X-Request-Id
  app.use("*", async (c, next) => {
    const fromHeader = c.req.header("X-Request-Id");
    const id = fromHeader && fromHeader.length <= 64 ? fromHeader : crypto.randomUUID();
    c.set("requestId", id);
    await next();
    c.header("X-Request-Id", id);
  });

  app.use("*", timing());
  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: (origin) => {
        // Bearer token 为主要认证手段（跨源请求不带 Cookie），MVP 全放开；
        // 若日后启用跨源 Cookie 会话需收窄到 trustedOrigins + 显式 origin。
        return origin ?? "*";
      },
      allowHeaders: ["Authorization", "Content-Type", "X-Requested-With"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      // set-auth-token：Better Auth bearer 插件在登录/注册响应头里回会话 token
      exposeHeaders: ["X-Request-Id", "set-auth-token"],
      credentials: false,
      maxAge: 86400,
    }),
  );

  // 2. Body 大小限制（分享包上限 50 MiB，但走 R2 预签名直传，API 层 5 MiB 足够）
  app.use(
    "*",
    bodyLimit({
      maxSize: 5 * 1024 * 1024,
      onError: (_c) => {
        const err: ApiErrorShape = {
          code: "PAYLOAD_TOO_LARGE",
          message: "request body exceeded 5 MiB; for files use /r2/sign-upload first",
        };
        return Response.json(err, { status: 413 });
      },
    }),
  );

  // 3. 统一错误格式
  app.onError((err, c) => {
    const reqId = c.var.requestId;
    // 我们自己的业务错误
    if (err instanceof HttpApiError) {
      const shape: ApiErrorShape = {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: reqId,
      };
      return c.json(shape, err.status as never);
    }
    // Hono 内置的 HTTPException（未经过我们的 HttpApiError）
    if (err instanceof HTTPException) {
      const shape: ApiErrorShape = {
        code: "INTERNAL",
        message: err.message,
        requestId: reqId,
      };
      return c.json(shape, err.status as never);
    }
    // 未知错误：不把堆栈透出给客户端
    console.error("[500]", err);
    const shape: ApiErrorShape = {
      code: "INTERNAL",
      message: "internal error",
      requestId: reqId,
    };
    return c.json(shape, 500 as never);
  });

  // 4. 404 也用统一 JSON
  app.notFound((c) => {
    const shape: ApiErrorShape = {
      code: "NOT_FOUND",
      message: `no such route ${c.req.method} ${c.req.path}`,
      requestId: c.var.requestId,
    };
    return c.json(shape, 404 as never);
  });
}
