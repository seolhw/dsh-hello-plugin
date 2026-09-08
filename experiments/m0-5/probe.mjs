// M0-5 smoke probes: ping/D1/R2/WS(DO) against local Miniflare at :8790.
const BASE = "http://127.0.0.1:8790";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function expect(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

async function waitReady(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${BASE}/api/ping`);
      if (r.ok) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error("worker not ready");
}

function wsChannel(channel) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE}/ws?channel=${encodeURIComponent(channel)}`);
    const queue = [];
    const waiters = [];
    ws.addEventListener("open", () => resolve({
      ws,
      send: (obj) => ws.send(JSON.stringify(obj)),
      next(timeout = 5000) {
        return new Promise((res, rej) => {
          const timer = setTimeout(() => rej(new Error("ws timeout")), timeout);
          const waiter = (data) => { clearTimeout(timer); res(JSON.parse(data)); };
          const hit = queue.shift();
          if (hit !== undefined) { clearTimeout(timer); res(JSON.parse(hit)); return; }
          waiters.push(waiter);
        });
      },
    }));
    ws.addEventListener("error", () => reject(new Error("ws error")));
    ws.addEventListener("message", (ev) => {
      const data = String(ev.data);
      const waiter = waiters.shift();
      if (waiter) waiter(data); else queue.push(data);
    });
  });
}

await expect("ready", async () => { await waitReady(); });

await expect("ping", async () => {
  const r = await fetch(`${BASE}/api/ping`);
  if (!r.ok) throw new Error(`status ${r.status}`);
  const body = await r.json();
  if (body.ok !== true) throw new Error(`bad body ${JSON.stringify(body)}`);
});

await expect("d1 insert+list", async () => {
  const post = await fetch(`${BASE}/api/msg`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "c1", body: "hello from D1" }),
  });
  if (!post.ok) throw new Error(`post ${post.status}`);
  const list = await (await fetch(`${BASE}/api/msg?channel=c1`)).json();
  if (!list.messages?.some((m) => m.body === "hello from D1")) {
    throw new Error(`row missing: ${JSON.stringify(list)}`);
  }
});

await expect("r2 put+get", async () => {
  const put = await fetch(`${BASE}/api/upload/a.txt`, {
    method: "PUT",
    body: "r2 content 12345",
  });
  if (!put.ok) throw new Error(`put ${put.status}`);
  const got = await (await fetch(`${BASE}/api/upload/a.txt`)).text();
  if (got !== "r2 content 12345") throw new Error(`got ${got}`);
});

await expect("ws broadcast via DO", async () => {
  const a = await wsChannel("smoke");
  const b = await wsChannel("smoke");
  try {
    a.send({ op: "msg", text: "hi from A" });
    const recv = await b.next();
    if (recv.op !== "message.new" || recv.data.text !== "hi from A") {
      throw new Error(`bad relay ${JSON.stringify(recv)}`);
    }
    a.send({ op: "ping" });
    const pong = await a.next();
    if (pong.op !== "pong") throw new Error(`bad pong ${JSON.stringify(pong)}`);
  } finally {
    try { a.ws.close(); } catch {}
    try { b.ws.close(); } catch {}
  }
});

console.log(process.exitCode ? "SMOKE FAILED" : "SMOKE OK");
process.exit(process.exitCode ?? 0);
