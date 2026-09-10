// ================================================================
// client → host 本地接口（同源 fetch）
//   /api/talk/config           配置读写（语义 = SettingsRpc 的 get/set）
//   /api/talk/sessions         本机可分享的 DSH 会话列表
//   /api/talk/session-package  打包一个会话（返回包体原始文本）
//   /api/talk/clone            下载分享包；会话包会直接还原成本地会话
// 由 host 的 packages/host/src/index.ts 提供。
// ================================================================

import type { HostCloneResult, HostSessionsStatus, TalkSettings } from "@dsh-talk/types/rpc";

export class HostConfigError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** 从错误响应体里取出可读文案：优先 JSON 的 message，其次原文，最后 fallback */
function errorMessageFrom(text: string, fallback: string): string {
  if (text.length === 0) return fallback;
  try {
    const data = JSON.parse(text) as { message?: string };
    if (typeof data.message === "string" && data.message.length > 0) return data.message;
  } catch {
    // 非 JSON 错误体，直接用原文
  }
  return text;
}

async function hostFetch(input: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(input, init);
  const text = await res.text();
  if (!res.ok) {
    throw new HostConfigError(errorMessageFrom(text, ""), res.status);
  }
  return text.length > 0 ? (JSON.parse(text) as unknown) : {};
}

export function hostConfigGet(): Promise<TalkSettings> {
  return hostFetch("/api/talk/config") as Promise<TalkSettings>;
}

export function hostConfigSet(patch: Partial<TalkSettings>): Promise<TalkSettings> {
  return hostFetch("/api/talk/config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  }) as Promise<TalkSettings>;
}

/** GET /api/talk/sessions —— 本机可分享的 DSH 会话 */
export function hostSessions(): Promise<HostSessionsStatus> {
  return hostFetch("/api/talk/sessions") as Promise<HostSessionsStatus>;
}

/** GET /api/talk/session-package —— 打包一个会话，返回包体原始文本 */
export async function hostSessionPackage(sessionId: string): Promise<string> {
  const res = await fetch(`/api/talk/session-package?sessionId=${encodeURIComponent(sessionId)}`);
  const text = await res.text();
  if (!res.ok) {
    throw new HostConfigError(errorMessageFrom(text, `打包失败 HTTP ${res.status}`), res.status);
  }
  return text;
}

/** POST /api/talk/clone —— 让 host 下载分享包；会话包会直接还原成本地会话 */
export function hostClone(downloadUrl: string, cwd?: string): Promise<HostCloneResult> {
  return hostFetch("/api/talk/clone", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cwd ? { downloadUrl, cwd } : { downloadUrl }),
  }) as Promise<HostCloneResult>;
}
