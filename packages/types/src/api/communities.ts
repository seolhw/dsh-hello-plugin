import type {
  Channel,
  Community,
  CommunityMember,
  ID,
  MemberRole,
  TimestampMs,
  User,
} from "../entities";
import type { OffsetPaginated, OffsetPaginationQuery } from "./common";
import type { ThreadSummary } from "./threads";

// ===============================================================
// /api/communities/*  ——  社区 CRUD / 加入 / 邀请码 / 频道
// ===============================================================

/** GET /api/communities/discover —— 发现页（公开社区目录） */
export interface DiscoverCommunitiesQuery extends OffsetPaginationQuery {
  /** 模糊搜索 name / description */
  q?: string;
  /** 排序：默认热门（memberCount desc, createdAt desc） */
  sort?: "hot" | "newest";
}

export type DiscoverCommunitiesResponse = OffsetPaginated<Community>;

/** GET /api/communities/mine —— 我加入的社区列表（含 owner 的） */
export type GetMyCommunitiesResponse = (Community & {
  role: MemberRole;
  unreadChannels: number;
  unreadMentions: number;
})[];

/** POST /api/communities —— 创建社区（注册用户）；slug 由系统自动生成 */
export interface CreateCommunityRequest {
  name: string;
  description?: string | null;
  /** 默认 public */
  privacy?: "public" | "private";
  iconUrl?: string | null;
  bannerUrl?: string | null;
}

export type CreateCommunityResponse = Community & {
  /** 创建时自动生成的默认频道列表 */
  channels: Channel[];
  /** 私有社区自动生成邀请码（public 也有但不强制使用） */
  inviteCode: string;
};

/** GET /api/communities/:id —— 取社区详情（已加入 or 公开） */
export type GetCommunityResponse = Community & {
  channels: Channel[];
  /** 该社区全部讨论组（成员视角带未读；公开访客为 []） */
  threads: ThreadSummary[];
  /** 我在其中的角色；未加入且公开时 = null；私有未加入 = 403 */
  myRole: MemberRole | null;
};

/** PATCH /api/communities/:id —— 改社区（owner / admin） */
export interface UpdateCommunityRequest {
  name?: string;
  description?: string | null;
  privacy?: "public" | "private";
  iconUrl?: string | null;
  bannerUrl?: string | null;
  slug?: string | null;
}

export type UpdateCommunityResponse = Community;

/** POST /api/communities/join-by-code —— 用邀请码加入私有社区（公开社区直接 POST /join） */
export interface JoinByInviteRequest {
  inviteCode: string;
}

export type JoinByInviteResponse = Community & { channels: Channel[]; myRole: MemberRole };

/** POST /api/communities/:id/join —— 加入公开社区；私有必须走 invite code */
export type JoinCommunityResponse = Community & { channels: Channel[]; myRole: MemberRole };

/** POST /api/communities/:id/leave —— 退出（owner 不能退，必须先转移） */
export type LeaveCommunityResponse = { ok: true };

/** DELETE /api/communities/:id —— 删除社区（仅 owner；成员/频道/消息/未读/邀请级联清理） */
export type DeleteCommunityResponse = { ok: true };

// ------- 频道 ----------------------------------------------------------------

/** POST /api/communities/:id/channels —— 新增频道（owner/admin） */
export interface CreateChannelRequest {
  name: string;
  kind?: "text" | "announcement" | "forum";
  topic?: string | null;
  /** 插到什么位置；不传 = 末尾 */
  position?: number;
}

export type CreateChannelResponse = Channel;

/** PATCH /api/channels/:id —— 改频道（名、位置、topic、kind） */
export interface UpdateChannelRequest {
  name?: string;
  topic?: string | null;
  position?: number;
  kind?: "text" | "announcement" | "forum";
}

export type UpdateChannelResponse = Channel;

/** DELETE /api/channels/:id —— 删频道（不能删最后一个？留位给服务端决定） */
export type DeleteChannelResponse = { ok: true };

// ------- 成员 ---------------------------------------------------------------

/** GET /api/communities/:id/members */
export interface ListMembersQuery extends OffsetPaginationQuery {
  /** 角色过滤 */
  role?: MemberRole;
  /** 模糊搜索 handle/displayName */
  q?: string;
}

export type ListMembersResponse = OffsetPaginated<CommunityMember & { user: User }>;

/** PATCH /api/communities/:id/members/:userId/role —— 改角色（owner/admin） */
export interface UpdateMemberRoleRequest {
  role: MemberRole;
}
export type UpdateMemberRoleResponse = CommunityMember & { user: User };

/** DELETE /api/communities/:id/members/:userId —— 踢人（owner/admin，不能踢 owner） */
export type RemoveMemberResponse = { ok: true };

// ------- 封禁（成员被移出后阻止重新加入；owner/admin） ----------------

/** 单条封禁：操作者 + 被封用户快照 + 理由/时间 */
export interface CommunityBanItem {
  communityId: ID;
  userId: ID;
  user: User;
  bannedBy: ID;
  reason: string | null;
  createdAt: TimestampMs;
}

/** GET /api/communities/:id/bans —— 封禁列表（时间倒序） */
export type ListCommunityBansResponse = { items: CommunityBanItem[] };

/** POST /api/communities/:id/bans —— 封禁（同时把其移出成员，若在社内） */
export interface BanCommunityMemberRequest {
  /** 按成员行封禁时可直接传 userId（优先）；二者必填其一 */
  userId?: ID;
  /** 按 @handle 或注册邮箱封禁（与邀请一致） */
  handleOrEmail?: string;
  /** 可选封禁理由（展示用） */
  reason?: string;
}
export type BanCommunityMemberResponse = CommunityBanItem;

/** DELETE /api/communities/:id/bans/:userId —— 解封 */
export type UnbanCommunityMemberResponse = { ok: true };
