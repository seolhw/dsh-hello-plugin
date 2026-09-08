// ================================================================
// Drizzle ORM schema (target: SQLite / Cloudflare D1)
// 严格对应 @dsh-talk/types/entities.ts
// ================================================================

import { asc, desc, type SQL, sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ---------- 时间戳：Unix 毫秒 (INTEGER)，由 SQLite 在 INSERT 时求值 ----------
const tsNow = (): SQL<number> =>
  sql<number>`CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)`;

const $id = (name: string) => text(name).notNull();

// ---------- 平台注册码（一次性换令牌） ----------
export const authInviteCodes = sqliteTable("auth_invite_codes", {
  code: text("code").primaryKey(),
  usedByUserId: text("used_by_user_id"),
  usedAt: integer("used_at", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" }).notNull().default(tsNow()),
});

// ---------- 用户 ----------
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    handle: text("handle").notNull().unique(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    tokenHash: text("token_hash").notNull(),
    tokenIssuedAt: integer("token_issued_at", { mode: "number" }).notNull().default(tsNow()),
    createdAt: integer("created_at", { mode: "number" }).notNull().default(tsNow()),
  },
  (t) => [index("idx_users_handle").on(t.handle)],
);

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
    ownerId: $id("owner_id")
      .notNull()
      .references(() => users.id),
    iconUrl: text("icon_url"),
    bannerUrl: text("banner_url"),
    inviteCode: text("invite_code"),
    memberCount: integer("member_count", { mode: "number" }).notNull().default(0),
    createdAt: integer("created_at", { mode: "number" }).notNull().default(tsNow()),
    updatedAt: integer("updated_at", { mode: "number" }).notNull().default(tsNow()),
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
    userId: $id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] })
      .notNull()
      .default("member"),
    joinedAt: integer("joined_at", { mode: "number" }).notNull().default(tsNow()),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.userId] }),
    index("idx_members_user").on(t.userId),
    index("idx_members_role").on(t.communityId, t.role),
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
    kind: text("kind", { enum: ["text", "announcement"] })
      .notNull()
      .default("text"),
    position: integer("position", { mode: "number" }).notNull().default(0),
    topic: text("topic"),
    isHelp: integer("is_help", { mode: "boolean" }).notNull().default(false),
    isShowcase: integer("is_showcase", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull().default(tsNow()),
    updatedAt: integer("updated_at", { mode: "number" }).notNull().default(tsNow()),
  },
  (t) => [index("idx_channels_community_position").on(t.communityId, asc(t.position))],
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
    authorId: $id("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    attachments: text("attachments"), // JSON: MessageAttachment[]
    mentions: text("mentions"), // JSON: string[] (userId list)
    shareCard: text("share_card"), // JSON: MessageShareCardRef | null
    resolution: text("resolution"), // JSON: HelpResolution | null
    replyToId: text("reply_to_id"), // FK 弱引用，避免循环删除复杂
    createdAt: integer("created_at", { mode: "number" }).notNull().default(tsNow()),
    updatedAt: integer("updated_at", { mode: "number" }),
  },
  (t) => [
    index("idx_messages_channel_time").on(t.channelId, desc(t.createdAt)),
    index("idx_messages_author_time").on(t.authorId, desc(t.createdAt)),
    index("idx_messages_resolution").on(t.channelId, desc(t.createdAt)),
  ],
);

// ---------- 分享（session / workflow） ----------
export const shares = sqliteTable(
  "shares",
  {
    id: text("id").primaryKey(),
    authorId: $id("author_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind", { enum: ["session", "workflow"] }).notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    coverUrl: text("cover_url"),
    r2Key: text("r2_key").notNull(),
    sizeBytes: integer("size_bytes", { mode: "number" }).notNull(),
    sha256: text("sha256"),
    manifest: text("manifest"), // JSON
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
    downloadCount: integer("download_count", { mode: "number" }).notNull().default(0),
    createdAt: integer("created_at", { mode: "number" }).notNull().default(tsNow()),
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
    userId: $id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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

// ---------- 行类型推断导出 ----------
export type AuthInviteCode = typeof authInviteCodes.$inferSelect;
export type NewAuthInviteCode = typeof authInviteCodes.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CommunityRow = typeof communities.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;
export type CommunityMemberRow = typeof communityMembers.$inferSelect;
export type NewCommunityMember = typeof communityMembers.$inferInsert;
export type ChannelRow = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type MessageRow = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type ShareRow = typeof shares.$inferSelect;
export type NewShare = typeof shares.$inferInsert;
export type ChannelReadStateRow = typeof channelReadStates.$inferSelect;
export type NewChannelReadState = typeof channelReadStates.$inferInsert;
