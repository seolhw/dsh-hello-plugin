import Schema from "@deepseek-ai/schemastery";
//#region src/index.ts
const name = "hello-plugin";
const Config = Schema.object({
	greeting: Schema.string().default("Hello"),
	maxRetries: Schema.number().default(3),
	verbose: Schema.boolean().default(false)
});
function apply(ctx, config) {
	console.log(config.greeting);
}
//#endregion
export { Config, apply, name };

//# sourceMappingURL=index.mjs.map