CREATE TABLE `channel_overwrites` (
	`channel_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`allow` integer DEFAULT 0 NOT NULL,
	`deny` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`channel_id`, `target_type`, `target_id`),
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_overwrites_channel` ON `channel_overwrites` (`channel_id`);--> statement-breakpoint
CREATE TABLE `community_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text NOT NULL,
	`name` text NOT NULL,
	`color` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`permissions` integer DEFAULT 0 NOT NULL,
	`is_everyone` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_roles_community_position` ON `community_roles` (`community_id`,"position" desc);--> statement-breakpoint
CREATE INDEX `idx_roles_community_everyone` ON `community_roles` (`community_id`,`is_everyone`);--> statement-breakpoint
CREATE TABLE `member_roles` (
	`community_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`assigned_at` integer NOT NULL,
	PRIMARY KEY(`community_id`, `user_id`, `role_id`),
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `community_roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_member_roles_user` ON `member_roles` (`community_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_member_roles_role` ON `member_roles` (`role_id`);--> statement-breakpoint
DROP INDEX `idx_members_role`;--> statement-breakpoint
ALTER TABLE `community_members` DROP COLUMN `role`;
