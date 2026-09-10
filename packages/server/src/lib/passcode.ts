// ================================================================
// 讨论组进入密码哈希（Web Crypto / PBKDF2-SHA256）
//   存储格式：pbkdf2$<iterations>$<saltB64>$<hashB64>
//   只用于私密讨论组的进入校验，不参与认证链路（认证见 lib/auth.ts）。
// ================================================================

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

/** 密码长度约束（路由据此给出可读提示） */
export const PASSCODE_MIN = 4;
export const PASSCODE_MAX = 64;

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(passcode: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passcode),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

/** 生成密码哈希（每次随机盐） */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(passcode, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

/** 校验密码；未设密码或格式不合法一律 false */
export async function verifyPasscode(passcode: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number.parseInt(parts[1] ?? "", 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  try {
    const salt = fromB64(parts[2] ?? "");
    const expected = fromB64(parts[3] ?? "");
    const actual = await derive(passcode, salt, iterations);
    if (actual.length !== expected.length) return false;
    // 恒定时间比较，避免按字节泄露
    let diff = 0;
    for (let i = 0; i < actual.length; i += 1) diff |= (actual[i] ?? 0) ^ (expected[i] ?? 0);
    return diff === 0;
  } catch {
    return false;
  }
}
