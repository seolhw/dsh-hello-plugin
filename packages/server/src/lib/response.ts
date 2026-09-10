// ================================================================
// 路由通用小工具：空响应 / JSON body 解析 / 查询回读 / 分页参数
// ================================================================

import type { Context } from "hono";
import type { Env, HonoAppVariables } from "../types";
import { HttpApiError } from "./errors";

export type AppCtx = Context<{ Bindings: Env; Variables: HonoAppVariables }>;

export function emptyOk(c: AppCtx) {
  return c.json({}, 200);
}

/** 读取 JSON 请求体；非法 JSON 统一 400 */
export async function jsonBody<T>(c: AppCtx): Promise<T> {
  try {
    return (await c.req.json()) as T;
  } catch {
    throw HttpApiError.badRequest("invalid JSON body");
  }
}

/** 解析 JSON 文本列（DB 中存的 JSON 字符串）；空值或非法 JSON 返回 null */
export function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 查询必须命中一行（写后回读场景），否则按内部错误抛出 */
export async function mustRow<T>(query: Promise<T[]>, what: string): Promise<T> {
  const row = (await query)[0];
  if (row === undefined) throw HttpApiError.internal(`${what} row not found`);
  return row;
}

/** 查询未命中按 404 抛出（读路径） */
export async function firstOr404<T>(query: Promise<T[]>, message: string): Promise<T> {
  const row = (await query)[0];
  if (row === undefined) throw HttpApiError.notFound(message);
  return row;
}

/** 解析 limit/offset 查询参数（缺省/非法回退默认值，limit 夹在上限内） */
export function parseLimitOffset(
  query: Record<string, string | undefined>,
  defaultLimit = 20,
  maxLimit = 100,
): { limit: number; offset: number } {
  const rawLimit = Number.parseInt(query.limit ?? "", 10);
  const rawOffset = Number.parseInt(query.offset ?? "", 10);
  return {
    limit: Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit,
    offset: Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0,
  };
}
