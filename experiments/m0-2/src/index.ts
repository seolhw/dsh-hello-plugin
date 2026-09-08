import type { Context } from "@deepseek-ai/cordis";

export const name = "dsh-talk-m02";

export const inject: string[] = [];

/** Host half: proves the Loader imports the node side of a double-half package. */
export function apply(ctx: Context): void {
  ctx.logger("m02").info("dsh-talk-m02 host half loaded");
}
