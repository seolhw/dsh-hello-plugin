Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let node_fs = require("node:fs");
let node_fs_promises = require("node:fs/promises");
let node_os = require("node:os");
let node_path = require("node:path");
let _deepseek_ai_dsh_settings = require("@deepseek-ai/dsh-settings");
let _deepseek_ai_schemastery = require("@deepseek-ai/schemastery");
_deepseek_ai_schemastery = __toESM(_deepseek_ai_schemastery, 1);
//#region packages/host/src/index.ts
const name = "dsh-talk";
/** 需要 DSH 内置 service 就绪后才启动（会话分享依赖 sessions / sessionPersistence）。 */
const inject = [
	"settings",
	"webServer",
	"sessions",
	"sessionPersistence"
];
const TALK_NS = (0, _deepseek_ai_dsh_settings.settingsNamespace)("talk");
const talkSettingsSchema = _deepseek_ai_schemastery.default.object({
	serverUrl: _deepseek_ai_schemastery.default.string().default("http://127.0.0.1:8787"),
	handle: _deepseek_ai_schemastery.default.string().default(""),
	/** secret：settings 文档 redact 时会被剥掉，不会随描述接口外泄 */
	token: _deepseek_ai_schemastery.default.string().role("secret").default(""),
	autoReconnect: _deepseek_ai_schemastery.default.boolean().default(true),
	share: _deepseek_ai_schemastery.default.object({ maxSizeMb: _deepseek_ai_schemastery.default.number().default(50) })
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
/**
* BETTER_AUTH_URL 是后端 Server 唯一的环境声明：本地地址就连本地，
* 生产地址就连生产。`dsh web` 启动时会从仓库根 .env 加载它（dsh-app-boot），
* 因此 host 进程可直接读到。设置了它时优先于 settings 里的 serverUrl。
*/
function envServerUrl() {
	const value = process.env.BETTER_AUTH_URL?.trim();
	return value && value.length > 0 ? value : void 0;
}
/** settings 与 BETTER_AUTH_URL 合并后的生效配置：环境变量优先。 */
function effectiveSettings(scope) {
	const current = scope.get();
	const serverUrl = envServerUrl();
	return serverUrl ? {
		...current,
		serverUrl
	} : current;
}
function clonesDir() {
	const dir = (0, node_path.join)((0, node_os.homedir)(), ".dsh-talk", "clones");
	if (!(0, node_fs.existsSync)(dir)) (0, node_fs.mkdirSync)(dir, { recursive: true });
	return dir;
}
/** 会话包格式版本（host ↔ host；服务端只透传 manifest） */
const SESSION_PACKAGE_VERSION = 1;
function serviceOf(ctx, key) {
	return ctx.get(key);
}
/** 解析下载到的字节：是本机会话包则返回，否则 null（频道快照等走落盘分支） */
function parseAgentSessionPackage(bytes) {
	let parsed;
	try {
		parsed = JSON.parse(bytes.toString("utf8"));
	} catch {
		return null;
	}
	if (typeof parsed !== "object" || parsed === null) return null;
	const pack = parsed;
	if (pack.kind !== "agent-session") return null;
	if (!Array.isArray(pack.events)) return null;
	if (typeof pack.header !== "object" || pack.header === null) return null;
	return pack;
}
/** 还原会话的落地工作区：显式传入 > 来源 cwd（本机存在才用）> host 进程 cwd */
function pickWorkspaceCwd(wanted, fromPack) {
	if (wanted) return wanted;
	if (fromPack && (0, node_path.isAbsolute)(fromPack) && (0, node_fs.existsSync)(fromPack)) try {
		if ((0, node_fs.statSync)(fromPack).isDirectory()) return fromPack;
	} catch {}
	return process.cwd();
}
function buildSessionPackage(meta, events) {
	return {
		kind: "agent-session",
		manifest: {
			packageVersion: SESSION_PACKAGE_VERSION,
			sessionId: meta.id,
			...meta.cwd ? { cwd: meta.cwd } : {},
			sessionVersion: meta.version,
			eventCount: events.length,
			createdAt: meta.createdAt
		},
		header: {
			version: meta.version,
			id: meta.id,
			createdAt: meta.createdAt,
			...meta.cwd ? { cwd: meta.cwd } : {},
			...meta.parentSession ? { parentSession: meta.parentSession } : {},
			...typeof meta.seedLength === "number" ? { seedLength: meta.seedLength } : {}
		},
		events
	};
}
function sessionRoutes(ctx, scope) {
	const errorOf = (error) => error instanceof Error ? error.message : String(error);
	return [{
		kind: "exact",
		path: "/api/talk/sessions",
		handler: async (_req, res) => {
			const persistence = serviceOf(ctx, "sessionPersistence");
			if (!persistence) {
				sendJson(res, 503, {
					code: "INTERNAL",
					message: "会话持久化服务不可用"
				});
				return;
			}
			try {
				sendJson(res, 200, { sessions: [...await persistence.list()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 200).map((h) => ({
					id: h.id,
					createdAt: h.createdAt,
					...h.cwd ? { cwd: h.cwd } : {},
					...h.parentSession ? { parentSession: h.parentSession } : {}
				})) });
			} catch (error) {
				sendJson(res, 500, {
					code: "INTERNAL",
					message: errorOf(error)
				});
			}
		}
	}, {
		kind: "exact",
		path: "/api/talk/session-package",
		handler: async (req, res) => {
			const persistence = serviceOf(ctx, "sessionPersistence");
			if (!persistence) {
				sendJson(res, 503, {
					code: "INTERNAL",
					message: "会话持久化服务不可用"
				});
				return;
			}
			const sessionId = new URL(req.url ?? "", "http://localhost").searchParams.get("sessionId")?.trim();
			if (!sessionId) {
				sendJson(res, 400, {
					code: "BAD_REQUEST",
					message: "缺少 sessionId"
				});
				return;
			}
			try {
				const { meta, events } = await persistence.readFrom(sessionId, 0);
				const body = Buffer.from(JSON.stringify(buildSessionPackage(meta, events)), "utf8");
				const maxBytes = scope.get().share.maxSizeMb * 1024 * 1024;
				if (body.byteLength > maxBytes) {
					sendJson(res, 413, {
						code: "PAYLOAD_TOO_LARGE",
						message: `会话包超过 ${Math.round(maxBytes / 1024 / 1024)} MiB 上限`
					});
					return;
				}
				res.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
					"content-length": String(body.byteLength)
				});
				res.end(body);
			} catch (error) {
				sendJson(res, 500, {
					code: "INTERNAL",
					message: errorOf(error)
				});
			}
		}
	}];
}
function talkRoutes(ctx, scope) {
	return [
		{
			kind: "exact",
			path: "/api/talk/config",
			handler: async (req, res) => {
				if (req.method === "GET") {
					sendJson(res, 200, effectiveSettings(scope));
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
						sendJson(res, 200, effectiveSettings(scope));
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
						items: (0, node_fs.readdirSync)(dir).filter((file) => file.endsWith(".json")).map((file) => {
							const stat = (0, node_fs.statSync)((0, node_path.join)(dir, file));
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
					const wantedCwd = typeof body.cwd === "string" && (0, node_path.isAbsolute)(body.cwd) ? body.cwd : void 0;
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
					const allowed = new URL(effectiveSettings(scope).serverUrl).host;
					if (url.host !== allowed) {
						sendJson(res, 400, {
							code: "BAD_REQUEST",
							message: `只允许从 ${allowed} 下载`
						});
						return;
					}
					const started = Date.now();
					const response = await fetch(downloadUrl);
					if (!response.ok) {
						sendJson(res, 502, {
							code: "INTERNAL",
							message: `下载失败 HTTP ${response.status}`
						});
						return;
					}
					const bytes = Buffer.from(await response.arrayBuffer());
					const pack = parseAgentSessionPackage(bytes);
					if (pack) {
						const store = serviceOf(ctx, "sessions");
						if (!store) {
							sendJson(res, 503, {
								code: "INTERNAL",
								message: "会话服务不可用"
							});
							return;
						}
						const session = store.create(void 0, {
							seed: pack.events,
							meta: { cwd: pickWorkspaceCwd(wantedCwd, pack.header.cwd) }
						});
						await store.flush(session);
						sendJson(res, 200, {
							bytes: bytes.byteLength,
							elapsedMs: Date.now() - started,
							sessionId: session.id
						});
						return;
					}
					const target = (0, node_path.join)(clonesDir(), `snapshot-${Date.now()}.json`);
					await (0, node_fs_promises.writeFile)(target, bytes);
					sendJson(res, 200, {
						file: target,
						bytes: bytes.byteLength,
						elapsedMs: Date.now() - started
					});
				} catch (error) {
					sendJson(res, 500, {
						code: "INTERNAL",
						message: error instanceof Error ? error.message : String(error)
					});
				}
			}
		},
		...sessionRoutes(ctx, scope)
	];
}
function apply(ctx) {
	const scope = ctx.settings.register(TALK_NS, talkSettingsSchema, { applies: "live" });
	const disposers = [];
	for (const route of talkRoutes(ctx, scope)) disposers.push(ctx.webServer.register(route));
	ctx.effect(() => () => {
		for (const dispose of disposers) dispose();
	}, "dsh-talk: config api");
}
//#endregion
exports.apply = apply;
exports.inject = inject;
exports.name = name;
