/**
 * M0-5 smoke: DO RoomActor using WebSocket Hibernation class methods
 * (webSocketMessage / webSocketClose), the production pattern per
 * docs/m0/r5-cloudflare.md. One DO instance per channel (idFromName).
 */
export class Room {
  state: DurableObjectState;
  channel: string;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.channel = "?";
  }

  async fetch(request: Request): Promise<Response> {
    this.channel = new URL(request.url).searchParams.get("channel") ?? "?";
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Broadcast an incoming message to every other connection on this channel. */
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(message));
    } catch {
      parsed = { text: String(message) };
    }
    if ((parsed as { op?: string }).op === "ping") {
      ws.send(JSON.stringify({ op: "pong", ts: Date.now() }));
      return;
    }
    const out = JSON.stringify({
      op: "message.new",
      channel: this.channel,
      data: parsed,
      ts: Date.now(),
    });
    for (const sock of this.state.getWebSockets()) {
      if (sock !== ws && sock.readyState === WebSocket.OPEN) sock.send(out);
    }
  }
}
