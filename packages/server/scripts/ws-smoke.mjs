// 冒烟：每频道一个 ChannelActor(DO) 的实时链路
//   /ws?token=<session>&channelId=<id> → Worker 鉴权 → 频道 DO 成员校验 → 101
//   REST 写库成功 → RPC stub.broadcast(frame) → DO 实例内扇出（mentionMe 逐人计算）
import { setTimeout as sleep } from "node:timers/promises";

const BASE = "http://127.0.0.1:8787";
// 认证请求必须带 Origin（缺了 better-auth 直接拒 MISSING_OR_NULL_ORIGIN），
// 且必须「已信任 + 与 Worker 不同源」：同源时 wrangler dev 会按 wrangler.jsonc 的
// routes 把它改写成自定义域 Origin，该域不在本地白名单里 → 403 INVALID_ORIGIN。
const ORIGIN = "http://127.0.0.1:3000";
const WS = BASE.replace(/^http/, "ws");
const ts = Date.now();

async function call(method, path, body, token) {
  const headers = { origin: ORIGIN };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

/** PUT /api/r2/objects —— 原始字节直传（Worker 直写 R2） */
async function uploadAttachment(token, name, bytes, contentType) {
  const res = await fetch(`${BASE}/api/r2/objects`, {
    method: "PUT",
    headers: {
      origin: ORIGIN,
      authorization: `Bearer ${token}`,
      "x-file-name": encodeURIComponent(name),
      "content-type": contentType,
    },
    body: bytes,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function signup(name) {
  const res = await call("POST", "/api/auth/sign-up/email", {
    name,
    email: `${name}${ts}@example.com`,
    password: "Password1234",
    username: `${name}${ts.toString(36)}`,
  });
  console.log(`signup ${name} -> ${res.status}`, JSON.stringify(res.json)?.slice(0, 120));
  return res.json?.token;
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

function connectWs(token, channelId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS}/ws?token=${token}&channelId=${channelId}`);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", () => reject(new Error("ws open failed")));
  });
}

/** 期望连接失败（非 101，如非成员被拒） */
function expectWsRejected(token, channelId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS}/ws?token=${token}&channelId=${channelId}`);
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("expected rejection but ws stayed open"));
    }, 5000);
    const onOpen = () => {
      cleanup();
      ws.close();
      reject(new Error("expected rejection but ws opened"));
    };
    const onError = () => {
      cleanup();
      resolve(undefined);
    };
    const cleanup = () => {
      clearTimeout(timer);
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("error", onError);
    };
    ws.addEventListener("open", onOpen);
    ws.addEventListener("error", onError);
  });
}

function waitFrame(ws, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timeout waiting frame"));
    }, timeoutMs);
    const onMsg = (ev) => {
      const frame = JSON.parse(String(ev.data));
      if (predicate(frame)) {
        cleanup();
        resolve(frame);
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      ws.removeEventListener("message", onMsg);
    };
    ws.addEventListener("message", onMsg);
  });
}

const tokenA = await signup("chalice");
const tokenB = await signup("chbob");
const comm = await call("POST", "/api/communities", { name: "Channel DO Test", privacy: "public" }, tokenA);
assert(comm.status === 201, "A 建社区");
const channelId = comm.json.channels.find((ch) => ch.name === "全员").id;
await call("POST", `/api/communities/${comm.json.id}/join`, {}, tokenB);

// A 直连 general 频道的 ChannelActor
const ws = await connectWs(tokenA, channelId);
const hello = await waitFrame(ws, (f) => f.type === "evt.hello");
assert(hello.payload.channelId === channelId, "hello 携带 channelId");
assert(hello.payload.user.handle.startsWith("chalice"), "hello 携带身份");
assert(typeof hello.payload.onlineCount === "number", "hello 带在线数");

// B 发 @chalice 消息 -> A 的频道 DO 扇出 evt.message.new 且 mentionMe=true
const newP = waitFrame(ws, (f) => f.type === "evt.message.new");
const post = await call(
  "POST",
  `/api/channels/${channelId}/messages`,
  { content: "hi per-channel realtime", mentionHandles: [`chalice${ts}`] },
  tokenB,
);
assert(post.status === 201, "B REST 发消息成功");
const newEvt = await newP;
assert(newEvt.payload.channelId === channelId, "收到 evt.message.new");
assert(newEvt.payload.message.content === "hi per-channel realtime", "消息内容一致");
assert(newEvt.payload.mentionMe === true, "mentionMe=true");

// ping 心跳应答 + presence.set 应答
const pongP = waitFrame(ws, (f) => f.id === "pg");
ws.send(JSON.stringify({ type: "ping", payload: { clientTime: Date.now() }, id: "pg" }));
const pong = await pongP;
assert(pong.type === "ok" && pong.payload.echoClientTime, "ping -> ok");
const preP = waitFrame(ws, (f) => f.id === "ps");
ws.send(JSON.stringify({ type: "presence.set", payload: { kind: "away" }, id: "ps" }));
const pre = await preP;
assert(pre.type === "ok" && pre.payload.kind === "away", "presence.set -> ok");

// B 改消息 -> A 收 evt.message.updated
const updP = waitFrame(ws, (f) => f.type === "evt.message.updated");
const patch = await call("PATCH", `/api/messages/${post.json.id}`, { content: "hi edited" }, tokenB);
assert(patch.status === 200, "B 改消息成功");
const updEvt = await updP;
assert(updEvt.payload.message.content === "hi edited", "收到 evt.message.updated");

// B 删消息 -> A 收 evt.message.deleted
const delP = waitFrame(ws, (f) => f.type === "evt.message.deleted");
await call("DELETE", `/api/messages/${post.json.id}`, undefined, tokenB);
const delEvt = await delP;
assert(delEvt.payload.messageId === post.json.id, "收到 evt.message.deleted");

// 附件链路：B 直传 R2 → 带附件发消息 → A 收到含图片附件的广播；误引用/读回也要对
const upl = await uploadAttachment(
  tokenB,
  "pic.png",
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
  "image/png",
);
assert(upl.status === 201 && upl.json?.r2Key?.startsWith("att"), "B 直传 R2 成功");
const attachP = waitFrame(
  ws,
  (f) => f.type === "evt.message.new" && (f.payload.message.attachments ?? []).length > 0,
);
const withAtt = await call(
  "POST",
  `/api/channels/${channelId}/messages`,
  { content: "look at this", attachments: [{ r2Key: upl.json.r2Key, name: "pic.png", size: upl.json.size }] },
  tokenB,
);
assert(withAtt.status === 201, "B 带附件发消息成功");
const evtAtt = await attachP;
const sentAtt = evtAtt.payload.message.attachments?.[0];
assert(
  sentAtt && sentAtt.kind === "image" && sentAtt.url.includes(upl.json.r2Key),
  "广播携带图片附件（kind=image + url）",
);

const bad = await call(
  "POST",
  `/api/channels/${channelId}/messages`,
  { content: "bad attach", attachments: [{ r2Key: "attNoSuchObject", name: "x.txt", size: 1 }] },
  tokenB,
);
assert(bad.status === 400, "引用不存在附件被拒（400）");

const getRes = await fetch(sentAtt.url);
assert(getRes.status === 200, "附件 GET 200");
assert((getRes.headers.get("content-type") ?? "").startsWith("image/png"), "附件 GET content-type 正确");

// Shares：登记一条 DSH 会话分享（先直传包体到 R2）→ 查看/随卡片消息级联删除
const packBody = Buffer.from(JSON.stringify({ kind: "agent-session", events: [] }));
const packUp = await uploadAttachment(tokenA, "session.json", packBody, "application/json");
assert(packUp.status === 201 && packUp.json?.r2Key?.startsWith("att"), "A 直传会话包到 R2");
const share = await call(
  "POST",
  "/api/shares/agent-session",
  {
    r2Key: packUp.json.r2Key,
    title: "会话分享冒烟",
    sizeBytes: packBody.byteLength,
    manifest: {},
    communityId: comm.json.id,
  },
  tokenA,
);
assert(
  share.status === 201 &&
    share.json?.share?.kind === "agent-session" &&
    share.json.share.r2Key === packUp.json.r2Key &&
    typeof share.json.downloadUrl === "string",
  "A 登记会话分享",
);
const shareId = share.json.share.id;
const view = await call("GET", `/api/shares/${shareId}`, undefined, tokenB);
assert(view.status === 200 && typeof view.json.downloadUrl === "string", "社区成员可查看分享");
// 删除分享 = 撤回卡片消息：发一条带分享卡片的消息，撤回它，分享随之消失
const cardMsg = await call(
  "POST",
  `/api/channels/${channelId}/messages`,
  { content: "分享卡片消息", shareId },
  tokenA,
);
assert(
  cardMsg.status === 201 && cardMsg.json?.shareCard?.shareId === shareId,
  "A 发送带分享卡片的消息",
);
const delCard = await call("DELETE", `/api/messages/${cardMsg.json.id}`, undefined, tokenA);
assert(delCard.status === 200, "A 撤回卡片消息");
const gone = await call("GET", `/api/shares/${shareId}`, undefined, tokenB);
assert(gone.status === 404, "分享随消息一并删除（404）");

// 非成员直连同一频道 DO 被拒（握手前 403）
const outsider = await signup("chout");
await expectWsRejected(outsider, channelId);
console.log("ok: 非成员直连频道被拒");

// —— 权限：公告频道只有 owner/admin 能发 ——
const annId = comm.json.channels.find((ch) => ch.kind === "announcement")?.id;
assert(annId, "建社区时自动生成公告频道");
const memberAnnounce = await call(
  "POST",
  `/api/channels/${annId}/messages`,
  { content: "member should be rejected" },
  tokenB,
);
assert(memberAnnounce.status === 403, "普通成员发公告被拒（403）");
const ownerAnnounce = await call(
  "POST",
  `/api/channels/${annId}/messages`,
  { content: "owner announcement" },
  tokenA,
);
assert(ownerAnnounce.status === 201, "owner 发公告成功");

// —— 权限：只有 owner 能删除社区（级联清频道/消息/成员） ——
const delByMember = await call("DELETE", `/api/communities/${comm.json.id}`, undefined, tokenB);
assert(delByMember.status === 403, "非 owner 删除社区被拒（403）");
const delByOwner = await call("DELETE", `/api/communities/${comm.json.id}`, undefined, tokenA);
assert(delByOwner.status === 200, "owner 删除社区成功");
const goneComm = await call("GET", `/api/communities/${comm.json.id}`, undefined, tokenB);
assert(goneComm.status === 404, "删除后社区 404");
const mineB = await call("GET", "/api/communities/mine", undefined, tokenB);
assert(!mineB.json.some((x) => x.id === comm.json.id), "删除后从 B 的社区列表消失");
const goneMsgs = await call("GET", `/api/channels/${channelId}/messages`, undefined, tokenB);
assert(goneMsgs.status === 404, "删除后频道消息 404");

ws.close();
await sleep(300);
console.log("WS SMOKE PASSED");
process.exit(0);
