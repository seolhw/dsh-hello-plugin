import { Context } from "@deepseek-ai/cordis";
import Schema from "@deepseek-ai/schemastery";
//#region src/index.d.ts
export declare const name = "dsh-hello-plugin";
export interface Config {
  greeting: string;
  maxRetries: number;
  verbose?: boolean;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
//#endregion
//# sourceMappingURL=index.d.cts.map