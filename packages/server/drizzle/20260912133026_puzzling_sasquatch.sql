CREATE TABLE `message_reactions` (
	`message_id` text NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`message_id`, `user_id`, `emoji`),
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_reactions_message` ON `message_reactions` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_message_reactions_user` ON `message_reactions` (`user_id`);