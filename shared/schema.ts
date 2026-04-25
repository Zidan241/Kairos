import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Timestamp helpers - using text for ISO strings in SQLite
const timestamps = {
  createdAt: text().notNull().default(sql`(datetime('now'))`),
  updatedAt: text().notNull().default(sql`(datetime('now'))`),
};

// Goals table - group tasks and habits for time analysis
export const goals = sqliteTable("goals", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  description: text(),
  isArchived: integer({ mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

// Tasks table - parent tasks and habits (habits are tasks with isHabit=true)
export const tasks = sqliteTable("tasks", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  description: text(),
  priority: text({ enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  dueDate: text(), // ISO string,
  isCompleted: integer({ mode: "boolean" }).notNull().default(false),
  completedAt: text(), // ISO string
  // Habit fields (only used when isHabit = true)
  isHabit: integer({ mode: "boolean" }).notNull().default(false),
  frequency: text({ enum: ["daily", "weekly", "custom"] }),
  customDays: text({ mode: "json" }).$type<number[]>(), // [0=Sun..6=Sat] for frequency=custom
  scheduleHistory: text({ mode: "json" }).$type<{ from: string; frequency: string; customDays: number[] | null }[]>(),
  estimateMinutes: integer(), // optional time estimate in minutes for habits
  endDate: text(), // YYYY-MM-DD — optional end of recurrence
  isArchived: integer({ mode: "boolean" }).notNull().default(false),
  goalId: integer().references(() => goals.id, { onDelete: "set null" }),
  ...timestamps,
});

// Subtasks table - contains the actual work items
export const subtasks = sqliteTable("subtasks", {
  id: integer().primaryKey({ autoIncrement: true }),
  parentTaskId: integer().references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  title: text().notNull(),
  description: text(),
  estimatedMinutes: integer(),
  status: text({ enum: ["pending", "active", "completed", "skipped"] }).notNull().default("pending"),
  activatedAt: text(), // ISO string — set when task becomes active, cleared on deactivation
  scheduledStartTime: integer(), // minutes from midnight (e.g., 480 = 8:00 AM)
  completedAt: text(), // ISO string
  scheduledDate: text(), // YYYY-MM-DD format
  goalId: integer().references(() => goals.id, { onDelete: "set null" }),
  overrideGoal: integer({ mode: "boolean" }).notNull().default(false),
  notes: text(), // Markdown notes content
  ...timestamps,
});

// Task schedules table - tracks when tasks are scheduled across different dates
export const taskScheduleHistory = sqliteTable("taskScheduleHistory", {
  id: integer().primaryKey({ autoIncrement: true }),
  subtaskId: integer().references(() => subtasks.id, { onDelete: "cascade" }).notNull(),
  scheduledDate: text(), // YYYY-MM-DD format
  createdAt: text().notNull().default(sql`(datetime('now'))`),
});

// Work sessions history table - tracks actual start/stop times for active subtasks
export const workSessionsHistory = sqliteTable("workSessionsHistory", {
  id: integer().primaryKey({ autoIncrement: true }),
  subtaskId: integer().references(() => subtasks.id, { onDelete: "cascade" }).notNull(),
  startedAt: text().notNull(), // ISO string — when the session began
  endedAt: text(), // ISO string — null while session is in progress
  durationMinutes: real(), // Computed on end: (endedAt - startedAt) in minutes
  date: text().notNull(), // YYYY-MM-DD — for efficient per-day queries
  ...timestamps,
});

// Activity buckets table (5-minute classifications)
export const activityBuckets = sqliteTable("activityBuckets", {
  id: integer().primaryKey({ autoIncrement: true }),
  subtaskId: integer().references(() => subtasks.id, { onDelete: "set null" }), // Link directly to subtasks
  date: text().notNull(), // YYYY-MM-DD
  startTime: text().notNull(), // ISO start time of bucket
  endTime: text().notNull(), // ISO end time of bucket
  category: text({ enum: ["focus", "prefocus", "distraction", "idle"] }).notNull(),
  dominantApp: text(),
  apps: text({ mode: "json" }), // JSON object { appName: seconds }
  workSessionApp: text(), // Primary app from work session analysis
  ...timestamps,
});

// Reusable validation constraints
const titleConstraints = z.string().min(1, "Title is required").max(200, "Title too long");
const descriptionConstraints = z.string().max(1000, "Description too long").nullable().optional();
const estimatedMinutesConstraints = z.number().min(5, "Must be at least 5 minutes").max(480, "Cannot exceed 8 hours").nullable().optional();
const scheduledStartTimeConstraints = z.number().min(0, "Invalid time").max(1439, "Invalid time").nullable().optional();
const dateTimeConstraints = z.string().datetime().nullable().optional();
const scheduledDateConstraints = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD").nullable().optional();
const frequencyConstraints = z.enum(["daily", "weekly", "custom"]);

// Insert schemas for validation - Drizzle will pick up table constraints automatically
export const insertTaskSchema = createInsertSchema(tasks, {
  dueDate: z.string().datetime().optional(),
  title: titleConstraints,
  description: descriptionConstraints,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertSubtaskSchema = createInsertSchema(subtasks, {
  title: titleConstraints,
  description: descriptionConstraints,
  estimatedMinutes: estimatedMinutesConstraints,
  scheduledStartTime: scheduledStartTimeConstraints,
  scheduledDate: scheduledDateConstraints,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  activatedAt: true,
});

export const insertHabitSchema = createInsertSchema(tasks, {
  title: titleConstraints,
  description: descriptionConstraints,
  frequency: frequencyConstraints,
  estimateMinutes: z.number().min(1).max(1440).nullable().optional(),
  customDays: z.array(z.number().min(0).max(6)).nullable().optional(),
  endDate: scheduledDateConstraints,
}).pick({
  title: true,
  description: true,
  frequency: true,
  estimateMinutes: true,
  customDays: true,
  endDate: true,
  goalId: true,
});

// Update schemas for editing - only editable fields
export const updateTaskSchema = createInsertSchema(tasks, {
  dueDate: dateTimeConstraints,
  title: titleConstraints,
  description: descriptionConstraints,
}).pick({
  title: true,
  description: true,
  priority: true,
  dueDate: true,
  isCompleted: true,
  goalId: true,
});

export const updateSubtaskSchema = createInsertSchema(subtasks, {
  title: titleConstraints,
  description: descriptionConstraints,
  estimatedMinutes: estimatedMinutesConstraints,
  scheduledStartTime: scheduledStartTimeConstraints,
  scheduledDate: scheduledDateConstraints,
}).pick({
  title: true,
  description: true,
  estimatedMinutes: true,
  status: true,
  scheduledStartTime: true,
  scheduledDate: true,
  goalId: true,
  overrideGoal: true,
});
// Note: activatedAt is managed internally by storage logic, not via API updates
export const insertActivityBucketSchema = createInsertSchema(activityBuckets, {
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGoalSchema = createInsertSchema(goals, {
  title: titleConstraints,
  description: descriptionConstraints,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateGoalSchema = insertGoalSchema.pick({
  title: true,
  description: true,
  isArchived: true,
}).partial();

export const updateHabitSchema = createInsertSchema(tasks, {
  title: titleConstraints,
  description: descriptionConstraints,
  frequency: frequencyConstraints,
  estimateMinutes: z.number().min(1).max(1440).nullable().optional(),
  customDays: z.array(z.number().min(0).max(6)).nullable().optional(),
  endDate: scheduledDateConstraints,
}).pick({
  title: true,
  description: true,
  frequency: true,
  customDays: true,
  estimateMinutes: true,
  endDate: true,
  isArchived: true,
  goalId: true,
}).partial();

// Type exports - Drizzle handles all the typing automatically!
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof insertTaskSchema._type;
export type UpdateTask = typeof updateTaskSchema._type;

export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = typeof insertSubtaskSchema._type;
export type UpdateSubtask = typeof updateSubtaskSchema._type;

export type TaskScheduleHistory = typeof taskScheduleHistory.$inferSelect;

export type WorkSessionHistory = typeof workSessionsHistory.$inferSelect;

export type ActivityBucket = typeof activityBuckets.$inferSelect;
export type InsertActivityBucket = typeof insertActivityBucketSchema._type;

export type Habit = Task; // A habit IS a task with isHabit=true
export type InsertHabit = typeof insertHabitSchema._type;
export type UpdateHabit = typeof updateHabitSchema._type;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof insertGoalSchema._type;
export type UpdateGoal = typeof updateGoalSchema._type;