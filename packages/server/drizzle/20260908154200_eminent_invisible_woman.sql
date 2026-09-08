CREATE TABLE `channel_read_states` (
	`user_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`last_read_message_id` text,
	`last_read_at` integer,
	`unread_mentions` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `channel_id`),
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_readstate_user` ON `channel_read_states` (`user_id`);--> statement-breakpoint
CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'text' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`topic` text,
	`is_help` integer NOT NULL,
	`is_showcase` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_channels_community_position` ON `channels` (`community_id`,"position" asc);--> statement-breakpoint
CREATE TABLE `communities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`description` text,
	`privacy` text DEFAULT 'public' NOT NULL,
	`owner_id` text NOT NULL,
	`icon_url` text,
	`banner_url` text,
	`invite_code` text,
	`member_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `communities_slug_unique` ON `communities` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_communities_owner` ON `communities` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_communities_privacy_created` ON `communities` (`privacy`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_communities_member_count` ON `communities` ("member_count" desc);--> statement-breakpoint
CREATE TABLE `community_members` (
	`community_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`community_id`, `user_id`),
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_members_user` ON `community_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_members_role` ON `community_members` (`community_id`,`role`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`community_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`attachments` text,
	`mentions` text,
	`share_card` text,
	`resolution` text,
	`reply_to_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_messages_channel_time` ON `messages` (`channel_id`,"created_at" desc);--> statement-breakpoint
CREATE INDEX `idx_messages_author_time` ON `messages` (`author_id`,"created_at" desc);--> statement-breakpoint
CREATE INDEX `idx_messages_resolution` ON `messages` (`channel_id`,"created_at" desc);--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`cover_url` text,
	`r2_key` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text,
	`manifest` text,
	`is_public` integer NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_shares_kind_time` ON `shares` (`kind`,"created_at" desc);--> statement-breakpoint
CREATE INDEX `idx_shares_author_time` ON `shares` (`author_id`,"created_at" desc);