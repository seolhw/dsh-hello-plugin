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
