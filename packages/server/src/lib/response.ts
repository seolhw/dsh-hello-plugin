// ================================================================
// 小工具：空响应 / 501 未实现占位
// ================================================================

import type { Context } from "hono";
import type { Env, HonoAppVariables } from "../types";

export type AppCtx = Context<{ Bindings: Env; Variables: HonoAppVariables }>;

export function emptyOk(c: AppCtx) {
  return c.json({}, 200);
}

export function notImplemented(c: AppCtx, note?: string) {
  return c.json(
    {
      code: "INTERNAL",
      message: `handler not implemented yet${note ? `: ${note}` : ""}`,
    },
    501,
  );
}
