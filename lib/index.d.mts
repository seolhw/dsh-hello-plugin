import Schema from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
//#region src/index.d.ts
export declare const name = "hello-plugin";
export interface Config {
  greeting: string;
  maxRetries: number;
  verbose?: boolean;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
//#endregion
//# sourceMappingURL=index.d.mts.map