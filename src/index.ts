import type { Context } from "@deepseek-ai/cordis";
import Schema from "@deepseek-ai/schemastery";

export const name = "dsh-hello-plugin";

export interface Config {
  greeting: string;
  maxRetries: number;
  verbose?: boolean;
}

export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default("Hello"),
  maxRetries: Schema.number().default(3),
  verbose: Schema.boolean().default(false),
});

export function apply(ctx: Context, config: Config) {
  console.log(config.greeting); // User value or schema default.
}
