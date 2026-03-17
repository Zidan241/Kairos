CREATE TABLE `workSessionsHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subtaskId` integer NOT NULL,
	`startedAt` text NOT NULL,
	`endedAt` text,
	`durationMinutes` real,
	`date` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`subtaskId`) REFERENCES `subtasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `subtasks` ADD `activatedAt` text;