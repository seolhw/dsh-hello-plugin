// ================================================================
// 只读访问 Better Auth 的 user 表，把认证库用户投影成业务 User 实体。
// Better Auth 建表是它自己管理的（表名 user，列名 camelCase），
// 业务侧不持有该表的写权限，这里仅做 SELECT。
// ================================================================

import type { D1Database } from "@cloudflare/workers-types";
import type { ID, User } from "@dsh-talk/types/entities";

interface AuthUserRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string | null;
  createdAt: unknown;
}

export function toEntityUser(row: AuthUserRow): User {
  const emailPrefix = row.email.split("@")[0] || row.id;
  const createdAt =
    typeof row.createdAt === "number"
      ? row.createdAt
      : typeof row.createdAt === "string"
        ? Date.parse(row.createdAt)
        : Date.now();
  return {
    id: row.id as ID,
    handle: row.username?.trim() || emailPrefix,
    displayName: row.name || null,
    avatarUrl: row.image ?? null,
    createdAt: Number.isNaN(createdAt) ? Date.now() : createdAt,
  };
}

const USER_COLUMNS = "id, name, email, image, username, createdAt";

/** 生成 length 位随机小写字母/数字标签（0-9, a-z） */
function randomTag(length: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((byte) => (byte % 36).toString(36))
    .join("");
}

/**
 * 从邮箱 @ 前缀派生一个合法且唯一的用户名；若前缀已被占用则追加随机后缀。
 * 归一化规则与 Better Auth username 插件一致：小写 + 仅允许 [a-z0-9_.]，
 * 且长度固定在 4..30（插件的 minUsernameLength=4, maxUsernameLength=30），
 * 保证在 databaseHooks 中写入的用户名无需再次触发插件校验也合法。
 */
export async function uniqueUsernameForEmail(db: D1Database, email: string): Promise<string> {
  const prefix = email.split("@")[0] ?? "user";
  // 清洗为允许字符集，去首尾下划线/点，并控制在 24 位以内（为随机后缀留空间，合计 ≤30）
  let base =
    prefix
      .toLowerCase()
      .replace(/[^a-z0-9_.]/g, "_")
      .replace(/^[._]+/, "")
      .replace(/[._]+$/, "")
      .slice(0, 24) || "user";

  // 邮箱前缀过短：补齐到 ≥4，避免产生低于 Better Auth 最小长度的用户名
  if (base.length < 4) {
    base = `${base}${randomTag(4 - base.length + 1)}`.slice(0, 24);
  }

  let candidate = base;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (attempt > 0) {
      candidate = `${base}_${randomTag(4)}`.slice(0, 30);
    }
    const existing = await db
      .prepare(`SELECT id FROM "user" WHERE username = ?`)
      .bind(candidate)
      .first();
    if (!existing) return candidate;
  }
  return `${base}_${crypto.randomUUID().slice(0, 8)}`.slice(0, 30);
}

/** 单查一个认证用户；不存在返回 null */
export async function fetchUserById(db: D1Database, userId: string): Promise<User | null> {
  const row = await db
    .prepare(`SELECT ${USER_COLUMNS} FROM "user" WHERE id = ?`)
    .bind(userId)
    .first<AuthUserRow>();
  return row ? toEntityUser(row) : null;
}

/** 批量查（用于成员/作者列表补全）；不保证顺序与入参一致 */
export async function fetchUsersByIds(db: D1Database, ids: string[]): Promise<User[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  const users: User[] = [];
  for (const id of unique) {
    const user = await fetchUserById(db, id);
    if (user) users.push(user);
  }
  return users;
}

/** 按 @handle 或 email 精确查（用于解析 mentionHandles），返回 userId */
export async function resolveUserIdsByHandles(
  db: D1Database,
  handles: string[],
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  for (const raw of handles) {
    const handle = raw.trim();
    if (!handle) continue;
    const row = await db
      .prepare(`SELECT id, username, email FROM "user" WHERE username = ? OR email = ?`)
      .bind(handle.toLowerCase(), handle.toLowerCase())
      .first<{ id: string; username: string | null }>();
    if (row) resolved.set(handle, row.id);
  }
  return resolved;
}

/** 按 @handle 或邮箱精确查一个注册用户；不存在返回 null（发邀请用） */
export async function findAuthUserByHandleOrEmail(
  db: D1Database,
  raw: string,
): Promise<{ user: User; email: string } | null> {
  const q = raw.trim().replace(/^@/, "").toLowerCase();
  if (!q) return null;
  const row = await db
    .prepare(`SELECT ${USER_COLUMNS} FROM "user" WHERE username = ? OR email = ?`)
    .bind(q, q)
    .first<AuthUserRow>();
  return row ? { user: toEntityUser(row), email: row.email } : null;
}
