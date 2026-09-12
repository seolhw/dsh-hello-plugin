// ================================================================
// 社区成员资格 / 封禁判定（权限位判定见 lib/permissions.ts）
// 身份本身由 Better Auth 会话（Bearer）保证，见 lib/auth.ts。
// ================================================================

import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import { type CommunityMemberRow, communityBans, communityMembers } from "../db/schema";
import { HttpApiError } from "./errors";

export type { CommunityMemberRow };

/** 查成员关系；不存在返回 null */
export async function getMembership(
  db: Db,
  communityId: string,
  userId: string,
): Promise<CommunityMemberRow | null> {
  const rows = await db
    .select()
    .from(communityMembers)
    .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** 是否被该社区封禁 */
export async function isCommunityBanned(
  db: Db,
  communityId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: communityBans.userId })
    .from(communityBans)
    .where(and(eq(communityBans.communityId, communityId), eq(communityBans.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

/** 加入/接受邀请前的封禁检查 */
export async function requireNotBanned(db: Db, communityId: string, userId: string): Promise<void> {
  if (await isCommunityBanned(db, communityId, userId)) {
    throw HttpApiError.forbidden("你已被该社区封禁，暂时无法加入");
  }
}

/** 必须有成员身份（浏览私密社区/频道消息/成员列表的最低门槛） */
export async function requireMember(
  db: Db,
  communityId: string,
  userId: string,
): Promise<CommunityMemberRow> {
  const member = await getMembership(db, communityId, userId);
  if (!member) throw HttpApiError.forbidden("you are not a member of this community");
  return member;
}
