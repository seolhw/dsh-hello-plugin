// ================================================================
// Discord 式频道权限解析
//
// 模型：
//   - communities.ownerId 为 owner，恒定拥有全部权限（绕过一切判定）
//   - 每个社区必有且仅有一个 @everyone 角色（隐式作用于全体成员）
//   - 成员可持有多个自定义角色（member_roles），基础权限 = 各角色 permissions 的并集
//   - 频道维度用 channel_overwrites 对 @everyone / 角色 / 成员 叠加 allow/deny
//
// 解析顺序（与 Discord 一致）：
//   1) 非成员 => 0（社区频道一律不可见）
//   2) 基础权限 base = union(全部持有角色.permissions，含 @everyone)
//   3) 应用 @everyone 覆盖：base = (base & ~deny) | allow
//   4) 应用该成员全部角色覆盖：base = (base | allowAll) & ~denyAll
//   5) 应用成员级覆盖：base = (base & ~deny) | allow
// ================================================================

import type { ChannelAccess } from "@dsh-talk/types/api";
import {
  ALL_PERMISSIONS,
  DEFAULT_EVERYONE_PERMISSIONS,
  Permission,
  type PermissionFlags,
} from "@dsh-talk/types/entities";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import {
  type ChannelOverwriteRow,
  type ChannelRow,
  type CommunityRoleRow,
  channelOverwrites,
  channels,
  communities,
  communityRoles,
  memberRoles,
} from "../db/schema";
import { getMembership } from "./access";
import { HttpApiError } from "./errors";
import { newId } from "./ids";

export type { CommunityRoleRow };

// ---------------- 角色读写 ----------------

/** 社区全部角色（position 大→小，@everyone 恒排最后） */
export async function loadRoles(db: Db, communityId: string): Promise<CommunityRoleRow[]> {
  const rows = await db
    .select()
    .from(communityRoles)
    .where(eq(communityRoles.communityId, communityId))
    .orderBy(desc(communityRoles.position), asc(communityRoles.createdAt));
  return rows.sort((a, b) => Number(a.isEveryone) - Number(b.isEveryone));
}

/** 取 @everyone 角色；不存在返回 null */
export async function getEveryoneRole(
  db: Db,
  communityId: string,
): Promise<CommunityRoleRow | null> {
  const rows = await db
    .select()
    .from(communityRoles)
    .where(and(eq(communityRoles.communityId, communityId), eq(communityRoles.isEveryone, true)))
    .limit(1);
  return rows[0] ?? null;
}

/** 确保 @everyone 角色存在（建社区时调用） */
export async function ensureEveryoneRole(
  db: Db,
  communityId: string,
  now: number,
): Promise<CommunityRoleRow> {
  const existing = await getEveryoneRole(db, communityId);
  if (existing) return existing;
  const row: CommunityRoleRow = {
    id: newId(),
    communityId,
    name: "@everyone",
    color: null,
    position: 0,
    permissions: DEFAULT_EVERYONE_PERMISSIONS,
    isEveryone: true,
    createdAt: now,
  };
  await db.insert(communityRoles).values(row);
  return row;
}

/** 成员持有的角色 id（不含 @everyone） */
export async function loadMemberRoleIds(
  db: Db,
  communityId: string,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ roleId: memberRoles.roleId })
    .from(memberRoles)
    .where(and(eq(memberRoles.communityId, communityId), eq(memberRoles.userId, userId)));
  return rows.map((r) => r.roleId);
}

/** 社区全部成员 → 角色 id 映射（用于成员列表） */
export async function loadRoleIdsByMember(
  db: Db,
  communityId: string,
): Promise<Map<string, string[]>> {
  const rows = await db
    .select({ userId: memberRoles.userId, roleId: memberRoles.roleId })
    .from(memberRoles)
    .where(eq(memberRoles.communityId, communityId));
  const out = new Map<string, string[]>();
  for (const r of rows) {
    const list = out.get(r.userId);
    if (list) list.push(r.roleId);
    else out.set(r.userId, [r.roleId]);
  }
  return out;
}

// ---------------- 权限计算 ----------------

/** 基础权限 = 各持有角色 permissions 的并集（含 @everyone） */
export function computeBasePermissions(
  roles: CommunityRoleRow[],
  roleIds: readonly string[],
): PermissionFlags {
  const held = new Set(roleIds);
  let flags = 0;
  for (const role of roles) {
    if (role.isEveryone || held.has(role.id)) flags |= role.permissions;
  }
  return flags;
}

/** 按 Discord 顺序把频道覆盖叠加到基础权限上 */
export function applyChannelOverwrites(
  base: PermissionFlags,
  roleIds: readonly string[],
  overwrites: readonly ChannelOverwriteRow[],
): PermissionFlags {
  const held = new Set(roleIds);
  let flags = base;

  // 1) @everyone 覆盖
  for (const ow of overwrites) {
    if (ow.targetType !== "everyone") continue;
    flags = (flags & ~ow.deny) | ow.allow;
  }
  // 2) 角色覆盖（多个角色：allow 取并集，deny 取并集）
  let allowRoles = 0;
  let denyRoles = 0;
  for (const ow of overwrites) {
    if (ow.targetType !== "role" || !held.has(ow.targetId)) continue;
    allowRoles |= ow.allow;
    denyRoles |= ow.deny;
  }
  flags = (flags | allowRoles) & ~denyRoles;
  // 3) 成员覆盖（优先级最高）
  for (const ow of overwrites) {
    if (ow.targetType !== "member") continue;
    flags = (flags & ~ow.deny) | ow.allow;
  }
  return flags;
}

/** 某频道「我」的权限位 */
export function computeChannelPermissions(opts: {
  basePermissions: PermissionFlags;
  isOwner: boolean;
  isMember: boolean;
  roleIds: readonly string[];
  overwrites: readonly ChannelOverwriteRow[];
}): PermissionFlags {
  if (opts.isOwner) return ALL_PERMISSIONS;
  if (!opts.isMember) return 0;
  return applyChannelOverwrites(opts.basePermissions, opts.roleIds, opts.overwrites);
}

/** 按频道 id 分组加载覆盖行 */
export async function loadOverwritesByChannel(
  db: Db,
  channelIds: readonly string[],
): Promise<Map<string, ChannelOverwriteRow[]>> {
  const out = new Map<string, ChannelOverwriteRow[]>();
  if (channelIds.length === 0) return out;
  const rows = await db
    .select()
    .from(channelOverwrites)
    .where(inArray(channelOverwrites.channelId, [...channelIds]));
  for (const row of rows) {
    const list = out.get(row.channelId);
    if (list) list.push(row);
    else out.set(row.channelId, [row]);
  }
  return out;
}

// ---------------- 社区级解析 ----------------

export interface CommunityPermissions {
  isMember: boolean;
  isOwner: boolean;
  roleIds: string[];
  roles: CommunityRoleRow[];
  /** 基础权限（不含任何频道覆盖） */
  permissions: PermissionFlags;
}

/**
 * 解析「我」在某社区的身份与基础权限。
 * 非成员 => permissions = 0（公开访客看不到任何频道）。
 */
export async function resolveCommunityPermissions(
  db: Db,
  communityId: string,
  userId: string,
): Promise<CommunityPermissions> {
  const ownerRows = await db
    .select({ ownerId: communities.ownerId })
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1);
  const ownerId = ownerRows[0]?.ownerId ?? null;
  const isOwner = ownerId !== null && ownerId === userId;

  const member = await getMembership(db, communityId, userId);
  const roles = await loadRoles(db, communityId);
  if (!member) {
    return { isMember: false, isOwner, roleIds: [], roles, permissions: 0 };
  }
  const roleIds = await loadMemberRoleIds(db, communityId, userId);
  const permissions = isOwner ? ALL_PERMISSIONS : computeBasePermissions(roles, roleIds);
  return { isMember: true, isOwner, roleIds, roles, permissions };
}

/** 某频道「我」的权限位（单频道，一次解析） */
export async function resolveChannelPermissions(
  db: Db,
  channel: ChannelRow,
  userId: string,
): Promise<PermissionFlags> {
  const access = await resolveCommunityPermissions(db, channel.communityId, userId);
  if (access.isOwner) return ALL_PERMISSIONS;
  if (!access.isMember) return 0;
  const owMap = await loadOverwritesByChannel(db, [channel.id]);
  return applyChannelOverwrites(access.permissions, access.roleIds, owMap.get(channel.id) ?? []);
}

/** 社区下「我」可见的频道（含各自权限位） */
export async function listChannelAccess(
  db: Db,
  communityId: string,
  userId: string,
): Promise<ChannelAccess[]> {
  const rows = await db
    .select()
    .from(channels)
    .where(eq(channels.communityId, communityId))
    .orderBy(asc(channels.position));
  const access = await resolveCommunityPermissions(db, communityId, userId);
  const owMap = access.isMember
    ? await loadOverwritesByChannel(
        db,
        rows.map((r) => r.id),
      )
    : new Map<string, ChannelOverwriteRow[]>();
  const out: ChannelAccess[] = [];
  for (const row of rows) {
    const permissions = computeChannelPermissions({
      basePermissions: access.permissions,
      isOwner: access.isOwner,
      isMember: access.isMember,
      roleIds: access.roleIds,
      overwrites: owMap.get(row.id) ?? [],
    });
    if ((permissions & Permission.VIEW_CHANNEL) === 0) continue;
    out.push({ ...row, permissions });
  }
  return out;
}

// ---------------- 断言 ----------------

/** 社区级权限断言（owner 恒通过） */
export async function requireCommunityPermission(
  db: Db,
  communityId: string,
  userId: string,
  bit: PermissionFlags,
  message = "insufficient permissions",
): Promise<CommunityPermissions> {
  const access = await resolveCommunityPermissions(db, communityId, userId);
  if (!access.isMember) throw HttpApiError.forbidden("you are not a member of this community");
  if ((access.permissions & bit) === 0) throw HttpApiError.forbidden(message);
  return access;
}

/** 频道级权限断言（owner 恒通过；非成员/无位一律 403） */
export async function requireChannelPermission(
  db: Db,
  channel: ChannelRow,
  userId: string,
  bit: PermissionFlags,
  message = "insufficient permissions",
): Promise<void> {
  const permissions = await resolveChannelPermissions(db, channel, userId);
  if ((permissions & bit) === 0) throw HttpApiError.forbidden(message);
}

/** 仅 owner（删社区 / 转让所有权等敏感操作） */
export async function requireCommunityOwner(
  db: Db,
  communityId: string,
  userId: string,
): Promise<void> {
  const access = await resolveCommunityPermissions(db, communityId, userId);
  if (!access.isOwner) throw HttpApiError.forbidden("community owner required");
}

/** 是否 owner */
export async function isCommunityOwner(
  db: Db,
  communityId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ ownerId: communities.ownerId })
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1);
  return rows[0]?.ownerId === userId;
}
