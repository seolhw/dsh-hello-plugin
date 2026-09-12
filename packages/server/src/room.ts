// ================================================================
// Durable Object: ChannelActor（一个频道 = 一个 DO 实例）
//
// 依据 Cloudflare DO 官方文档（2026）实现的实时通道：
//   - id 稳定路由：ROOM_ACTOR.idFromName(channelId)，每个频道独立实例，
//     广播只发生在实例内扇出，天然水平扩展（官方聊天模型）。
//   - 新基类 `DurableObject<Env>`（cloudflare:workers）：this.ctx / this.env，
//     REST 写入成功后直接**类型化 RPC** 调 `stub.broadcast(frame)` 广播。
//   - Hibernation WebSocket API：ctx.acceptWebSocket + webSocketMessage/Close
//     + serializeAttachment 跨休眠恢复 + 运行时自动 ping/pong。
//   - DO 私有 SQLite（ctx.storage.sql）：只存**本频道生命周期内的房间私有态**
//     ——在线 presence 名单；对象只在该频道有人在线时存在，全部断开即 deleteAll 释放。
//
// 数据隔离（与业务 D1 的边界）：
//   - 业务 D1（跨频道/长期/需聚合与外部工具）：社区/频道/成员/消息/未读/用户(Better Auth)
//   - 本 DO SQLite：presence 等只属于这一个房间、无跨频道聚合需求的热状态
//   - 鉴权：连接时用 D1 校验「频道存在 + 调用方是社区成员」再 accept；
//     此后把消息写入仍走 REST（权限唯一来源），DO 只做扇出。
// ================================================================

import { DurableObject } from "cloudflare:workers";
import type { ID } from "@dsh-talk/types/entities";
import type { ServerFrame } from "@dsh-talk/types/ws";
import type { Env } from "./types";

/** 持久化到每个 WebSocket 连接的会话档案（跨休眠恢复用，≤16KB） */
interface Session {
  connectionId: string;
  userId: ID;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  presence: "online" | "away" | "offline";
}

/** DO 私有 SQLite 里的在线成员行 */
type PresenceRow = {
  user_id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  kind: "online" | "away" | "offline";
  last_seen: number;
} & Record<string, string | number | null>;

const PRESENCE_DDL = `
  CREATE TABLE IF NOT EXISTS presence (
    user_id     TEXT PRIMARY KEY,
    handle      TEXT NOT NULL,
    display_name TEXT,
    avatar_url  TEXT,
    kind        TEXT NOT NULL DEFAULT 'online',
    last_seen   INTEGER NOT NULL
  )
`;

export class ChannelActor extends DurableObject<Env> {
  /** 本实例负责的频道 id（握手时由 Worker 的 X-Channel-Id 头注入；RPC/广播不依赖它） */
  private channelId = "";
  /** ws -> 会话（内存索引；休眠唤醒后由 attachment 重建） */
  private sessions = new Map<WebSocket, Session>();
  private presenceReady = false;

  constructor(ctx: ConstructorParameters<typeof DurableObject<Env>>[0], env: Env) {
    super(ctx, env);

    // 休眠唤醒（或首次创建）时，从每个存活连接的 attachment 恢复会话索引
    for (const ws of this.ctx.getWebSockets()) {
      const session = ws.deserializeAttachment() as Session | null;
      if (session) this.sessions.set(ws, session);
    }

    // 协议层 ping/pong 由运行时应答，连接保持活跃但不唤醒本对象
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  // ---------------- Worker 代理的升级请求（鉴权后路由到本 DO） ----------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/connect")) {
      return this.handleConnect(request);
    }
    return Response.json({ ok: true, message: "channel actor ok" });
  }

  private async handleConnect(req: Request): Promise<Response> {
    const upgradeHeader = req.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("expected websocket upgrade", { status: 400 });
    }
    const channelId = req.headers.get("X-Channel-Id") ?? this.channelId;
    const userId = req.headers.get("X-User-Id");
    if (!channelId || !userId) {
      return new Response("missing channel or user", { status: 400 });
    }
    this.channelId = channelId;

    // 鉴权唯一入口：房间存在 + 调用方有权进入（D1 为准）
    // roomId 既可能是主频道，也可能是讨论组（thread）——两种都放行到对应 DO 实例。
    // 讨论组隐私：public 全体社区成员可连；private 仅发起人 / 成员名单 / 社区 owner·admin。
    const allowed =
      (await this.env.DB.prepare(
        `SELECT 1 FROM channels c
         JOIN community_members m ON m.community_id = c.community_id
         WHERE c.id = ? AND m.user_id = ? LIMIT 1`,
      )
        .bind(this.channelId, userId)
        .first()) ??
      (await this.env.DB.prepare(
        `SELECT 1 FROM threads t
         JOIN community_members m ON m.community_id = t.community_id
         WHERE t.id = ? AND m.user_id = ?
           AND (
             t.visibility = 'public'
             OR t.created_by = ?
             OR m.role IN ('owner', 'admin')
             OR EXISTS (
               SELECT 1 FROM thread_members tm
               WHERE tm.thread_id = t.id AND tm.user_id = ?
             )
           )
         LIMIT 1`,
      )
        .bind(this.channelId, userId, userId, userId)
        .first());
    if (!allowed) {
      return Response.json(
        { code: "FORBIDDEN", message: "not a member of this room's community" },
        { status: 403 },
      );
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    const connectionId = req.headers.get("X-Conn-Id") ?? crypto.randomUUID();
    const handle = req.headers.get("X-Handle") ?? userId;
    const displayName = req.headers.get("X-Display-Name");
    const avatarUrl = req.headers.get("X-Avatar");

    const session: Session = {
      connectionId,
      userId: userId as ID,
      handle,
      displayName: displayName && displayName.length > 0 ? displayName : null,
      avatarUrl: avatarUrl && avatarUrl.length > 0 ? avatarUrl : null,
      presence: "online",
    };

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(session);
    this.sessions.set(server, session);
    await this.upsertPresence(session);

    this.send(server, {
      type: "evt.hello",
      ts: Date.now(),
      payload: {
        connectionId,
        channelId: this.channelId,
        user: {
          id: userId,
          handle,
          displayName: session.displayName,
          avatarUrl: session.avatarUrl,
          createdAt: 0,
          tokenIat: Date.now(),
        },
        serverTime: Date.now(),
        heartbeatIntervalSec: 30,
        onlineCount: this.onlineUserCount(),
      },
    } as unknown as ServerFrame);

    return new Response(null, { status: 101, webSocket: client });
  }

  // ---------------- Hibernation 事件处理器 ----------------

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    const frame = parseFrame(message);
    if (!frame) return;
    const session = this.sessions.get(ws);
    if (!session) return;
    const id = frame.id ?? null;

    switch (frame.type) {
      case "ping":
        this.respondOk(ws, id, {
          serverTime: Date.now(),
          echoClientTime: Number(frame.payload?.clientTime ?? 0),
        });
        return;
      case "presence.set": {
        const kind = frame.payload?.kind;
        if (kind !== "online" && kind !== "away" && kind !== "offline") {
          this.respondError(ws, id, "BAD_REQUEST", "invalid presence kind");
          return;
        }
        session.presence = kind;
        ws.serializeAttachment(session);
        await this.upsertPresence(session);
        this.respondOk(ws, id, { kind: session.presence });
        return;
      }
      default:
        this.respondError(ws, id, "BAD_REQUEST", `unsupported frame type: ${frame.type}`);
    }
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    await this.unregister(ws);
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    await this.unregister(ws);
  }

  // ================================================================
  // RPC（Worker/REST 侧类型化调用；每个 RPC 会话 = 1 次 DO 请求计费）
  // ================================================================

  /** REST 写库成功后广播一帧给本频道所有在线连接；evt.message.new 按接收者算 mentionMe */
  async broadcast(frame: ServerFrame): Promise<void> {
    const newFrame = frame as unknown as {
      type: string;
      payload?: { message?: { mentions?: string[] }; mentionMe?: boolean };
    };

    for (const ws of [...this.sessions.keys()]) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      if (newFrame.type === "evt.message.new") {
        const session = this.sessions.get(ws);
        const mentionMe =
          session !== undefined &&
          (newFrame.payload?.message?.mentions?.includes(session.userId) ?? false);
        this.send(ws, {
          ...frame,
          payload: { ...newFrame.payload, mentionMe },
        } as unknown as ServerFrame);
      } else {
        this.send(ws, frame);
      }
    }
  }

  /**
   * 当前频道在线成员快照。
   * 以「仍保持连接的会话」为准（按用户去重），presence 表只用来补 last_seen。
   * 断连用户遗留的 presence 行不算数，保证与 hello 的 onlineCount 口径一致。
   */
  async online(): Promise<{ count: number; members: PresenceRow[] }> {
    this.ensurePresenceTable();
    const lastSeenByUser = new Map(
      this.ctx.storage.sql
        .exec<PresenceRow>("SELECT user_id, last_seen FROM presence")
        .toArray()
        .map((r) => [r.user_id, r.last_seen] as const),
    );
    const byUser = new Map<string, PresenceRow>();
    for (const session of this.sessions.values()) {
      byUser.set(session.userId, {
        user_id: session.userId,
        handle: session.handle,
        display_name: session.displayName,
        avatar_url: session.avatarUrl,
        kind: session.presence,
        last_seen: lastSeenByUser.get(session.userId) ?? Date.now(),
      });
    }
    const members = [...byUser.values()].sort((a, b) => b.last_seen - a.last_seen);
    return { count: members.length, members };
  }

  // ---------------- 连接/会话维护 ----------------

  /**
   * 在线人数：按用户去重。
   * 同一用户可能短时存在多条连接（重连竞态、休眠恢复、多标签），
   * 直接数连接会把同一个人算成两人；口径与 online() 的成员名单保持一致。
   */
  private onlineUserCount(): number {
    const users = new Set<string>();
    for (const session of this.sessions.values()) users.add(session.userId);
    return users.size;
  }

  private async unregister(ws: WebSocket): Promise<void> {
    // 休眠唤醒后构造函数重建 sessions 时，正在关闭的 socket 可能已不在 getWebSockets() 里；
    // 此时从 attachment 兜底取回会话，否则会漏删 presence 行、留下“幽灵在线”。
    const session =
      this.sessions.get(ws) ?? (ws.deserializeAttachment() as Session | null) ?? undefined;
    this.sessions.delete(ws);
    if (!session) return;

    // 同用户还有其他连接在线 => 保留 presence；否则从名单移除
    const stillOnline = [...this.sessions.values()].some((s) => s.userId === session.userId);
    if (!stillOnline) {
      this.ensurePresenceTable();
      this.ctx.storage.sql.exec("DELETE FROM presence WHERE user_id = ?", session.userId);
    }

    // 频道里已无人连接：清空整个 DO 私有库，让实例随空闲被系统回收（不堆积）
    if (this.sessions.size === 0) {
      await this.ctx.storage.deleteAll();
      this.presenceReady = false;
    }
  }

  private send(ws: WebSocket, frame: ServerFrame): void {
    try {
      ws.send(JSON.stringify(frame));
    } catch {
      // 发送失败（连接已坏）交给 close/error 事件收尾
    }
  }

  private respondOk(ws: WebSocket, id: string | null, payload: unknown): void {
    if (!id) return;
    this.send(ws, { type: "ok", id, payload } as unknown as ServerFrame);
  }

  private respondError(ws: WebSocket, id: string | null, code: string, message: string): void {
    if (!id) return;
    this.send(ws, { type: "error", id, payload: { code, message } } as unknown as ServerFrame);
  }

  // ---------------- DO 私有 SQLite：presence ----------------

  private ensurePresenceTable(): void {
    if (this.presenceReady) return;
    this.ctx.storage.sql.exec(PRESENCE_DDL);
    this.presenceReady = true;
  }

  private async upsertPresence(session: Session): Promise<void> {
    this.ensurePresenceTable();
    this.ctx.storage.sql.exec(
      `INSERT INTO presence (user_id, handle, display_name, avatar_url, kind, last_seen)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         handle = excluded.handle,
         display_name = excluded.display_name,
         avatar_url = excluded.avatar_url,
         kind = excluded.kind,
         last_seen = excluded.last_seen`,
      session.userId,
      session.handle,
      session.displayName,
      session.avatarUrl,
      session.presence,
      Date.now(),
    );
  }
}

type AnyFrame = {
  type: string;
  payload: Record<string, unknown> | null;
  id?: string;
};

function parseFrame(message: string): AnyFrame | null {
  try {
    const raw = JSON.parse(message) as Partial<AnyFrame>;
    if (typeof raw.type !== "string") return null;
    const payload = (raw.payload as Record<string, unknown> | null | undefined) ?? null;
    return {
      type: raw.type,
      payload,
      ...(typeof raw.id === "string" ? { id: raw.id } : {}),
    };
  } catch {
    return null;
  }
}
