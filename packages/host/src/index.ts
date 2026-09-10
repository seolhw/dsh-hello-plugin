// ================================================================
// dsh-talk host（Node.js）
//  1. 注册 `talk` 配置命名空间（ctx.settings）：serverUrl / handle / token …
//  2. 挂本地接口 GET|POST /api/talk/config，供浏览器端（client）同源调用
//     语义与 @dsh-talk/types/rpc 的 SettingsRpc 一致（get / set / watch）
// ================================================================

import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Context } from "@deepseek-ai/cordis";
import type { WebRoute } from "@deepseek-ai/dsh-host-webserver";
import type { SettingsScope } from "@deepseek-ai/dsh-settings";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
import type { TalkSettings } from "@dsh-talk/types/rpc";

export const name = "dsh-talk";

/** 需要 DSH 内置的两个 host service 就绪后才启动。 */
export const inject = ["settings", "webServer"];

const TALK_NS = settingsNamespace("talk");

// ---------- talk 配置 schema（默认值 + 用户层覆盖） ----------

const talkSettingsSchema = z.object({
  serverUrl: z.string().default("http://127.0.0.1:8787"),
  handle: z.string().default(""),
  /** secret：settings 文档 redact 时会被剥掉，不会随描述接口外泄 */
  token: z.string().role("secret").default(""),
  autoReconnect: z.boolean().default(true),
  share: z.object({
    maxSizeMb: z.number().default(50),
  }),
});

// ---------- HTTP 小工具（node:http 原始 req/res） ----------

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
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

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

// 允许客户端 patch 的字段（白名单 + 粗校验，防止把 settings 文档写坏）
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function sanitizePatch(raw: unknown): Partial<TalkSettings> {
  if (!isPlainObject(raw)) return {};
  const patch: Partial<TalkSettings> = {};
  const { serverUrl, handle, token, autoReconnect, share } = raw;
  if (typeof serverUrl === "string" && serverUrl.length > 0) patch.serverUrl = serverUrl;
  if (typeof handle === "string") patch.handle = handle;
  if (typeof token === "string") patch.token = token;
  if (typeof autoReconnect === "boolean") patch.autoReconnect = autoReconnect;
  if (isPlainObject(share)) {
    const maxSizeMb = share.maxSizeMb;
    if (typeof maxSizeMb === "number" && maxSizeMb > 0) {
      patch.share = { maxSizeMb };
    }
  }
  return patch;
}

// ---------- serverUrl 的环境来源 ----------

/**
 * BETTER_AUTH_URL 是后端 Server 唯一的环境声明：本地地址就连本地，
 * 生产地址就连生产。`dsh web` 启动时会从仓库根 .env 加载它（dsh-app-boot），
 * 因此 host 进程可直接读到。设置了它时优先于 settings 里的 serverUrl。
 */
function envServerUrl(): string | undefined {
  const value = process.env.BETTER_AUTH_URL?.trim();
  return value && value.length > 0 ? value : undefined;
}

/** settings 与 BETTER_AUTH_URL 合并后的生效配置：环境变量优先。 */
function effectiveSettings(scope: SettingsScope<TalkSettings>): TalkSettings {
  const current = scope.get();
  const serverUrl = envServerUrl();
  return serverUrl ? { ...current, serverUrl } : current;
}

// ---------- 本地克隆：分享包流式下载直写本地 ----------

function clonesDir(): string {
  const dir = join(homedir(), ".dsh-talk", "clones");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------- /api/talk/config + /api/talk/clone(s) 路由 ----------

function talkRoutes(scope: SettingsScope<TalkSettings>): WebRoute[] {
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
              sendJson(res, 400, { code: "BAD_REQUEST", message: "empty patch" });
              return;
            }
            await scope.update(patch);
            sendJson(res, 200, effectiveSettings(scope));
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            sendJson(res, 500, { code: "INTERNAL", message });
          }
          return;
        }
        sendJson(res, 405, { code: "BAD_REQUEST", message: "method not allowed" });
      },
    },
    {
      kind: "exact",
      path: "/api/talk/clones",
      handler: async (_req, res) => {
        try {
          const dir = clonesDir();
          const items = readdirSync(dir)
            .filter((file) => file.endsWith(".json"))
            .map((file) => {
              const stat = statSync(join(dir, file));
              return { file, bytes: stat.size, modifiedAt: stat.mtimeMs };
            })
            .sort((a, b) => b.modifiedAt - a.modifiedAt)
            .slice(0, 50);
          sendJson(res, 200, { dir, items });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sendJson(res, 500, { code: "INTERNAL", message });
        }
      },
    },
    {
      kind: "exact",
      path: "/api/talk/clone",
      handler: async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { code: "BAD_REQUEST", message: "method not allowed" });
          return;
        }
        try {
          const body = (await readJsonBody(req)) as { downloadUrl?: unknown };
          const downloadUrl = typeof body.downloadUrl === "string" ? body.downloadUrl : "";
          let url: URL;
          try {
            url = new URL(downloadUrl);
          } catch {
            sendJson(res, 400, { code: "BAD_REQUEST", message: "downloadUrl 无效" });
            return;
          }
          // 只允许从生效的 serverUrl 同源下载，避免 host 被当成任意 URL 代理
          const allowed = new URL(effectiveSettings(scope).serverUrl).host;
          if (url.host !== allowed) {
            sendJson(res, 400, { code: "BAD_REQUEST", message: `只允许从 ${allowed} 下载` });
            return;
          }

          const started = Date.now();
          const response = await fetch(downloadUrl);
          if (!response.ok || !response.body) {
            sendJson(res, 502, { code: "INTERNAL", message: `下载失败 HTTP ${response.status}` });
            return;
          }
          const name = `snapshot-${Date.now()}.json`;
          const target = join(clonesDir(), name);
          await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
          const stat = statSync(target);
          sendJson(res, 200, {
            file: target,
            bytes: stat.size,
            elapsedMs: Date.now() - started,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sendJson(res, 500, { code: "INTERNAL", message });
        }
      },
    },
  ];
}

export function apply(ctx: Context): void {
  const scope = ctx.settings.register<TalkSettings>(TALK_NS, talkSettingsSchema, {
    applies: "live",
  });

  const disposers: Array<() => void> = [];
  for (const route of talkRoutes(scope)) {
    disposers.push(ctx.webServer.register(route));
  }

  ctx.effect(
    () => () => {
      for (const dispose of disposers) dispose();
    },
    "dsh-talk: config api",
  );
}
