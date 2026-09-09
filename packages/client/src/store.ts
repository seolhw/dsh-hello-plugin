// ================================================================
// dsh-talk client UI store（极简 listener store + React hook）
// 流程：打开面板 → host 取配置 → 有 token 则 get-session + 我的社区。
// 主屏：社区列表 ↔ 社区详情（频道） ↔ 频道消息（REST 加载 + WS 实时）。
// 认证：邮箱/用户名登录、注册。
// 实时：每个频道一条 TalkSocket；消息事件按当前 channelId 落到列表。
// ================================================================

import type {
  AuthUser,
  GetCommunityResponse,
  GetMyCommunitiesResponse,
  InboxItem,
  ListMembersResponse,
  MessageAttachmentPut,
  SignUpEmailRequest,
  UpdateUserRequest,
} from "@dsh-talk/types/api";
import type { ID, MemberRole, Message, User } from "@dsh-talk/types/entities";
import type { TalkSettings } from "@dsh-talk/types/rpc";
import type { ServerFrame } from "@dsh-talk/types/ws";
import { useEffect, useReducer } from "react";
import { hostClone, hostConfigGet, hostConfigSet } from "./config";
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
  /** 注册成功后待验证的邮箱；非空时 AuthScreen 切换到验证码界面 */
  pendingEmail: string | null;
  /** 站内信收件箱 */
  inboxOpen: boolean;
  notifications: InboxItem[];
  inboxLoading: boolean;
  inboxUnread: number;
  /** 正在处理（接受/拒绝）的站内信 id，用于按钮禁用 */
  inboxBusyId: string | null;
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
  pendingEmail: null,
  inboxOpen: false,
  notifications: [],
  inboxLoading: false,
  inboxUnread: 0,
  inboxBusyId: null,
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

/** 清空站内信状态（登出 / 切换账号时调用） */
function resetInbox(): void {
  setState({
    inboxOpen: false,
    notifications: [],
    inboxLoading: false,
    inboxUnread: 0,
    inboxBusyId: null,
  });
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

// ---------------- 页面生命周期（社区作为独立页面，不再依赖弹层开关） ----------------

export function activateTalk(): void {
  if (!state.open) {
    setState({ open: true });
    void refresh();
  }
}

export function deactivateTalk(): void {
  if (!state.open) return;
  closeRealtime();
  setState({ open: false });
}

export function openTalk(): void {
  if (!state.open) setState({ open: true });
  void refresh();
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

/** 邮箱注册：用户名由服务端从邮箱 @ 前缀自动派生，客户端不再提交。昵称可选。 */
export async function register(input: {
  name?: string;
  email: string;
  password: string;
}): Promise<void> {
  const settings = state.settings;
  if (!settings) throw new Error("尚未就绪");
  const name = input.name?.trim() || input.email.split("@")[0] || "dsh-user";
  const body: SignUpEmailRequest = { name, email: input.email, password: input.password };
  // 注册成功（requireEmailVerification=true 不会自动登录），服务端已发送 6 位验证码；
  // 这里只切换 UI 到验证码界面，由 verifyOtp 完成后续登录。
  await makeServer(settings).signUpEmail(body);
  setState({ pendingEmail: input.email.trim(), error: "" });
}

/** 校验邮箱验证码；验证成功且 autoSignInAfterVerification 开启时自动登录 */
export async function verifyOtp(otp: string): Promise<void> {
  const settings = state.settings;
  const email = state.pendingEmail;
  if (!settings || !email) throw new Error("请先注册并获取验证码");
  const result = await makeServer(settings).verifyEmail({ email, otp: otp.trim() });
  if (!result.user) throw new Error("验证失败，请重试");
  if (result.token) {
    await applySession({ user: result.user, token: result.token });
    return;
  }
  // 未自动登录：回登录页，让用户手动登录
  setState({ pendingEmail: null });
  notify("邮箱验证成功，请登录");
}

/** 重新发送邮箱验证码 */
export async function resendVerificationOtp(): Promise<void> {
  const settings = state.settings;
  const email = state.pendingEmail;
  if (!settings || !email) throw new Error("尚未就绪");
  await makeServer(settings).sendVerificationOtp({ email, type: "email-verification" });
  notify("验证码已重新发送");
}

/** 从验证码界面返回登录页 */
export function cancelVerification(): void {
  setState({ pendingEmail: null });
}

/**
 * 忘记密码 step1：请求把 6 位重置验证码发到邮箱。
 * 服务端对「邮箱不存在」也返回成功（防探测），文案由调用方统一提示。
 */
export async function requestPasswordResetOtp(email: string): Promise<void> {
  const settings = state.settings;
  if (!settings) throw new Error("尚未就绪");
  await makeServer(settings).requestPasswordResetOtp(email.trim());
}

/** 忘记密码 step2：用邮箱收到的验证码重设密码（成功后回登录页手动登录） */
export async function resetPasswordWithOtp(input: {
  email: string;
  otp: string;
  password: string;
}): Promise<void> {
  const settings = state.settings;
  if (!settings) throw new Error("尚未就绪");
  await makeServer(settings).resetPasswordWithOtp({
    email: input.email.trim(),
    otp: input.otp.trim(),
    password: input.password,
  });
}

export async function applySession(result: { user: AuthUser; token: string }): Promise<void> {
  setState({ busy: true, error: "" });
  try {
    const me = toUser(result.user);
    const next = await hostConfigSet({ token: result.token, handle: me.handle });
    const server = makeServer(next);
    const communities = await server.myCommunities();
    resetInbox();
    setState({
      busy: false,
      phase: "ready",
      settings: next,
      me,
      communities,
      view: { ...INITIAL_VIEW },
    });
    void refreshInboxUnread();
  } catch (error) {
    setState({ busy: false, phase: "anon", error: errorText(error) });
    throw error;
  }
}

/** 修改用户名：调用 Better Auth update-user，成功后同步本地 me 与 host handle。 */
export async function updateUserName(username: string): Promise<boolean> {
  const server = serverOf();
  if (!server) return false;
  const trimmed = username.trim();
  if (trimmed.length === 0) return false;
  if (trimmed === state.me?.handle) {
    notify("用户名没有变化");
    return false;
  }
  try {
    const body: UpdateUserRequest = { username: trimmed };
    const res = await server.updateUser(body);
    const me = toUser(res.user);
    try {
      const next = await hostConfigSet({ handle: me.handle });
      setState({ me, settings: next });
    } catch {
      // 本地写 handle 失败不阻塞用户名更新
      setState({ me });
    }
    notify("用户名已更新");
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

/** 上传一张图片到 R2，返回公开 URL；失败返回 null（内部已 toast） */
export async function uploadImage(file: File): Promise<string | null> {
  const server = serverOf();
  if (!server) return null;
  if (!file.type.startsWith("image/")) {
    notify("请选择图片文件");
    return null;
  }
  try {
    const up = await server.uploadObject(file);
    return up.url;
  } catch (error) {
    notify(errorText(error));
    return null;
  }
}

/** 修改用户头像：先上传拿 URL，再更新 Better Auth user.image，并同步本地 me */
export async function updateUserAvatar(file: File): Promise<boolean> {
  const server = serverOf();
  if (!server) return false;
  const url = await uploadImage(file);
  if (!url) return false;
  try {
    const res = await server.updateUser({ image: url });
    setState({ me: toUser(res.user) });
    notify("头像已更新");
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

/** 移除用户头像，回退到字母头像 */
export async function removeUserAvatar(): Promise<boolean> {
  const server = serverOf();
  if (!server) return false;
  try {
    const res = await server.updateUser({ image: null });
    setState({ me: toUser(res.user) });
    notify("已移除头像");
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
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
    pendingEmail: null,
  });
  resetInbox();
}

// ---------------- 初始化 / 刷新 ----------------

export async function refresh(): Promise<void> {
  setState({ phase: "booting", busy: true, error: "" });
  try {
    const settings = await hostConfigGet();
    if (settings.token.length === 0) {
      resetInbox();
      setState({ phase: "anon", busy: false, settings, pendingEmail: null });
      return;
    }
    const server = makeServer(settings);
    const session = await server.getSession();
    if (!session?.session || !session.user) {
      resetInbox();
      setState({ phase: "anon", busy: false, settings, pendingEmail: null });
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
    void refreshInboxUnread();
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 401) {
      resetInbox();
      setState({
        phase: "anon",
        busy: false,
        me: null,
        communities: [],
        settings: state.settings,
        pendingEmail: null,
      });
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

// ---------------- 站内信（事件收件箱） ----------------

/** 打开收件箱并拉取我的站内信 */
export async function openInbox(): Promise<void> {
  if (!state.open || !serverOf()) return;
  setState({ inboxOpen: true, inboxLoading: true });
  try {
    const server = serverOf();
    if (!server) {
      setState({ inboxOpen: false, inboxLoading: false });
      return;
    }
    const res = await server.listNotifications({ limit: 50 });
    setState({ notifications: res.items, inboxUnread: res.unread, inboxLoading: false });
  } catch (error) {
    setState({ inboxLoading: false });
    notify(errorText(error));
  }
}

export function closeInbox(): void {
  setState({ inboxOpen: false });
}

/** 轻量刷新未读数（角标 / 定时轮询用） */
export async function refreshInboxUnread(): Promise<void> {
  const server = serverOf();
  if (!server || !state.open) return;
  try {
    const res = await server.listNotifications({ limit: 1 });
    if (res.unread !== state.inboxUnread) setState({ inboxUnread: res.unread });
  } catch {
    // 静默失败：等下次轮询
  }
}

function mapNotification(item: InboxItem, patch: Partial<InboxItem>): InboxItem {
  return { ...item, ...patch };
}

/** 接受某条邀请类站内信（成功即入会并打开社区） */
export async function acceptInvite(inviteId: string): Promise<boolean> {
  const server = serverOf();
  if (!server || state.inboxBusyId !== null) return false;
  setState({ inboxBusyId: inviteId });
  try {
    const joined = await server.acceptInvite(inviteId);
    setState({ inboxBusyId: null, inboxOpen: false });
    notify(`已加入社区「${joined.name}」`);
    await refreshCommunities();
    await openCommunity(joined.id);
    void refreshInboxUnread();
    return true;
  } catch (error) {
    setState({ inboxBusyId: null });
    notify(errorText(error));
    return false;
  }
}

/** 拒绝某条邀请类站内信 */
export async function declineInvite(inviteId: string): Promise<boolean> {
  const server = serverOf();
  if (!server || state.inboxBusyId !== null) return false;
  setState({ inboxBusyId: inviteId });
  try {
    await server.declineInvite(inviteId);
    setState({
      inboxBusyId: null,
      notifications: state.notifications.map((n) =>
        n.kind === "invite" && n.data?.inviteId === inviteId
          ? mapNotification(n, {
              isRead: true,
              invite: n.invite ? { ...n.invite, status: "declined" } : n.invite,
            })
          : n,
      ),
    });
    notify("已拒绝该邀请");
    void refreshInboxUnread();
    return true;
  } catch (error) {
    setState({ inboxBusyId: null });
    notify(errorText(error));
    return false;
  }
}

/** 标记一条站内信已读 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const server = serverOf();
  if (!server) return;
  try {
    await server.markNotificationRead(notificationId);
    const wasUnread = state.notifications.some((n) => n.id === notificationId && !n.isRead);
    setState({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? mapNotification(n, { isRead: true }) : n,
      ),
      inboxUnread: Math.max(0, state.inboxUnread - (wasUnread ? 1 : 0)),
    });
  } catch {
    // 已读失败不影响浏览
  }
}

/** 全部已读 */
export async function markAllNotificationsRead(): Promise<void> {
  const server = serverOf();
  if (!server) return;
  try {
    await server.markAllNotificationsRead();
    setState({
      notifications: state.notifications.map((n) => mapNotification(n, { isRead: true })),
      inboxUnread: 0,
    });
  } catch (error) {
    notify(errorText(error));
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
  iconUrl?: string | null;
}): Promise<boolean> {
  const server = serverOf();
  if (!server) return false;
  try {
    const body: {
      name: string;
      description?: string;
      privacy?: "public" | "private";
      iconUrl?: string | null;
    } = { name: input.name };
    if (input.description !== undefined && input.description.length > 0) {
      body.description = input.description;
    }
    if (input.privacy !== undefined) body.privacy = input.privacy;
    if (input.iconUrl !== undefined) body.iconUrl = input.iconUrl;
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

/** 删除社区（仅 owner 可见入口）；服务端级联清除频道/消息/成员 */
export async function deleteCommunity(communityId: string): Promise<boolean> {
  const server = serverOf();
  if (!server) return false;
  try {
    await server.deleteCommunity(communityId);
    if (state.view.communityId === communityId) backToCommunities();
    await refreshCommunities();
    notify("社区已删除");
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

// ---------------- 社区 / 成员 / 频道 管理（owner/admin） ----------------

/** 重新拉取当前社区详情（编辑/建频道后刷新频道列表等） */
export async function reloadCommunityDetail(): Promise<void> {
  const server = serverOf();
  const communityId = state.view.communityId;
  if (!server || !communityId) return;
  try {
    const detail = await server.getCommunity(communityId);
    patchView({ community: detail, communityLoading: false });
  } catch (error) {
    notify(errorText(error));
  }
}

/** 编辑社区资料 */
export async function updateCommunity(patch: {
  name?: string;
  description?: string | null;
  privacy?: "public" | "private";
  iconUrl?: string | null;
}): Promise<boolean> {
  const server = serverOf();
  const communityId = state.view.communityId;
  if (!server || !communityId) return false;
  try {
    const body: {
      name?: string;
      description?: string | null;
      privacy?: "public" | "private";
      iconUrl?: string | null;
    } = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.privacy !== undefined) body.privacy = patch.privacy;
    if (patch.iconUrl !== undefined) body.iconUrl = patch.iconUrl;
    await server.updateCommunity(communityId, body);
    await reloadCommunityDetail();
    await refreshCommunities();
    notify("社区资料已更新");
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

/** 邀请已注册用户入社区（owner/admin）；目标会收到站内信 + 邮件 */
export async function inviteMember(handleOrEmail: string): Promise<boolean> {
  const server = serverOf();
  const communityId = state.view.communityId;
  if (!server || !communityId) return false;
  const who = handleOrEmail.trim();
  if (!who) return false;
  try {
    const res = await server.createInvite(communityId, { handleOrEmail: who });
    notify(`已向 ${res.invitee.handle} 发送邀请（站内信 + 邮件）`);
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

/** 拉成员列表 */
export async function listMembers(): Promise<ListMembersResponse["items"]> {
  const server = serverOf();
  const communityId = state.view.communityId;
  if (!server || !communityId) return [];
  try {
    const res = await server.listMembers(communityId);
    return res.items;
  } catch (error) {
    notify(errorText(error));
    return [];
  }
}

/** 调整成员角色 / owner 转让 */
export async function setMemberRole(userId: string, role: MemberRole): Promise<boolean> {
  const server = serverOf();
  const communityId = state.view.communityId;
  if (!server || !communityId) return false;
  try {
    await server.updateMemberRole(communityId, userId, { role });
    notify(role === "owner" ? "所有权已转让" : "成员角色已更新");
    await reloadCommunityDetail();
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

/** 移除成员 */
export async function kickMember(userId: string): Promise<boolean> {
  const server = serverOf();
  const communityId = state.view.communityId;
  if (!server || !communityId) return false;
  try {
    await server.removeMember(communityId, userId);
    notify("已移除该成员");
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

/** 新建频道（owner/admin），创建后自动进入 */
export async function createChannel(input: {
  name: string;
  topic?: string;
  kind?: "text" | "announcement" | "help";
}): Promise<boolean> {
  const server = serverOf();
  const communityId = state.view.communityId;
  if (!server || !communityId) return false;
  try {
    const body: {
      name: string;
      topic?: string | null;
      kind?: "text" | "announcement" | "help";
    } = { name: input.name };
    if (input.topic !== undefined) body.topic = input.topic;
    if (input.kind !== undefined) body.kind = input.kind;
    const created = await server.createChannel(communityId, body);
    await reloadCommunityDetail();
    await selectChannel(created.id);
    notify("频道已创建");
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

/** 编辑频道（改名/主题/类型等） */
export async function updateChannelById(
  channelId: string,
  patch: {
    name?: string;
    topic?: string | null;
    kind?: "text" | "announcement" | "help";
  },
): Promise<boolean> {
  const server = serverOf();
  if (!server) return false;
  try {
    await server.updateChannel(channelId, patch);
    await reloadCommunityDetail();
    notify("频道已更新");
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
  }
}

/** 删除频道（owner/admin）；若正打开该频道则关闭它 */
export async function deleteChannelById(channelId: string): Promise<boolean> {
  const server = serverOf();
  if (!server) return false;
  try {
    await server.deleteChannel(channelId);
    if (state.view.channelId === channelId) {
      closeRealtime();
      patchView({ channelId: null, messages: [], nextCursor: null, live: false });
    }
    await reloadCommunityDetail();
    notify("频道已删除");
    return true;
  } catch (error) {
    notify(errorText(error));
    return false;
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

/** 从正文里抽取形如 `@handle` 的 token（前一个字符不是词字符，避免匹配邮箱 a@b） */
function mentionHandlesOf(text: string): string[] {
  const matches = text.match(/(?<![\p{L}\p{N}_])@([\p{L}\p{N}_]+)/gu) ?? [];
  return matches.map((token) => token.replace(/^@/, ""));
}

/** 组 createMessage 请求体：附件与 @mention 只在有值时带上（exactOptionalPropertyTypes） */
function buildMessageBody(
  content: string,
  attachments: MessageAttachmentPut[],
): {
  content: string;
  attachments?: MessageAttachmentPut[];
  mentionHandles?: string[];
} {
  const body: {
    content: string;
    attachments?: MessageAttachmentPut[];
    mentionHandles?: string[];
  } = { content };
  if (attachments.length > 0) body.attachments = attachments;
  const handles = [...new Set(mentionHandlesOf(content))];
  if (handles.length > 0) body.mentionHandles = handles;
  return body;
}

/**
 * 发消息：先逐个 PUT 附件拿 r2Key，再走 REST 创建；WS live 时事件回填，否则本地补一条。
 * @returns 是否成功入队（成功时调用方应清空输入与附件）
 */
export async function sendMessage(content: string, files: File[] = []): Promise<boolean> {
  const server = serverOf();
  const channelId = state.view.channelId;
  if (!server || !channelId || state.view.sending) return false;
  const text = content.trim();
  if (text.length === 0 && files.length === 0) return false;
  patchView({ sending: true });
  try {
    const attachments: MessageAttachmentPut[] = [];
    for (const file of files) {
      const up = await server.uploadObject(file);
      attachments.push({
        r2Key: up.r2Key,
        name: up.name,
        size: up.size,
        mimeType: up.mimeType ?? (file.type.length > 0 ? file.type : null),
      });
    }
    const created = await server.createMessage(channelId, buildMessageBody(text, attachments));
    if (!state.view.live) {
      upsertMessage(created as MessageItem, true);
    }
    patchView({ sending: false });
    return true;
  } catch (error) {
    patchView({ sending: false });
    notify(errorText(error));
    return false;
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

/** 把当前频道最近消息打成会话快照，返回包体下载链接 */
export async function snapshotChannel(input: {
  title?: string;
  summary?: string;
}): Promise<string | null> {
  const server = serverOf();
  const channelId = state.view.channelId;
  if (!server || !channelId) return null;
  try {
    const body: { title?: string; summary?: string } = {};
    const rawTitle = input.title?.trim() ?? "";
    const rawSummary = input.summary?.trim() ?? "";
    if (rawTitle.length > 0) body.title = rawTitle;
    if (rawSummary.length > 0) body.summary = rawSummary;
    const res = await server.createShareSnapshot(channelId, body);
    notify(`已生成分享「${res.share.title}」`);
    return res.downloadUrl;
  } catch (error) {
    notify(errorText(error));
    return null;
  }
}

/** 让 host 把分享包流式下载到本地克隆目录；成功返回落盘路径 */
export async function cloneToLocal(downloadUrl: string): Promise<string | null> {
  try {
    const res = await hostClone(downloadUrl);
    notify(`已克隆到本地：${res.file}（${res.bytes} B）`);
    return res.file;
  } catch (error) {
    notify(errorText(error));
    return null;
  }
}

/** 当前用户能否改/删一条消息（作者本人 或 社区 owner/admin） */
export function canModify(item: MessageItem): boolean {
  if (state.me === null) return false;
  if (item.authorId === state.me.id) return true;
  const role = state.view.community?.myRole;
  return role === "owner" || role === "admin";
}
