CREATE TABLE `activityBuckets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subtaskId` integer,
	`date` text NOT NULL,
	`startTime` text NOT NULL,
	`endTime` text NOT NULL,
	`category` text NOT NULL,
	`dominantApp` text,
	`apps` text,
	`workSessionApp` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`subtaskId`) REFERENCES `subtasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subtasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parentTaskId` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`estimatedMinutes` integer DEFAULT 60 NOT NULL,
	`isCompleted` integer DEFAULT false NOT NULL,
	`isActive` integer DEFAULT false NOT NULL,
	`scheduledStartTime` integer,
	`completedAt` text,
	`scheduledDate` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`parentTaskId`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `taskScheduleHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subtaskId` integer NOT NULL,
	`scheduledDate` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`subtaskId`) REFERENCES `subtasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`dueDate` text,
	`isCompleted` integer DEFAULT false NOT NULL,
	`completedAt` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL
);
