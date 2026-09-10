// ================================================================
// Drizzle ORM schema（应用业务表，目标 SQLite / Cloudflare D1）
//
// 注意：用户/会话/账号绑定等「认证实体」已完全交给 Better Auth 管理
//   （user / session / account / verification 及其插件扩展字段），由
//   better-auth 在启动时自举建表，这里不再声明。
//   各业务表里的 userId/authorId/ownerId 是对 better-auth user.id 的
//   弱引用（不做 DB 外键），业务查询用户资料时经由 Better Auth 会话或
//   后续的查询接口获取。
// ================================================================

import { asc, desc } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const $id = (name: string) => text(name).notNull();

// ---------- 社区 ----------
export const communities = sqliteTable(
  "communities",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").unique(),
    description: text("description"),
    privacy: text("privacy", { enum: ["public", "private"] })
      .notNull()
      .default("public"),
    ownerId: $id("owner_id"), // 弱引用 better-auth user.id
    iconUrl: text("icon_url"),
    bannerUrl: text("banner_url"),
    inviteCode: text("invite_code"),
    memberCount: integer("member_count", { mode: "number" }).notNull().default(0),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_communities_owner").on(t.ownerId),
    index("idx_communities_privacy_created").on(t.privacy, t.createdAt),
    index("idx_communities_member_count").on(desc(t.memberCount)),
  ],
);

// ---------- 社区成员（多对多） ----------
export const communityMembers = sqliteTable(
  "community_members",
  {
    communityId: $id("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    userId: $id("user_id"), // 弱引用 better-auth user.id
    role: text("role", { enum: ["owner", "admin", "member"] })
      .notNull()
      .default("member"),
    joinedAt: integer("joined_at", { mode: "number" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.userId] }),
    index("idx_members_user").on(t.userId),
    index("idx_members_role").on(t.communityId, t.role),
  ],
);

// ---------- 社区封禁（成员被移出后仍阻止重新加入） ----------
export const communityBans = sqliteTable(
  "community_bans",
  {
    communityId: $id("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    userId: $id("user_id"), // 弱引用 better-auth user.id
    bannedBy: $id("banned_by"), // 封禁操作者（owner/admin）
    reason: text("reason"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.userId] }),
    index("idx_community_bans_time").on(t.communityId, desc(t.createdAt)),
  ],
);

// ---------- 频道 ----------
export const channels = sqliteTable(
  "channels",
  {
    id: text("id").primaryKey(),
    communityId: $id("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["text", "announcement", "forum"] })
      .notNull()
      .default("text"),
    position: integer("position", { mode: "number" }).notNull().default(0),
    topic: text("topic"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_channels_community_position").on(t.communityId, asc(t.position))],
);

// ---------- 讨论组（thread：依附主频道、可归档的临时子空间） ----------
export const threads = sqliteTable(
  "threads",
  {
    id: text("id").primaryKey(),
    communityId: $id("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    channelId: $id("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    starterMessageId: text("starter_message_id"),
    createdBy: $id("created_by"), // 弱引用 better-auth user.id
    creatorHandle: text("creator_handle").notNull(),
    creatorDisplayName: text("creator_display_name"),
    creatorAvatarUrl: text("creator_avatar_url"),
    starterSnippet: text("starter_snippet"),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    visibility: text("visibility", { enum: ["public", "private"] })
      .notNull()
      .default("public"),
    /** 私密组的进入密码哈希（pbkdf2$…）；null = 未设密码（只能被邀请） */
    passcodeHash: text("passcode_hash"),
    messageCount: integer("message_count", { mode: "number" }).notNull().default(0),
    lastMessageId: text("last_message_id"),
    lastActivityAt: integer("last_activity_at", { mode: "number" }).notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
    archivedAt: integer("archived_at", { mode: "number" }),
  },
  (t) => [
    index("idx_threads_channel_status").on(t.channelId, t.status, desc(t.lastActivityAt)),
    index("idx_threads_community_status").on(t.communityId, t.status, desc(t.lastActivityAt)),
  ],
);

// ---------- 讨论组成员（仅私密讨论组有行；发起人建组时写入一行） ----------
export const threadMembers = sqliteTable(
  "thread_members",
  {
    threadId: $id("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    userId: $id("user_id"), // 弱引用 better-auth user.id
    addedBy: $id("added_by"), // 邀请人（发起人自加时 = 发起人）
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.threadId, t.userId] }),
    index("idx_thread_members_user").on(t.userId),
  ],
);

// ---------- 讨论组已读状态（用户 x 讨论组） ----------
export const threadReadStates = sqliteTable(
  "thread_read_states",
  {
    userId: $id("user_id"), // 弱引用 better-auth user.id
    threadId: $id("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    lastReadMessageId: text("last_read_message_id"),
    lastReadAt: integer("last_read_at", { mode: "number" }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.threadId] }),
    index("idx_thread_readstate_user").on(t.userId),
  ],
);

// ---------- 消息 ----------
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    channelId: $id("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    communityId: $id("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    authorId: $id("author_id"), // 弱引用 better-auth user.id
    content: text("content").notNull(),
    attachments: text("attachments"), // JSON: MessageAttachment[]
    mentions: text("mentions"), // JSON: string[] (userId list)
    shareCard: text("share_card"), // JSON: MessageShareCardRef | null
    replyToId: text("reply_to_id"), // FK 弱引用，避免循环删除复杂
    threadId: text("thread_id").references(() => threads.id, { onDelete: "cascade" }), // 属于哪条讨论组（null=主频道直接消息）
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }),
  },
  (t) => [
    index("idx_messages_channel_time").on(t.channelId, desc(t.createdAt)),
    index("idx_messages_thread_time").on(t.threadId, desc(t.createdAt)),
    index("idx_messages_author_time").on(t.authorId, desc(t.createdAt)),
  ],
);

// ---------- 分享（channel-snapshot 频道快照 / agent-session DSH 会话） ----------
export const shares = sqliteTable(
  "shares",
  {
    id: text("id").primaryKey(),
    authorId: $id("author_id"), // 弱引用 better-auth user.id
    kind: text("kind", { enum: ["channel-snapshot", "agent-session"] }).notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    coverUrl: text("cover_url"),
    r2Key: text("r2_key").notNull(),
    sizeBytes: integer("size_bytes", { mode: "number" }).notNull(),
    sha256: text("sha256"),
    manifest: text("manifest"), // JSON
    isPublic: integer("is_public", { mode: "boolean" }).notNull(),
    downloadCount: integer("download_count", { mode: "number" }).notNull().default(0),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }),
  },
  (t) => [
    index("idx_shares_kind_time").on(t.kind, desc(t.createdAt)),
    index("idx_shares_author_time").on(t.authorId, desc(t.createdAt)),
  ],
);

// ---------- 频道未读状态（用户 x 频道） ----------
export const channelReadStates = sqliteTable(
  "channel_read_states",
  {
    userId: $id("user_id"), // 弱引用 better-auth user.id
    channelId: $id("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    lastReadMessageId: text("last_read_message_id"),
    lastReadAt: integer("last_read_at", { mode: "number" }),
    unreadMentions: integer("unread_mentions", { mode: "number" }).notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.channelId] }),
    index("idx_readstate_user").on(t.userId),
  ],
);

// ---------- 社区邀请 ----------
export const invites = sqliteTable(
  "invites",
  {
    id: text("id").primaryKey(),
    communityId: $id("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    inviterId: $id("inviter_id"), // 弱引用 better-auth user.id（发起人，owner/admin）
    inviteeUserId: $id("invitee_user_id"), // 弱引用 better-auth user.id（被邀请人）
    inviteeEmail: text("invitee_email").notNull(),
    status: text("status", { enum: ["pending", "accepted", "declined"] })
      .notNull()
      .default("pending"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    respondedAt: integer("responded_at", { mode: "number" }),
  },
  (t) => [
    index("idx_invites_invitee_status").on(t.inviteeUserId, t.status),
    index("idx_invites_community_status").on(t.communityId, t.status),
  ],
);

// ---------- 站内信（事件收件箱；v1 只有 invite） ----------
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: $id("user_id"), // 弱引用 better-auth user.id（收件人）
    communityId: text("community_id").references(() => communities.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["invite"] }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: text("data"), // JSON: NotificationData（kind 相关快照）
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_notifications_user_time").on(t.userId, desc(t.createdAt)),
    index("idx_notifications_user_unread").on(t.userId, t.isRead),
    index("idx_notifications_community").on(t.communityId),
  ],
);

// ---------- 行类型推断导出 ----------
export type CommunityRow = typeof communities.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;
export type CommunityMemberRow = typeof communityMembers.$inferSelect;
export type NewCommunityMember = typeof communityMembers.$inferInsert;
export type CommunityBanRow = typeof communityBans.$inferSelect;
export type NewCommunityBan = typeof communityBans.$inferInsert;
export type ChannelRow = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type ThreadRow = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type ThreadMemberRow = typeof threadMembers.$inferSelect;
export type NewThreadMember = typeof threadMembers.$inferInsert;
export type ThreadReadStateRow = typeof threadReadStates.$inferSelect;
export type NewThreadReadState = typeof threadReadStates.$inferInsert;
export type MessageRow = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type ShareRow = typeof shares.$inferSelect;
export type NewShare = typeof shares.$inferInsert;
export type ChannelReadStateRow = typeof channelReadStates.$inferSelect;
export type NewChannelReadState = typeof channelReadStates.$inferInsert;
export type InviteRow = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;
export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
