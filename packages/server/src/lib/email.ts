// ================================================================
// 事务邮件：Resend HTTP API（不引入 SDK，Worker 可直接 fetch）
//
// Better Auth 的 sendVerificationEmail / sendResetPassword 回调在请求处理
// 中途触发，并且回调第二参带当前 Request。我们按 Request 挂 executionCtx，
// 把投递交给 waitUntil，保证响应返回后仍继续发送；无 waitUntil 时退化为
// fire-and-forget（本地单测等场景）。
// ================================================================

import type { ExecutionContext } from "@cloudflare/workers-types";
import type { Env } from "../types";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

// ---------- 按 Request 记录当前 executionCtx ----------

const requestContexts = new WeakMap<Request, Pick<ExecutionContext, "waitUntil">>();

/** 请求入口处绑定（worker.ts 的 fetch 包装里调用），响应结束后 clear */
export function bindExecutionCtx(request: Request, ctx: Pick<ExecutionContext, "waitUntil">): void {
  requestContexts.set(request, ctx);
}

export function unbindExecutionCtx(request: Request): void {
  requestContexts.delete(request);
}

/** 把「发完即忘」的任务挂到该请求的 waitUntil 上，避免被提前回收 */
function runDetached(request: Request | undefined, task: Promise<unknown>): void {
  const ctx = request ? requestContexts.get(request) : undefined;
  const settle = (error: unknown) => console.error("[email] detached task failed:", error);
  if (ctx) ctx.waitUntil(task.catch(settle));
  else void task.catch(settle);
}

// ---------- Resend ----------

// Resend 发件地址。建议换成你在 Resend 已验证的域名邮箱；
// 未验证域名下 onboarding@resend.dev 只能发往你的注册邮箱（做本地联调用）。
const EMAIL_FROM = "dsh-talk <onboarding@resend.dev>";

function resendKey(env: Env): string | null {
  return env.RESEND_API_KEY?.trim() || null;
}

/** 发送一封事务邮件（async；调用方决定是否 await/挂到 waitUntil） */
export async function sendMail(env: Env, message: MailMessage): Promise<void> {
  const apiKey = resendKey(env);
  if (!apiKey) {
    // 开发期没配 key 时打印到服务端日志，便于先联调其它流程
    console.warn(
      `[email] RESEND_API_KEY 未配置，跳过发送 -> to=${message.to} subject=${message.subject}`,
    );
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`resend send failed: ${res.status} ${detail}`);
  }
}

// ---------- 面向 Better Auth 回调的便捷发送 ----------

/** 验证邮件 / 重置邮件正文直接放 Better Auth 生成的完整 url */
export function dispatchVerificationEmail(
  env: Env,
  request: Request | undefined,
  user: { email: string; name?: string | null },
  url: string,
): void {
  runDetached(
    request,
    sendMail(env, {
      to: user.email,
      subject: "dsh-talk：验证你的邮箱",
      text: `你好${user.name ? ` ${user.name}` : ""}，点击以下链接完成邮箱验证：\n${url}\n\n如果这不是你的操作，请忽略本邮件。`,
    }),
  );
}

export function dispatchResetPasswordEmail(
  env: Env,
  request: Request | undefined,
  user: { email: string; name?: string | null },
  url: string,
): void {
  runDetached(
    request,
    sendMail(env, {
      to: user.email,
      subject: "dsh-talk：重置你的密码",
      text: `你好${user.name ? ` ${user.name}` : ""}，点击以下链接重置密码：\n${url}\n\n如果这不是你的操作，请忽略本邮件。`,
    }),
  );
}
