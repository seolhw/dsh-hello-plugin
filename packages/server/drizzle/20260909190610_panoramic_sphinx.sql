CREATE TABLE `community_bans` (
	`community_id` text NOT NULL,
	`user_id` text NOT NULL,
	`banned_by` text NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`community_id`, `user_id`),
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_community_bans_time` ON `community_bans` (`community_id`,"created_at" desc);--> statement-breakpoint
CREATE TABLE `thread_read_states` (
	`user_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`last_read_message_id` text,
	`last_read_at` integer,
	PRIMARY KEY(`user_id`, `thread_id`),
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_thread_readstate_user` ON `thread_read_states` (`user_id`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`name` text NOT NULL,
	`starter_message_id` text,
	`created_by` text NOT NULL,
	`creator_handle` text NOT NULL,
	`creator_display_name` text,
	`creator_avatar_url` text,
	`starter_snippet` text,
	`status` text DEFAULT 'active' NOT NULL,
	`message_count` integer DEFAULT 0 NOT NULL,
	`last_message_id` text,
	`last_activity_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_threads_channel_status` ON `threads` (`channel_id`,`status`,"last_activity_at" desc);--> statement-breakpoint
CREATE INDEX `idx_threads_community_status` ON `threads` (`community_id`,`status`,"last_activity_at" desc);--> statement-breakpoint
DROP INDEX `idx_messages_resolution`;--> statement-breakpoint
ALTER TABLE `messages` ADD `thread_id` text REFERENCES threads(id);--> statement-breakpoint
CREATE INDEX `idx_messages_thread_time` ON `messages` (`thread_id`,"created_at" desc);--> statement-breakpoint
ALTER TABLE `messages` DROP COLUMN `resolution`;