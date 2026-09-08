// ================================================================
// Durable Object: RoomActor
// 每个频道（channelId）一个 DO 实例，负责：
//   - WebSocket 连接管理（join / leave / 心跳）
//   - 广播消息：evt.message.new / updated / deleted
//   - 实时消息写回到 D1（批量 flush / 同步写）
// 协议见 @dsh-talk/types/ws
// ================================================================

import type { DurableObjectState } from "@cloudflare/workers-types";
import type { ID } from "@dsh-talk/types/entities";
import type { ClientFrame, EvtHello, ServerFrame } from "@dsh-talk/types/ws";
import type { Env } from "./types";

interface Connection {
  id: string;
  userId: ID;
  handle: string;
  ws: WebSocket;
  joinedChannels: Set<string>;
  lastPingAt: number;
}

export class RoomActor implements DurableObject {
  private state: DurableObjectState;
  private connections: Map<string, Connection> = new Map();
  /** 每个 channel -> 连接 id 集合（一个用户可在多个连接里加入同一频道） */
  private channelsToConns: Map<string, Set<string>> = new Map();
  private hbTimer: number | null = null;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    // Durable Object 可以从 storage 恢复连接，但 WS 连接本身不能持久化；
    // 这里只存 metadata。MVP 直接内存。
    // TODO(M1): join 落库 / 校验等需要 DB 的场景再使用 _env
    void this.state.blockConcurrencyWhile(async () => {});
  }

  /** Worker 通过 fetch 把升级后的 WS 交给 DO。路径规则：
   *    POST /connect                    建立 ws 连接（Worker 把 101 后的 pair[0] 发过来）
   *    POST /broadcast                  Worker 写 D1 成功后调 DO 给某频道广播 evt.message.new
   * 实际也可用 Hono 路由解析。
   */
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname.endsWith("/connect")) {
      return this.handleConnect(req);
    }

    if (url.pathname.endsWith("/broadcast")) {
      const body = (await req.json()) as { channelId: string; frame: ServerFrame };
      await this.broadcastToChannel(body.channelId, body.frame);
      return new Response(null, { status: 204 });
    }

    return new Response("room actor", { status: 200 });
  }

  /** Worker 已完成 101 Upgrade，pair[0]（客户端侧 socket）通过此方法注册到 DO。
   *  MVP 简化：Worker 用 `new WebSocketPair()`，升级后把 server 端传给 DO。
   *  Cloudflare Workers 在 DO 里也能直接 acceptWebSocket，这里用标准写法：
   */
  private handleConnect(req: Request): Response {
    const upgradeHeader = req.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("expected websocket upgrade", { status: 400 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    const connectionId = req.headers.get("X-Conn-Id") ?? crypto.randomUUID();
    const userId = req.headers.get("X-User-Id") ?? "anon";
    const handle = req.headers.get("X-Handle") ?? "anon";

    server.accept();
    const conn: Connection = {
      id: connectionId,
      userId,
      handle,
      ws: server,
      joinedChannels: new Set(),
      lastPingAt: Date.now(),
    };
    this.registerConnection(conn);

    // 1. 发 hello
    const hello: EvtHello = {
      type: "evt.hello",
      ts: Date.now(),
      payload: {
        connectionId,
        user: {
          id: userId,
          handle,
          displayName: null,
          avatarUrl: null,
          tokenIat: Date.now(),
          createdAt: 0,
        },
        serverTime: Date.now(),
        heartbeatIntervalSec: 30,
      },
    };
    this.send(conn, hello as unknown as ServerFrame);

    // 2. 监听消息 / 关闭
    server.addEventListener("message", async (ev) => {
      try {
        const frame: ClientFrame = typeof ev.data === "string" ? JSON.parse(ev.data) : undefined;
        if (!frame) return;
        await this.handleClientFrame(conn, frame);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[ws] malformed frame", e);
      }
    });
    server.addEventListener("close", () => this.unregisterConnection(conn));
    server.addEventListener("error", () => this.unregisterConnection(conn));

    // 心跳定时器
    this.ensureHeartbeat();

    return new Response(null, { status: 101, webSocket: client });
  }

  private ensureHeartbeat() {
    if (this.hbTimer) return;
    // 在 Workers 中 setTimeout 返回的是 number
    this.hbTimer = setInterval(() => {
      const now = Date.now();
      for (const c of [...this.connections.values()]) {
        if (now - c.lastPingAt > 60_000) {
          try {
            c.ws.close(4000, "idle timeout");
          } catch {
            /* ignore */
          }
          this.unregisterConnection(c);
        }
      }
      if (this.connections.size === 0) {
        if (this.hbTimer !== null) clearInterval(this.hbTimer);
        this.hbTimer = null;
      }
    }, 15_000) as unknown as number;
  }

  private registerConnection(c: Connection) {
    this.connections.set(c.id, c);
  }

  private unregisterConnection(c: Connection) {
    this.connections.delete(c.id);
    for (const ch of c.joinedChannels) {
      const set = this.channelsToConns.get(ch);
      if (set) {
        set.delete(c.id);
        if (set.size === 0) this.channelsToConns.delete(ch);
      }
    }
  }

  private send(c: Connection, frame: ServerFrame) {
    try {
      c.ws.send(JSON.stringify(frame));
    } catch {
      this.unregisterConnection(c);
    }
  }

  private async handleClientFrame(conn: Connection, frame: ClientFrame) {
    conn.lastPingAt = Date.now();
    const id = frame.id ?? null;
    const respOk = <T>(payload: T) => {
      if (!id) return;
      this.send(conn, { type: "ok", id, payload } as unknown as ServerFrame);
    };
    const respErr = (code: string, msg: string) => {
      if (!id) return;
      this.send(conn, {
        type: "error",
        id,
        payload: { code, message: msg },
      } as unknown as ServerFrame);
    };

    switch (frame.type) {
      case "ping":
        respOk({ serverTime: Date.now(), echoClientTime: frame.payload.clientTime });
        return;

      case "channel.join": {
        const p = frame.payload;
        conn.joinedChannels.add(p.channelId);
        const set = this.channelsToConns.get(p.channelId) ?? new Set<string>();
        set.add(conn.id);
        this.channelsToConns.set(p.channelId, set);
        respOk({
          channelId: p.channelId,
          onlineCount: set.size,
          prefetch: null,
          readState: {
            userId: conn.userId,
            channelId: p.channelId,
            lastReadMessageId: null,
            lastReadAt: null,
            unreadMentions: 0,
          },
          lastMessageAt: null,
        });
        return;
      }
      case "channel.leave": {
        const p = frame.payload;
        conn.joinedChannels.delete(p.channelId);
        const set = this.channelsToConns.get(p.channelId);
        if (set) {
          set.delete(conn.id);
          if (set.size === 0) this.channelsToConns.delete(p.channelId);
        }
        respOk({ channelId: p.channelId });
        return;
      }
      case "channel.markRead":
      case "presence.set":
      case "message.send":
      case "message.update":
      case "message.delete":
      case "message.resolve":
        // TODO(M1 MVP)：这些需要写 D1 / 校验权限，然后 DO 广播给订阅者
        respErr("INTERNAL", "handler skeleton: not implemented");
        return;
    }
  }

  private async broadcastToChannel(channelId: string, frame: ServerFrame) {
    const conns = this.channelsToConns.get(channelId);
    if (!conns) return;
    for (const connId of conns) {
      const c = this.connections.get(connId);
      if (c) this.send(c, frame);
    }
  }
}
