CREATE INDEX IF NOT EXISTS `idx_activityBuckets_date` ON `activityBuckets` (`date`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_activityBuckets_subtaskId` ON `activityBuckets` (`subtaskId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_activityBuckets_subtask_date` ON `activityBuckets` (`subtaskId`,`date`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_activityBuckets_startTime` ON `activityBuckets` (`startTime`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_subtasks_scheduledDate` ON `subtasks` (`scheduledDate`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_subtasks_parentTaskId` ON `subtasks` (`parentTaskId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_subtasks_status` ON `subtasks` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_subtasks_goalId` ON `subtasks` (`goalId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_workSessionsHistory_subtaskId` ON `workSessionsHistory` (`subtaskId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_workSessionsHistory_date` ON `workSessionsHistory` (`date`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_tasks_isHabit` ON `tasks` (`isHabit`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_tasks_goalId` ON `tasks` (`goalId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_taskScheduleHistory_subtaskId` ON `taskScheduleHistory` (`subtaskId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_taskScheduleHistory_scheduledDate` ON `taskScheduleHistory` (`scheduledDate`);
