/**
 * dsh-talk 开发看门狗：pnpm dev 的唯一入口。
 *
 * 同时负责两件事：
 *  1. 以 watch 模式跑 tsdown（源码变更 → 自动重打包 lib/）；
 *  2. 轮询 lib/ 产物，编译结果稳定后拉起 / 重启
 *     `npx @deepseek-ai/dsh web --patch ./cordis.yml`。
 *
 * 为什么不能只改 npm script：dsh CLI 自身没有 watch / 热重载，插件代码是从
 * lib/* 在启动时加载的，产物更新后必须重启进程才生效。每次重启只在本机 npx
 * 缓存里跑（--no-install），并加 --no-open 避免反复弹浏览器（首次启动仍会
 * 自动打开）。看到日志提示重启后，刷新已打开的 DSH Web 页即可。
 */
import { spawn, spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 决定「可以启动/重启 server」的产物：host 入口 + client 入口。
const WATCH_TARGETS = ["lib/index.mjs", "lib/client.js"];
// 产物连续无新写入这么久，才认为一次编译完成（合并同一轮的多次写入）。
const SETTLE_MS = 700;
// 轮询 lib/ 产物 mtime 的间隔。
const POLL_MS = 250;
// 杀掉旧 server 后、拉起新 server 前的间隔，等端口释放。
const RELAUNCH_DELAY_MS = 500;

const IS_WIN = process.platform === "win32";

let shuttingDown = false;
let builder = null; // tsdown --watch 子进程
let server = null; // dsh web 子进程
let everStarted = false;
let relaunching = false;
let relaunchQueued = false;

let previousSig = "";
let stableAt = 0;
let handledSig = "";
let seenWrite = false;

function run(command, env = {}) {
  return spawn(command, {
    cwd: ROOT,
    shell: true,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

/** 读取产物（存在性 + size + mtime）作为“是否需要重启”的信号。 */
function signature() {
  const parts = [];
  for (const rel of WATCH_TARGETS) {
    try {
      const st = statSync(path.join(ROOT, rel));
      parts.push(`${rel}:${st.size}:${Math.floor(st.mtimeMs)}`);
    } catch {
      parts.push(`${rel}:missing`);
    }
  }
  return parts.join("|");
}

function complete(sig) {
  return !sig.includes(":missing");
}

/** 杀掉 pid 对应的整棵进程树（dsh 由 npx → node 多层包着，只杀顶层会留孤儿）。 */
function killTree(pid) {
  if (!pid) return;
  try {
    if (IS_WIN) {
      spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGTERM");
    }
  } catch {
    // 进程已退出，忽略
  }
}

function bootServer(first) {
  const prefix = first ? "npx --yes @deepseek-ai/dsh" : "npx --no-install @deepseek-ai/dsh";
  const noOpen = first ? "" : " --no-open";
  const cmd = `${prefix} web --patch ./cordis.yml${noOpen}`;
  if (!first) {
    console.log(`\n[dsh-talk] lib 已重建，正在重启 DSH web（${cmd}）...`);
  }
  const child = run(cmd);
  server = child;
  child.on("exit", () => {
    if (server === child) server = null;
  });
}

/** 编译完成后的重启流程：杀旧进程 → 短暂等待端口释放 → 拉起新进程。 */
function restartServer() {
  if (relaunching) {
    relaunchQueued = true;
    return;
  }
  relaunching = true;
  const old = server;
  server = null;
  const proceed = () => {
    relaunching = false;
    if (relaunchQueued && !shuttingDown) {
      relaunchQueued = false;
      restartServer();
    }
  };
  if (old) killTree(old.pid);
  setTimeout(() => {
    if (!shuttingDown) bootServer(false);
    proceed();
  }, RELAUNCH_DELAY_MS);
}

function tick() {
  const sig = signature();
  const now = Date.now();
  if (sig !== previousSig) {
    previousSig = sig;
    // lib 里可能有上一次构建的残留：必须等 tsdown 真正写出一次新产物
    // （签名变化）才允许首次启动，避免拿旧代码起服务。
    if (!seenWrite && everStarted === false) seenWrite = true;
    // 产物齐全才开始计时；host 重建时 lib 里暂时缺 client.js 属正常。
    stableAt = complete(sig) ? now : 0;
    return;
  }
  if (!stableAt || sig === handledSig || shuttingDown) return;
  if (now - stableAt < SETTLE_MS) return;
  if (!seenWrite) return;
  handledSig = sig;
  if (!everStarted) {
    everStarted = true;
    bootServer(true);
  } else {
    restartServer();
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (builder) killTree(builder.pid);
  if (server) killTree(server.pid);
  setTimeout(() => process.exit(exitCode), 200);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log(
  "[dsh-talk] dev watch：源码变更将自动打包 lib/ 并重启 DSH web（Ctrl+C 退出）",
);

// TSDOWN_WATCH 告诉 tsdown.config.ts 这次是 watch：别 clean 掉整个 lib/，
// 否则只改 host 源码时 client.js 会被连带删除。
builder = run("tsdown --watch", { TSDOWN_WATCH: "1" });
builder.on("exit", (code) => {
  if (shuttingDown) return;
  console.error(`[dsh-talk] tsdown --watch 异常退出（code ${code}），结束 dev`);
  shutdown(code ?? 1);
});

const poll = setInterval(tick, POLL_MS);
tick();
