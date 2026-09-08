/**
 * M0-5 smoke worker: REST (ping / D1 messages / R2 upload) + WS via DO Room.
 * Production routing design: docs/m0/r5-cloudflare.md; this file only proves
 * the local Miniflare mechanics (D1, R2, DO+WS) that M1 builds on.
 */
import { Room } from "./room";

export { Room };

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ROOM: DurableObjectNamespace;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // WS upgrade -> per-channel Durable Object.
    if (path === "/ws" && method === "GET") {
      const channel = url.searchParams.get("channel") ?? "default";
      const id = env.ROOM.idFromName(channel);
      const stub = env.ROOM.get(id);
      return stub.fetch(request);
    }

    if (path === "/api/ping") {
      return json({ ok: true, ts: Date.now(), path });
    }

    if (path === "/api/msg" && method === "POST") {
      const body = (await request.json()) as { channel?: string; body?: string };
      const channel = body.channel ?? "default";
      const text = (body.body ?? "").slice(0, 4000);
      const res = await env.DB.prepare(
        "INSERT INTO messages (channel, body) VALUES (?, ?)",
      ).bind(channel, text).run();
      return json({ ok: true, id: res.meta.last_row_id });
    }

    if (path === "/api/msg" && method === "GET") {
      const channel = url.searchParams.get("channel") ?? "default";
      const { results } = await env.DB.prepare(
        "SELECT id, channel, body, created FROM messages WHERE channel = ? ORDER BY id DESC LIMIT 50",
      ).bind(channel).all();
      return json({ ok: true, messages: results });
    }

    if (path.startsWith("/api/upload/") && method === "PUT") {
      const key = path.slice("/api/upload/".length);
      if (key === "") return json({ ok: false, error: "bad key" }, 400);
      const size = Number(request.headers.get("content-length") ?? "0");
      if (size > 10 * 1024 * 1024) return json({ ok: false, error: "too large" }, 413);
      await env.BUCKET.put(key, request.body);
      return json({ ok: true, key, bytes: size });
    }

    if (path.startsWith("/api/upload/") && method === "GET") {
      const key = path.slice("/api/upload/".length);
      const object = await env.BUCKET.get(key);
      if (object === null) return json({ ok: false, error: "not found" }, 404);
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      return new Response(object.body, { headers });
    }

    return json({ ok: false, error: "not found", path }, 404);
  },
} satisfies ExportedHandler<Env>;
