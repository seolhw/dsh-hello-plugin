// ================================================================
// dsh-talk client UI store（极简 listener store + React hook）
// 流程：打开面板 → host 取配置 → 有 Better Auth 会话 token 则
//       Server get-session + 我的社区；没有则进入「未登录」态。
// 登录/注册/改密等交互 UI 由下一迭代提供（API 已就绪，见 server.ts）。
// ================================================================

import type { AuthUser, GetMyCommunitiesResponse } from "@dsh-talk/types/api";
import type { ID, User } from "@dsh-talk/types/entities";
import type { TalkSettings } from "@dsh-talk/types/rpc";
import { useEffect, useReducer } from "react";
import { hostConfigGet, hostConfigSet } from "./config";
import { ServerApiError, ServerClient } from "./server";

export type TalkPhase = "booting" | "anon" | "ready" | "error";

export interface TalkState {
  open: boolean;
  busy: boolean;
  phase: TalkPhase;
  settings: TalkSettings | null;
  me: User | null;
  communities: GetMyCommunitiesResponse;
  error: string;
}

const INITIAL: TalkState = {
  open: false,
  busy: false,
  phase: "booting",
  settings: null,
  me: null,
  communities: [],
  error: "",
};

let state: TalkState = { ...INITIAL };
const listeners = new Set<() => void>();

function setState(patch: Partial<TalkState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function makeServer(settings: TalkSettings): ServerClient {
  return new ServerClient(settings.serverUrl, settings.token);
}

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Better Auth user -> 业务 User 实体（与 server/src/lib/auth.ts 的映射一致） */
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

/** React hook：订阅 UI store。 */
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

export function openTalk(): void {
  if (!state.open) {
    setState({ open: true });
    void refresh();
  } else {
    setState({ open: false });
  }
}

export function closeTalk(): void {
  setState({ open: false });
}

/** 重取：host 配置 → 有 token 就拉会话（get-session）+ 我的社区。 */
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
    // 顺手把 username 回填到本地 handle 缓存（失败不影响登录态展示）
    if (settings.handle !== me.handle) {
      try {
        await hostConfigSet({ handle: me.handle });
      } catch {
        // 忽略：本地配置写失败只影响下次回显
      }
    }
    const communities = await server.myCommunities();
    const nextSettings =
      settings.handle === me.handle ? settings : { ...settings, handle: me.handle };
    setState({ busy: false, phase: "ready", settings: nextSettings, me, communities });
  } catch (error) {
    // 会话过期/被吊销 → 回到未登录态，而不是渲染成连接错误
    if (error instanceof ServerApiError && error.status === 401) {
      setState({ phase: "anon", busy: false, me: null, communities: [], settings: state.settings });
      return;
    }
    setState({ phase: "error", busy: false, error: errorText(error) });
  }
}

/** 记录一次 Better Auth 登录/注册结果（下一迭代登录 UI 用；调用后回写 host token/handle） */
export async function applySession(result: {
  user: AuthUser;
  token: string | null;
}): Promise<void> {
  if (!result.token) throw new Error("服务端未返回会话 token（检查 set-auth-token 响应头）");
  setState({ busy: true, error: "" });
  try {
    const me = toUser(result.user);
    const next = await hostConfigSet({ token: result.token, handle: me.handle });
    const server = makeServer(next);
    const communities = await server.myCommunities();
    setState({ busy: false, phase: "ready", settings: next, me, communities });
  } catch (error) {
    setState({ busy: false, phase: "anon", error: errorText(error) });
  }
}

/** 退出登录：先吊销 Server 会话，再清掉本地 token（保留 serverUrl/handle 偏好）。 */
export async function logout(): Promise<void> {
  const settings = state.settings;
  if (settings && settings.token.length > 0) {
    try {
      await makeServer(settings).signOut();
    } catch {
      // 远端吊销失败不阻塞本地退出（下次 get-session 也会自然失效）
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
    settings: settings === null ? null : { ...settings, token: "" },
  });
}
