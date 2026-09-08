import { Context } from "@deepseek-ai/cordis";
//#region packages/host/src/index.d.ts
export declare const name = "dsh-talk";
/** 需要 DSH 内置的两个 host service 就绪后才启动。 */
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//#endregion