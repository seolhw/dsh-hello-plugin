// ================================================================
// dsh-talk client UI store（极简 listener store + React hook）
// 流程：打开面板 → host 取配置 → 有 token 则 get-session + 我的社区。
// 主屏：社区列表 ↔ 社区详情（频道） ↔ 频道消息（REST 加载 + WS 实时）。
// 认证：邮箱/用户名登录、注册、GitHub OAuth（popup → server landing）。
// 实时：每个频道一条 TalkSocket；消息事件按当前 channelId 落到列表。
// ================================================================

import type {
  AuthUser,
  GetCommunityResponse,
  GetMyCommunitiesResponse,
  SignUpEmailRequest,
} from "@dsh-talk/types/api";
import type { ID, Message, User } from "@dsh-talk/types/entities";
import type { TalkSettings } from "@dsh-talk/types/rpc";
import type { ServerFrame } from "@dsh-talk/types/ws";
import { useEffect, useReducer } from "react";
import { hostConfigGet, hostConfigSet } from "./config";
import { ServerApiError, ServerClient } from "./server";
import { TalkSocket } from "./ws";

// ---------------- 类型 ----------------

export type TalkPhase = "booting" | "anon" | "ready" | "error";

export type MessageItem = Message & {
  author: User;
  replyTo?: MessageItem | null;
};

export type CommunityDetail = GetCommunityResponse;

export interface ViewState {
  communityId: ID | null;
  community: CommunityDetail | null;
  communityLoading: boolean;
  channelId: ID | null;
  /** 按时间升序渲染（旧→新，最新在底部） */
  messages: MessageItem[];
  nextCursor: string | null;
  messagesLoading: boolean;
  loadingOlder: boolean;
  sending: boolean;
  /** 当前频道 WS 是否 live */
  live: boolean;
  drafts: Record<string, string>;
}

export interface TalkState {
  open: boolean;
  busy: boolean;
  phase: TalkPhase;
  settings: TalkSettings | null;
  me: User | null;
  communities: GetMyCommunitiesResponse;
  error: string;
  toast: string;
  view: ViewState;
}

// ---------------- 初始状态 ----------------

const INITIAL_VIEW: ViewState = {
  communityId: null,
  community: null,
  communityLoading: false,
  channelId: null,
  messages: [],
  nextCursor: null,
  messagesLoading: false,
  loadingOlder: false,
  sending: false,
  live: false,
  drafts: {},
};

const INITIAL: TalkState = {
  open: false,
  busy: false,
  phase: "booting",
  settings: null,
  me: null,
  communities: [],
  error: "",
  toast: "",
  view: INITIAL_VIEW,
};

let state: TalkState = { ...INITIAL, view: { ...INITIAL_VIEW } };
const listeners = new Set<() => void>();
let toastTimer: number | null = null;

function setState(patch: Partial<TalkState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function patchView(patch: Partial<ViewState>): void {
  setState({ view: { ...state.view, ...patch } });
}

function makeServer(settings: TalkSettings): ServerClient {
  return new ServerClient(settings.serverUrl, settings.token);
}

function serverOf(): ServerClient | null {
  const settings = state.settings;
  if (!settings || settings.token.length === 0) return null;
  return makeServer(settings);
}

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

function toUser(auth: AuthUser): User {
  const emailPrefix = auth.email.split("@")[0] || auth.id;
  const createdAt = Number.isNaN(Date.parse(auth.createdAt))
    ? Date.now()
    : Date.parse(auth.createdAt);
  return {
    id: auth.id as ID,
    handle: auth.username || emailPrefix,
    displayName: auth.name || null,
    avatarUrl: auth.image,
    createdAt,
  };
}

/** 通知条（自动消失） */
export function notify(message: string): void {
  setState({ toast: message });
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => setState({ toast: "" }), 3200);
}

/** 提前关闭通知条（Toast 动画结束后调用） */
export function dismissToast(): void {
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  setState({ toast: "" });
}

// ---------------- React hook ----------------

export function useTalkState(): TalkState {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return state;
}

// ---------------- 面板开关 ----------------

export function openTalk(): void {
  if (!state.open) {
    setState({ open: true });
    void refresh();
  } else {
    setState({ open: false });
  }
}

export function closeTalk(): void {
  closeRealtime();
  setState({ open: false });
}

// ---------------- 认证 ----------------

type LoginMode = "email" | "username";

/** 邮箱/用户名登录（Better Auth），成功后写 host token/handle */
export async function login(mode: LoginMode, account: string, password: string): Promise<void> {
  const settings = state.settings;
  if (!settings) throw new Error("尚未就绪");
  const server = makeServer(settings);
  const result =
    mode === "email"
      ? await server.signInEmail({ email: account, password })
      : await server.signInUsername({ username: account, password });
  const { user, token } = result;
  if (!token || !user) throw new Error("服务端未返回会话 token");
  await applySession({ user, token });
}

/** 邮箱注册（用户名可选；name 必填由服务端契约保证，空则退回用户名/邮箱前缀） */
export async function register(input: {
  name?: string;
  email: string;
  username?: string;
  password: string;
}): Promise<void> {
  const settings = state.settings;
  if (!settings) throw new Error("尚未就绪");
  const name =
    input.name?.trim() || input.username?.trim() || input.email.split("@")[0] || "dsh-user";
  const body: SignUpEmailRequest = { name, email: input.email, password: input.password };
  if (input.username !== undefined && input.username.trim().length > 0) {
    body.username = input.username.trim();
  }
  const result = await makeServer(settings).signUpEmail(body);
  const { user, token } = result;
  if (!token || !user) throw new Error("服务端未返回会话 token");
  await applySession({ user, token });
}

/** GitHub OAuth：打开服务端授权页（top-level 导航无 Origin 限制），
 *  回调回服务端 landing 页后 postMessage 回传 token（见 worker.ts social-landing）。 */
export function githubLogin(): Promise<void> {
  const settings = state.settings;
  if (!settings) throw new Error("尚未就绪");
  return new Promise((resolve, reject) => {
    const origin = new URL(settings.serverUrl).origin;
    const callback = `${settings.serverUrl}/api/auth/social-landing`;
    const authUrl = `${settings.serverUrl}/api/auth/sign-in/social?provider=github&callbackURL=${encodeURIComponent(callback)}`;
    const popup = window.open(authUrl, "dsh-talk-github", "popup,width=520,height=640");
    if (!popup) {
      reject(new Error("弹窗被拦截，请允许本站打开弹窗后重试"));
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as { type?: string; user?: AuthUser; token?: string };
      if (data?.type !== "dsh-talk:auth") return;
      window.removeEventListener("message", onMessage);
      if (!data.user || !data.token) {
        reject(new Error("GitHub 授权未完成或已取消"));
        return;
      }
      void applySession({ user: data.user, token: data.token }).then(resolve, reject);
    };
    window.addEventListener("message", onMessage);
  });
}

export async function applySession(result: { user: AuthUser; token: string }): Promise<void> {
  setState({ busy: true, error: "" });
  try {
    const me = toUser(result.user);
    const next = await hostConfigSet({ token: result.token, handle: me.handle });
    const server = makeServer(next);
    const communities = await server.myCommunities();
    setState({
      busy: false,
      phase: "ready",
      settings: next,
      me,
      communities,
      view: { ...INITIAL_VIEW },
    });
  } catch (error) {
    setState({ busy: false, phase: "anon", error: errorText(error) });
    throw error;
  }
}

export async function logout(): Promise<void> {
  closeRealtime();
  const settings = state.settings;
  if (settings && settings.token.length > 0) {
    try {
      await makeServer(settings).signOut();
    } catch {
      // 远端吊销失败不阻塞本地退出
    }
  }
  try {
    await hostConfigSet({ token: "" });
  } catch {
    // 本地写失败不阻塞 UI 退出
  }
  setState({
    open: true,
    phase: "anon",
    me: null,
    communities: [],
    error: "",
    view: { ...INITIAL_VIEW },
    settings: settings === null ? null : { ...settings, token: "" },
  });
}

// ---------------- 初始化 / 刷新 ----------------

export async function refresh(): Promise<void> {
  setState({ phase: "booting", busy: true, error: "" });
  try {
    const settings = await hostConfigGet();
    if (settings.token.length === 0) {
      setState({ phase: "anon", busy: false, settings });
      return;
    }
    const server = makeServer(settings);
    const session = await server.getSession();
    if (!session?.session || !session.user) {
      setState({ phase: "anon", busy: false, settings });
      return;
    }
    const me = toUser(session.user);
    if (settings.handle !== me.handle) {
      try {
        await hostConfigSet({ handle: me.handle });
      } catch {
        // 写失败忽略
      }
    }
    const communities = await server.myCommunities();
    const nextSettings =
      settings.handle === me.handle ? settings : { ...settings, handle: me.handle };
    setState({ busy: false, phase: "ready", settings: nextSettings, me, communities });
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 401) {
      setState({ phase: "anon", busy: false, me: null, communities: [], settings: state.settings });
      return;
    }
    setState({ phase: "error", busy: false, error: errorText(error) });
  }
}

/** 后台重取社区列表（加入/退出/未读变化后调用，不打断当前浏览） */
export async function refreshCommunities(): Promise<void> {
  const server = serverOf();
  if (!server) return;
  try {
    const communities = await server.myCommunities();
    setState({ communities });
  } catch {
    // 静默失败：下次刷新再试
  }
}

// ---------------- 社区：选择 / 创建 / 加入 / 退出 ----------------

export function backToCommunities(): void {
  closeRealtime();
  setState({ view: { ...INITIAL_VIEW } });
}

export async function openCommunity(communityId: string): Promise<void> {
  const server = serverOf();
  if (!server) return;
  closeRealtime();
  patchView({
    communityId,
    community: null,
    communityLoading: true,
    channelId: null,
    messages: [],
    nextCursor: null,
    live: false,
  });
  try {
    const detail = await server.getCommunity(communityId);
    patchView({ community: detail, communityLoading: false });
    // 若当前用户在社区里，进入第一个频道
    if (detail.myRole) {
      const first = detail.channels[0];
      if (first) void selectChannel(first.id);
    }
  } catch (error) {
    patchView({ communityLoading: false });
    notify(errorText(error));
  }
}

export async function createCommunity(input: {
  name: string;
  description?: string;
  privacy?: "public" | "private";
}): Promise<boolean> {
  const server = serverOf();
  if (!server) return false;
  try {
    const body: { name: string; description?: string; privacy?: "public" | "private" } = {
      name: input.name,
    };
    if (input.description !== undefined && input.description.length > 0) {
      body.description = input.description;
    }
    if (input.privacy !== undefined) body.privacy = input.privacy;
    const created = await server.createCommunity(body);
    await refreshCommunities();
    await openCommunity(created.id);
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

export async function joinCommunityByCode(inviteCode: string): Promise<boolean> {
  const server = serverOf();
  if (!server) return false;
  try {
    const joined = await server.joinByCode({ inviteCode: inviteCode.trim() });
    await refreshCommunities();
    await openCommunity(joined.id);
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

export async function leaveCommunity(communityId: string): Promise<void> {
  const server = serverOf();
  if (!server) return;
  try {
    await server.leaveCommunity(communityId);
    if (state.view.communityId === communityId) backToCommunities();
    await refreshCommunities();
    notify("已退出社区");
  } catch (error) {
    notify(errorText(error));
  }
}

// ---------------- 频道：选择 / 消息 / 实时 ----------------

let socket: TalkSocket | null = null;
let reconnectTimer: number | null = null;

function closeRealtime(): void {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket !== null) {
    socket.close();
    socket = null;
  }
  if (state.view.live) patchView({ live: false });
}

function wsUrl(channelId: string): string {
  const settings = state.settings;
  const base = (settings?.serverUrl ?? "http://127.0.0.1:8787").replace(/^http/, "ws");
  const token = settings?.token ?? "";
  return `${base}/ws?token=${encodeURIComponent(token)}&channelId=${encodeURIComponent(channelId)}`;
}

function connectChannel(channelId: string): void {
  closeRealtime();
  const settings = state.settings;
  socket = new TalkSocket(wsUrl(channelId), {
    onFrame: (frame) => handleServerFrame(frame),
    onClose: () => {
      socket = null;
      if (!state.open || state.view.channelId !== channelId) return;
      patchView({ live: false });
      if (settings?.autoReconnect && reconnectTimer === null) {
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          if (state.open && state.view.channelId === channelId) connectChannel(channelId);
        }, 3000);
      }
    },
    onError: () => {
      // close 事件随后会触发重连
    },
  });
  socket.connect();
}

/** 服务端帧分发：hello（心跳开启）/ 消息事件（仅当属于当前频道） */
function handleServerFrame(frame: ServerFrame): void {
  switch (frame.type) {
    case "evt.hello":
      patchView({ live: true });
      socket?.startHeartbeat(frame.payload.heartbeatIntervalSec);
      return;
    case "evt.message.new":
      if (frame.payload.channelId !== state.view.channelId) return;
      upsertMessage(frame.payload.message as MessageItem, true);
      return;
    case "evt.message.updated":
      if (frame.payload.channelId !== state.view.channelId) return;
      upsertMessage(frame.payload.message as MessageItem, true);
      return;
    case "evt.message.deleted":
      if (frame.payload.channelId !== state.view.channelId) return;
      removeMessage(frame.payload.messageId);
      return;
    default:
      return;
  }
}

function upsertMessage(item: MessageItem, appended: boolean): void {
  const list = state.view.messages;
  const index = list.findIndex((m) => m.id === item.id);
  let next: MessageItem[];
  if (index >= 0) {
    next = [...list];
    next[index] = item;
  } else if (appended) {
    next = [...list, item];
  } else {
    next = [item, ...list];
  }
  next.sort((a, b) => a.createdAt - b.createdAt);
  patchView({ messages: next });
}

function removeMessage(messageId: string): void {
  patchView({ messages: state.view.messages.filter((m) => m.id !== messageId) });
}

/** 切换到某个频道：拉历史 → 上报已读 → 连实时 */
export async function selectChannel(channelId: string): Promise<void> {
  const server = serverOf();
  if (!server) return;
  closeRealtime();
  patchView({
    channelId,
    messages: [],
    nextCursor: null,
    messagesLoading: true,
    loadingOlder: false,
    live: false,
  });
  try {
    const page = await server.listMessages(channelId, { limit: 50, direction: "desc" });
    const items = [...page.items].reverse();
    patchView({
      messages: items,
      nextCursor: page.nextCursor,
      messagesLoading: false,
    });
    const newest = items[items.length - 1];
    if (newest) {
      try {
        await server.markRead(channelId, { lastReadMessageId: newest.id });
        void refreshCommunities();
      } catch {
        // 已读上报失败不阻塞聊天
      }
    }
    connectChannel(channelId);
  } catch (error) {
    patchView({ messagesLoading: false, live: false });
    notify(errorText(error));
  }
}

/** 向上翻更早消息 */
export async function loadOlderMessages(): Promise<void> {
  const server = serverOf();
  const { channelId, nextCursor, loadingOlder, messages } = state.view;
  if (!server || !channelId || !nextCursor || loadingOlder) return;
  patchView({ loadingOlder: true });
  try {
    const page = await server.listMessages(channelId, {
      cursor: nextCursor,
      limit: 50,
      direction: "desc",
    });
    const older = [...page.items].reverse();
    const merged = [...older, ...messages];
    patchView({
      messages: merged,
      nextCursor: page.nextCursor,
      loadingOlder: false,
    });
  } catch (error) {
    patchView({ loadingOlder: false });
    notify(errorText(error));
  }
}

/** 发消息：走 REST；WS live 时事件会回填，否则本地补一条 */
export async function sendMessage(content: string): Promise<void> {
  const server = serverOf();
  const channelId = state.view.channelId;
  if (!server || !channelId) return;
  const text = content.trim();
  if (text.length === 0 || state.view.sending) return;
  patchView({ sending: true });
  try {
    const created = await server.createMessage(channelId, { content: text });
    if (!state.view.live) {
      upsertMessage(created as MessageItem, true);
    }
    patchView({ sending: false });
  } catch (error) {
    patchView({ sending: false });
    notify(errorText(error));
  }
}

export async function updateMessage(messageId: string, content: string): Promise<void> {
  const server = serverOf();
  if (!server) return;
  try {
    const updated = await server.updateMessage(messageId, { content: content.trim() });
    if (!state.view.live) upsertMessage(updated as MessageItem, true);
  } catch (error) {
    notify(errorText(error));
    throw error;
  }
}

export async function deleteMessage(messageId: string): Promise<void> {
  const server = serverOf();
  if (!server) return;
  try {
    await server.deleteMessage(messageId);
    if (!state.view.live) removeMessage(messageId);
  } catch (error) {
    notify(errorText(error));
    throw error;
  }
}

/** 设置当前频道输入草稿（内存） */
export function setDraft(text: string): void {
  const channelId = state.view.channelId;
  if (!channelId) return;
  patchView({ drafts: { ...state.view.drafts, [channelId]: text } });
}

/** 当前用户能否改/删一条消息（作者本人 或 社区 owner/admin） */
export function canModify(item: MessageItem): boolean {
  if (state.me === null) return false;
  if (item.authorId === state.me.id) return true;
  const role = state.view.community?.myRole;
  return role === "owner" || role === "admin";
}
