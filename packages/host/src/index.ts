// ================================================================
// dsh-talk host（Node.js）
//  1. 注册 `talk` 配置命名空间（ctx.settings）：hubUrl / handle / token …
//  2. 挂本地接口 GET|POST /api/talk/config，供浏览器端（client）同源调用
//     语义与 @dsh-talk/types/rpc 的 SettingsRpc 一致（get / set / watch）
// ================================================================

import type { IncomingMessage, ServerResponse } from "node:http";
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
  hubUrl: z.string().default("http://127.0.0.1:8787"),
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
  const { hubUrl, handle, token, autoReconnect, share } = raw;
  if (typeof hubUrl === "string" && hubUrl.length > 0) patch.hubUrl = hubUrl;
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

// ---------- /api/talk/config 路由（GET 读 / POST 写） ----------

function configRoutes(scope: SettingsScope<TalkSettings>): WebRoute[] {
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
              sendJson(res, 400, { code: "BAD_REQUEST", message: "empty patch" });
              return;
            }
            await scope.update(patch);
            sendJson(res, 200, scope.get());
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            sendJson(res, 500, { code: "INTERNAL", message });
          }
          return;
        }
        sendJson(res, 405, { code: "BAD_REQUEST", message: "method not allowed" });
      },
    },
  ];
}

export function apply(ctx: Context): void {
  const scope = ctx.settings.register<TalkSettings>(TALK_NS, talkSettingsSchema, {
    applies: "live",
  });

  const disposers: Array<() => void> = [];
  for (const route of configRoutes(scope)) {
    disposers.push(ctx.webServer.register(route));
  }

  ctx.effect(
    () => () => {
      for (const dispose of disposers) dispose();
    },
    "dsh-talk: config api",
  );
}
