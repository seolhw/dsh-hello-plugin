// ================================================================
// Hono 中间件：在 ctx.var.db 上挂载 Drizzle 实例（每个请求注入一次）
// ================================================================

import { createMiddleware } from "hono/factory";
import { createDbForWorker } from "../db";
import type { Env, HonoAppVariables } from "../types";

export const injectDb = createMiddleware<{ Bindings: Env; Variables: HonoAppVariables }>(
  async (c, next) => {
    const db = createDbForWorker(c.env.DB);
    c.set("db", db);
    return next();
  },
);

/** 从 ctx 取 db（保证非空，因为 injectDb 已在 * 上注入） */
export function db(c: { var: { db: HonoAppVariables["db"] } }) {
  return c.var.db;
}
