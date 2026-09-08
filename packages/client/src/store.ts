// ================================================================
// dsh-talk client UI store（极简 listener store + React hook）
// 流程：打开面板 → host 取配置 → 有 token 则 Hub me + 我的社区，
//      没有则进入「注册身份」（注册码换令牌后回写 host 配置）
// ================================================================

import type { GetMyCommunitiesResponse } from "@dsh-talk/types/api";
import type { User } from "@dsh-talk/types/entities";
import type { TalkSettings } from "@dsh-talk/types/rpc";
import { useEffect, useReducer } from "react";
import { hostConfigGet, hostConfigSet } from "./config";
import { HubClient } from "./hub";

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

function makeHub(settings: TalkSettings): HubClient {
  return new HubClient(settings.hubUrl, settings.token);
}

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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

/** 重取：host 配置 → 有 token 就拉 Hub 身份 + 我的社区。 */
export async function refresh(): Promise<void> {
  setState({ phase: "booting", busy: true, error: "" });
  try {
    const settings = await hostConfigGet();
    if (settings.token.length === 0 || settings.handle.length === 0) {
      setState({ phase: "anon", busy: false, settings });
      return;
    }
    const hub = makeHub(settings);
    const me = await hub.me();
    const communities = await hub.myCommunities();
    setState({ phase: "ready", busy: false, settings, me, communities });
  } catch (error) {
    setState({ phase: "error", busy: false, error: errorText(error) });
  }
}

export interface RegisterIdentityInput {
  inviteCode: string;
  handle: string;
  displayName?: string | null;
}

/** 平台注册码 → Hub 换令牌 → 回写 host 配置 → 拉我的社区。 */
export async function registerIdentity(input: RegisterIdentityInput): Promise<void> {
  setState({ busy: true, error: "" });
  try {
    const settings = await hostConfigGet();
    const hub = makeHub(settings);
    const res = await hub.exchangeInvite({
      inviteCode: input.inviteCode,
      handle: input.handle,
      displayName: input.displayName || null,
    });
    const next = await hostConfigSet({
      token: res.token,
      handle: res.user.handle,
    });
    hub.setToken(res.token);
    const communities = await hub.myCommunities();
    setState({
      busy: false,
      phase: "ready",
      settings: next,
      me: res.user,
      communities,
    });
  } catch (error) {
    setState({ busy: false, phase: "anon", error: errorText(error) });
  }
}

/** 退出身份：清掉本地 token（保留 hubUrl/handle 等偏好）。 */
export async function logout(): Promise<void> {
  try {
    await hostConfigSet({ token: "" });
  } catch {
    // 本地写失败不阻塞 UI 退出
  }
  const settings = state.settings;
  setState({
    open: true,
    phase: "anon",
    me: null,
    communities: [],
    error: "",
    settings: settings === null ? null : { ...settings, token: "" },
  });
}
