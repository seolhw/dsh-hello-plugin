// ================================================================
// 社区成员/角色鉴权：所有「改社区/频道、拉成员、管理消息」的入口都必须
// 经过这里做成员资格 + 角色判定，杜绝越权（如普通成员改社区、被踢者仍可发消息）。
// 身份本身由 Better Auth 会话（Bearer）保证，见 lib/auth.ts。
// ================================================================

import type { MemberRole } from "@dsh-talk/types/entities";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import { type CommunityMemberRow, communityMembers } from "../db/schema";
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

/** 必须是 owner/admin（管理社区/频道/成员/他人消息） */
export async function requireModerator(
  db: Db,
  communityId: string,
  userId: string,
): Promise<CommunityMemberRow> {
  const member = await requireMember(db, communityId, userId);
  if (member.role !== "owner" && member.role !== "admin") {
    throw HttpApiError.forbidden("owner or admin required");
  }
  return member;
}

/** 必须是 owner（最高权限：删除/转让/轮换邀请等敏感操作按需用） */
export async function requireOwner(
  db: Db,
  communityId: string,
  userId: string,
): Promise<CommunityMemberRow> {
  const member = await requireMember(db, communityId, userId);
  if (member.role !== "owner") throw HttpApiError.forbidden("community owner required");
  return member;
}

/** 判断一个角色是否为管理角色（owner/admin） */
export function isModeratorRole(role: MemberRole): boolean {
  return role === "owner" || role === "admin";
}
