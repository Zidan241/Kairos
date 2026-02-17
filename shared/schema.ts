import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Timestamp helpers - using text for ISO strings in SQLite
const timestamps = {
  createdAt: text().notNull().default(sql`(datetime('now'))`),
  updatedAt: text().notNull().default(sql`(datetime('now'))`),
};

// Tasks table - now for parent tasks only
export const tasks = sqliteTable("tasks", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  description: text(),
  priority: text({ enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  dueDate: text(), // ISO string,
  isCompleted: integer({ mode: "boolean" }).notNull().default(false),
  completedAt: text(), // ISO string
  ...timestamps,
});

// Subtasks table - contains the actual work items
export const subtasks = sqliteTable("subtasks", {
  id: integer().primaryKey({ autoIncrement: true }),
  parentTaskId: integer().references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  title: text().notNull(),
  description: text(),
  estimatedMinutes: integer().notNull().default(60), // Changed from 30 to 60 to match schema
  isCompleted: integer({ mode: "boolean" }).notNull().default(false),
  isActive: integer({ mode: "boolean" }).notNull().default(false),
  scheduledStartTime: integer(), // minutes from midnight (e.g., 480 = 8:00 AM)
  completedAt: text(), // ISO string
  scheduledDate: text(), // YYYY-MM-DD format
  ...timestamps,
});

// Task schedules table - tracks when tasks are scheduled across different dates
export const taskScheduleHistory = sqliteTable("taskScheduleHistory", {
  id: integer().primaryKey({ autoIncrement: true }),
  subtaskId: integer().references(() => subtasks.id, { onDelete: "cascade" }).notNull(),
  scheduledDate: text(), // YYYY-MM-DD format
  createdAt: text().notNull().default(sql`(datetime('now'))`),
});

// Activity buckets table (5-minute classifications)
export const activityBuckets = sqliteTable("activityBuckets", {
  id: integer().primaryKey({ autoIncrement: true }),
  subtaskId: integer().references(() => subtasks.id, { onDelete: "cascade" }), // Link directly to subtasks
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
const estimatedMinutesConstraints = z.number().min(5, "Must be at least 5 minutes").max(480, "Cannot exceed 8 hours");
const scheduledStartTimeConstraints = z.number().min(0, "Invalid time").max(1439, "Invalid time").nullable().optional();
const dateTimeConstraints = z.string().datetime().nullable().optional();
const scheduledDateConstraints = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD").nullable().optional();

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
  isCompleted: true,
  isActive: true,
  scheduledStartTime: true,
  scheduledDate: true,
});
export const insertActivityBucketSchema = createInsertSchema(activityBuckets, {
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports - Drizzle handles all the typing automatically!
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof insertTaskSchema._type;
export type UpdateTask = typeof updateTaskSchema._type;

export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = typeof insertSubtaskSchema._type;
export type UpdateSubtask = typeof updateSubtaskSchema._type;

export type TaskScheduleHistory = typeof taskScheduleHistory.$inferSelect;

export type ActivityBucket = typeof activityBuckets.$inferSelect;
export type InsertActivityBucket = typeof insertActivityBucketSchema._type;