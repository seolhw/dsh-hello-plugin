UPDATE `shares` SET `kind` = 'channel-snapshot' WHERE `kind` = 'session';--> statement-breakpoint
UPDATE `shares` SET `kind` = 'agent-session' WHERE `kind` = 'workflow';
