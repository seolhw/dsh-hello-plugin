-- 数据回填：原 is_help 频道并入 kind（求助）
UPDATE `channels` SET `kind` = 'help' WHERE `is_help` = 1;--> statement-breakpoint
ALTER TABLE `channels` DROP COLUMN `is_help`;--> statement-breakpoint
ALTER TABLE `channels` DROP COLUMN `is_showcase`;