import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
//#region packages/host/src/index.ts
const name = "dsh-talk";
/** 需要 DSH 内置的两个 host service 就绪后才启动。 */
const inject = ["settings", "webServer"];
const TALK_NS = settingsNamespace("talk");
const talkSettingsSchema = z.object({
	serverUrl: z.string().default("http://127.0.0.1:8787"),
	handle: z.string().default(""),
	/** secret：settings 文档 redact 时会被剥掉，不会随描述接口外泄 */
	token: z.string().role("secret").default(""),
	autoReconnect: z.boolean().default(true),
	share: z.object({ maxSizeMb: z.number().default(50) })
});
function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => {
			chunks.push(chunk);
		});
		req.on("end", () => {
			try {
				const raw = Buffer.concat(chunks).toString("utf8");
				resolve(raw.length > 0 ? JSON.parse(raw) : {});
			} catch (error) {
				reject(error);
			}
		});
		req.on("error", reject);
	});
}
function sendJson(res, status, body) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}
const isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function sanitizePatch(raw) {
	if (!isPlainObject(raw)) return {};
	const patch = {};
	const { serverUrl, handle, token, autoReconnect, share } = raw;
	if (typeof serverUrl === "string" && serverUrl.length > 0) patch.serverUrl = serverUrl;
	if (typeof handle === "string") patch.handle = handle;
	if (typeof token === "string") patch.token = token;
	if (typeof autoReconnect === "boolean") patch.autoReconnect = autoReconnect;
	if (isPlainObject(share)) {
		const maxSizeMb = share.maxSizeMb;
		if (typeof maxSizeMb === "number" && maxSizeMb > 0) patch.share = { maxSizeMb };
	}
	return patch;
}
function clonesDir() {
	const dir = join(homedir(), ".dsh-talk", "clones");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return dir;
}
function talkRoutes(scope) {
	return [
		{
			kind: "exact",
			path: "/api/talk/config",
			handler: async (req, res) => {
				if (req.method === "GET") {
					sendJson(res, 200, scope.get());
					return;
				}
				if (req.method === "POST") {
					try {
						const patch = sanitizePatch(await readJsonBody(req));
						if (Object.keys(patch).length === 0) {
							sendJson(res, 400, {
								code: "BAD_REQUEST",
								message: "empty patch"
							});
							return;
						}
						await scope.update(patch);
						sendJson(res, 200, scope.get());
					} catch (error) {
						sendJson(res, 500, {
							code: "INTERNAL",
							message: error instanceof Error ? error.message : String(error)
						});
					}
					return;
				}
				sendJson(res, 405, {
					code: "BAD_REQUEST",
					message: "method not allowed"
				});
			}
		},
		{
			kind: "exact",
			path: "/api/talk/clones",
			handler: async (_req, res) => {
				try {
					const dir = clonesDir();
					sendJson(res, 200, {
						dir,
						items: readdirSync(dir).filter((file) => file.endsWith(".json")).map((file) => {
							const stat = statSync(join(dir, file));
							return {
								file,
								bytes: stat.size,
								modifiedAt: stat.mtimeMs
							};
						}).sort((a, b) => b.modifiedAt - a.modifiedAt).slice(0, 50)
					});
				} catch (error) {
					sendJson(res, 500, {
						code: "INTERNAL",
						message: error instanceof Error ? error.message : String(error)
					});
				}
			}
		},
		{
			kind: "exact",
			path: "/api/talk/clone",
			handler: async (req, res) => {
				if (req.method !== "POST") {
					sendJson(res, 405, {
						code: "BAD_REQUEST",
						message: "method not allowed"
					});
					return;
				}
				try {
					const body = await readJsonBody(req);
					const downloadUrl = typeof body.downloadUrl === "string" ? body.downloadUrl : "";
					let url;
					try {
						url = new URL(downloadUrl);
					} catch {
						sendJson(res, 400, {
							code: "BAD_REQUEST",
							message: "downloadUrl 无效"
						});
						return;
					}
					const allowed = new URL(scope.get().serverUrl).host;
					if (url.host !== allowed) {
						sendJson(res, 400, {
							code: "BAD_REQUEST",
							message: `只允许从 ${allowed} 下载`
						});
						return;
					}
					const started = Date.now();
					const response = await fetch(downloadUrl);
					if (!response.ok || !response.body) {
						sendJson(res, 502, {
							code: "INTERNAL",
							message: `下载失败 HTTP ${response.status}`
						});
						return;
					}
					const name = `snapshot-${Date.now()}.json`;
					const target = join(clonesDir(), name);
					await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
					sendJson(res, 200, {
						file: target,
						bytes: statSync(target).size,
						elapsedMs: Date.now() - started
					});
				} catch (error) {
					sendJson(res, 500, {
						code: "INTERNAL",
						message: error instanceof Error ? error.message : String(error)
					});
				}
			}
		}
	];
}
function apply(ctx) {
	const scope = ctx.settings.register(TALK_NS, talkSettingsSchema, { applies: "live" });
	const disposers = [];
	for (const route of talkRoutes(scope)) disposers.push(ctx.webServer.register(route));
	ctx.effect(() => () => {
		for (const dispose of disposers) dispose();
	}, "dsh-talk: config api");
}
//#endregion
export { apply, inject, name };
