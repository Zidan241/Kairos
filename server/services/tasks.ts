import {
  type Task, type InsertTask, type UpdateTask,
  tasks, subtasks, goals,
} from "@shared/schema";
import { type TaskWithMetrics } from "@shared/types";
import { db } from "../core/database";
import { eq, desc, asc, inArray, sql } from "drizzle-orm";
import { dateUtils } from "@shared/utils";
import { buildTaskHierarchyWithMetrics } from "../utils/taskMappers";
import { getActiveSubtask, deactivate, getScheduledSubtasks, getSubtaskMetricsBulk } from "./subtasks";
import { ensureHabitSubtasksForToday } from "./habits";

// =========================================================================
// Exports — CRUD
// =========================================================================

export async function createTask(task: InsertTask): Promise<Task> {
  const result = await db.insert(tasks).values(task).returning() as Task[];
  if (!result[0]) throw new Error("Failed to create task");
  return result[0];
}

// Sets completedAt timestamp on completion, clears it on un-completion.
export async function updateTask(id: number, updates: Partial<UpdateTask>): Promise<Task | undefined> {
  const finalUpdates: Partial<UpdateTask> & { completedAt?: string | null } = { ...updates };
  if (updates.isCompleted === true) {
    finalUpdates.completedAt = new Date().toISOString();
  } else if (updates.isCompleted === false) {
    finalUpdates.completedAt = null;
  }
  const result = await db.update(tasks)
    .set({ ...finalUpdates, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id))
    .returning() as Task[];
  return result[0];
}

// Ends any active work session before deleting (cascade deletes subtasks).
export async function deleteTask(id: number): Promise<boolean> {
  const active = await getActiveSubtask();
  if (active && active.parentTaskId === id) {
    await deactivate();
  }
  const result = await db.delete(tasks).where(eq(tasks.id, id)) as any;
  return result.changes > 0;
}

// =========================================================================
// Exports — Queries
// =========================================================================

export async function getTasksWithMetrics(sortBy: string = 'creation', sortOrder: string = 'asc'): Promise<TaskWithMetrics[]> {
  const today = dateUtils.getTodayDate();

  let taskOrderBy;
  const priorityWeight = sql`CASE ${tasks.priority}
    WHEN 'urgent' THEN 4
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 1
    ELSE 0 END`;
  const daysUntilDue = sql`CASE 
    WHEN ${tasks.dueDate} IS NULL THEN 99999
    ELSE CAST((julianday(${tasks.dueDate}) - julianday('now')) AS INTEGER)
    END`;

  switch (sortBy) {
    case 'urgency':
      if (sortOrder === 'desc') {
        taskOrderBy = [desc(priorityWeight), asc(daysUntilDue)];
      } else {
        taskOrderBy = [asc(priorityWeight), desc(daysUntilDue)];
      }
      break;
    case 'alphabetical':
      if (sortOrder === 'desc') {
        taskOrderBy = desc(tasks.title);
      } else {
        taskOrderBy = asc(tasks.title);
      }
      break;
    case 'creation':
    default:
      if (sortOrder === 'desc') {
        taskOrderBy = desc(tasks.createdAt);
      } else {
        taskOrderBy = asc(tasks.createdAt);
      }
      break;
  }

  const allTasks = await db.select().from(tasks)
    .where(eq(tasks.isHabit, false))
    .orderBy(...(Array.isArray(taskOrderBy) ? taskOrderBy : [taskOrderBy]));
  const taskIds = allTasks.map(t => t.id);
  const allSubtasks = taskIds.length > 0
    ? await db.select().from(subtasks)
        .where(inArray(subtasks.parentTaskId, taskIds))
        .orderBy(subtasks.createdAt)
    : [];

  const subtaskIds = allSubtasks.map(s => s.id);
  const subtaskMetrics = await getSubtaskMetricsBulk(subtaskIds);

  const goalsMap = await buildGoalsMap([...allTasks, ...allSubtasks]);

  return buildTaskHierarchyWithMetrics(allTasks, allSubtasks, subtaskMetrics, goalsMap, today);
}

// Ensures habit subtasks exist, then fetches today's scheduled subtasks with metrics.
export async function getDayPlanWithMetrics(): Promise<TaskWithMetrics[]> {
  const today = dateUtils.getTodayDate();

  await ensureHabitSubtasksForToday();

  const scheduledSubtasks = await getScheduledSubtasks(today);

  const taskIds = Array.from(new Set(scheduledSubtasks.map(s => s.parentTaskId)));

  if (taskIds.length === 0) return [];

  const parentTasks = await db.select().from(tasks)
    .where(inArray(tasks.id, taskIds));

  const subtaskIds = scheduledSubtasks.map(s => s.id);
  const subtaskMetrics = await getSubtaskMetricsBulk(subtaskIds);

  const goalsMap = await buildGoalsMap([...parentTasks, ...scheduledSubtasks]);

  return buildTaskHierarchyWithMetrics(parentTasks, scheduledSubtasks, subtaskMetrics, goalsMap, today);
}

// =========================================================================
// Internal helpers
// =========================================================================

async function buildGoalsMap(items: { goalId: number | null }[]): Promise<Map<number, string>> {
  const goalIds = Array.from(new Set(items.map(t => t.goalId).filter(Boolean))) as number[];
  if (goalIds.length === 0) return new Map();
  const rows = await db.select({ id: goals.id, title: goals.title }).from(goals).where(inArray(goals.id, goalIds));
  return new Map(rows.map(g => [g.id, g.title]));
}
