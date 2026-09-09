// ---------------------------------------------------------------
// D1 实体类型（与 server/src/db/schema.ts 的 Drizzle 表一一对应）
// 命名规则：
//   - 读模型：Xxx（对外返回）
//   - 写模型：CreateXxx / UpdateXxx
// ---------------------------------------------------------------

/** 雪花 ID 或 UUID 字符串（服务端生成，客户端只当 opaque 处理） */
export type ID = string;

/** Unix 毫秒时间戳 */
export type TimestampMs = number;

// ====================== 用户 ======================

export interface User {
  id: ID;
  /** 平台内全局唯一的昵称/句柄（@alice） */
  handle: string;
  /** 显示名（可选，空时显示 handle） */
  displayName: string | null;
  /** 头像 URL（R2 或外部 CDN；可 null = 默认头像） */
  avatarUrl: string | null;
  /** 平台注册码换令牌首次写入时生成，不可变 */
  createdAt: TimestampMs;
}

// ====================== 社区 ======================

export type CommunityPrivacy = "public" | "private";

export interface Community {
  id: ID;
  name: string;
  slug: string | null;
  description: string | null;
  privacy: CommunityPrivacy;
  /** 创建者 UserId，社区 owner */
  ownerId: ID;
  /** 图标 URL */
  iconUrl: string | null;
  /** 横幅 URL（大卡头图） */
  bannerUrl: string | null;
  /** 加入码（创建社区时生成、固定不变；公开社区也可通过它定向加入） */
  inviteCode: string | null;
  memberCount: number;
  createdAt: TimestampMs;
  updatedAt: TimestampMs;
}

// ====================== 频道 ======================

/**
 * 频道定位（互斥）：普通文字 / 公告（仅 owner/admin 可发）/ 求助（消息可标记「已解决」）
 */
export type ChannelKind = "text" | "announcement" | "help";

export interface Channel {
  id: ID;
  communityId: ID;
  name: string;
  kind: ChannelKind;
  /** 同一社区内的排序，越小越靠前 */
  position: number;
  topic: string | null;
  createdAt: TimestampMs;
  updatedAt: TimestampMs;
}

// ====================== 社区成员（多对多） ======================

export type MemberRole = "owner" | "admin" | "member";

export interface CommunityMember {
  communityId: ID;
  userId: ID;
  role: MemberRole;
  joinedAt: TimestampMs;
}

// ====================== 消息 ======================

export type MessageAttachmentKind = "image" | "file";

export interface MessageAttachment {
  kind: MessageAttachmentKind;
  /** R2 预签名/公开 URL */
  url: string;
  /** 原始文件名 */
  name: string;
  /** 字节数 */
  size: number;
  /** MIME */
  mimeType: string | null;
  /** 图片宽高（仅 image） */
  width?: number | null;
  height?: number | null;
}

export type MessageShareCardKind = "session" | "workflow";

/** 消息内嵌的分享卡片引用（只占元数据；实际 payload 在 Share 表） */
export interface MessageShareCardRef {
  shareId: ID;
  kind: MessageShareCardKind;
  title: string;
  summary: string | null;
  /** 封面图 URL（可选） */
  coverUrl: string | null;
}

/** help 频道提问的解决状态 */
export interface HelpResolution {
  resolvedBy: ID;
  resolvedAt: TimestampMs;
  /** 标记时引用的解答消息 ID（可选） */
  answerMessageId: ID | null;
}

export interface Message {
  id: ID;
  channelId: ID;
  communityId: ID;
  authorId: ID;
  /** 非空，Markdown 原文 */
  content: string;
  attachments: MessageAttachment[];
  /** @某人 的 userId 列表（解析 @handle 后得到） */
  mentions: ID[];
  /** 分享卡片（0 或 1 条；目前一条消息只挂一张卡片） */
  shareCard: MessageShareCardRef | null;
  /** help 频道里的「已解决」标记 */
  resolution: HelpResolution | null;
  /** 引用/回复的父消息 ID */
  replyToId: ID | null;
  createdAt: TimestampMs;
  updatedAt: TimestampMs | null;
}

// ====================== 分享（session / workflow） ======================

export type ShareKind = "session" | "workflow";

export interface Share {
  id: ID;
  authorId: ID;
  kind: ShareKind;
  title: string;
  summary: string | null;
  coverUrl: string | null;
  /** R2 对象 key（session 克隆包 .tar.gz / workflow 的 payload.json） */
  r2Key: string;
  /** 字节数，用于校验下载完整性 */
  sizeBytes: number;
  /** SHA-256 hex（可选，存着方便校验） */
  sha256: string | null;
  /** 克隆包 manifest 的快照字段（session 时存版本、消息数等；workflow 存 script 名） */
  manifest: Record<string, unknown>;
  /** 是否公开（未登录也能下载？一般 false，只有注册用户能看社区的才能下载） */
  public: boolean;
  downloadCount: number;
  createdAt: TimestampMs;
  updatedAt: TimestampMs | null;
}

// ====================== 频道未读状态（按 用户 x 频道） ======================

export interface ChannelReadState {
  userId: ID;
  channelId: ID;
  /** 最后一次已读消息 ID（null = 从未读过） */
  lastReadMessageId: ID | null;
  lastReadAt: TimestampMs | null;
  /** 该频道里 @我 且未读的消息数 */
  unreadMentions: number;
}

// ====================== 社区邀请 ======================

/** 邀请状态：pending → accepted / declined（社区被删时随邀请整行级联清除） */
export type InviteStatus = "pending" | "accepted" | "declined";

export interface CommunityInvite {
  id: ID;
  communityId: ID;
  /** 发起邀请的用户 id（owner/admin） */
  inviterId: ID;
  /** 被邀请的用户 id */
  inviteeUserId: ID;
  /** 被邀请人注册邮箱（发信快照；对外响应不携带，避免二次泄露） */
  inviteeEmail: string;
  status: InviteStatus;
  createdAt: TimestampMs;
  /** 处理时间（accepted/declined），未处理为 null */
  respondedAt: TimestampMs | null;
}

// ====================== 站内信（事件收件箱） ======================

/** v1 只有「邀请」这类事件，后续按需扩展该联合 */
export type NotificationKind = "invite";

/** kind = invite 时 data 的快照字段（建信时写死，防止关联对象被删后无法展示） */
export interface InviteNotificationData {
  inviteId: ID;
  communityId: ID;
  communityName: string;
  communityIconUrl: string | null;
  inviterId: ID;
  inviterHandle: string;
}

/** 各 kind 对应的 data 联合；目前只有邀请一种 */
export type NotificationData = InviteNotificationData;

export interface Notification {
  id: ID;
  /** 收件人 userId */
  userId: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  /** kind 相关的快照数据（按 kind 解码） */
  data: NotificationData | null;
  isRead: boolean;
  createdAt: TimestampMs;
}
