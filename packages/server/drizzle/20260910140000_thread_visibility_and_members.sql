ALTER TABLE `threads` ADD `visibility` text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE `threads` ADD `passcode_hash` text;--> statement-breakpoint
CREATE TABLE `thread_members` (
	`thread_id` text NOT NULL,
	`user_id` text NOT NULL,
	`added_by` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`thread_id`, `user_id`),
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_thread_members_user` ON `thread_members` (`user_id`);
