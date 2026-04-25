CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`isArchived` integer DEFAULT false NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_subtasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parentTaskId` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`estimatedMinutes` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`activatedAt` text,
	`scheduledStartTime` integer,
	`completedAt` text,
	`scheduledDate` text,
	`goalId` integer,
	`notes` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`parentTaskId`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_subtasks`("id", "parentTaskId", "title", "description", "estimatedMinutes", "status", "activatedAt", "scheduledStartTime", "completedAt", "scheduledDate", "goalId", "notes", "createdAt", "updatedAt") SELECT "id", "parentTaskId", "title", "description", "estimatedMinutes", "status", "activatedAt", "scheduledStartTime", "completedAt", "scheduledDate", "goalId", "notes", "createdAt", "updatedAt" FROM `subtasks`;--> statement-breakpoint
DROP TABLE `subtasks`;--> statement-breakpoint
ALTER TABLE `__new_subtasks` RENAME TO `subtasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `tasks` ADD `isHabit` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `frequency` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `customDays` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `scheduleHistory` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `estimateMinutes` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `endDate` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `isArchived` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `goalId` integer REFERENCES goals(id);