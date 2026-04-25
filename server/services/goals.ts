import {
  type Goal, type InsertGoal, type UpdateGoal,
  goals, tasks, subtasks, workSessionsHistory, activityBuckets,
} from "@shared/schema";
import { type GoalSummary, type GoalDetails } from "@shared/types";
import { db } from "../core/database";
import { eq, and, inArray, sql, or, gte, lte } from "drizzle-orm";
import { calculateTimeBreakdown } from "./calculations";
import { groupBy } from "../utils/collections";
import { dateUtils } from "@shared/utils";

// Subtask-level override takes precedence over parent task's goalId.
const effectiveGoalId = sql<number>`CASE WHEN ${subtasks.overrideGoal} = 1 THEN ${subtasks.goalId} ELSE ${tasks.goalId} END`;
const effectiveGoalWhere = (goalIds: number[]) =>
  or(
    and(eq(subtasks.overrideGoal, true), inArray(subtasks.goalId, goalIds)),
    and(eq(subtasks.overrideGoal, false), inArray(tasks.goalId, goalIds)),
  );

// =========================================================================
// Exports — CRUD
// =========================================================================

export async function getGoals(includeArchived = false): Promise<Goal[]> {
  return db.select().from(goals)
    .where(includeArchived ? undefined : eq(goals.isArchived, false))
    .orderBy(goals.createdAt) as Promise<Goal[]>;
}

export async function getGoal(id: number): Promise<Goal | undefined> {
  const result = await db.select().from(goals).where(eq(goals.id, id));
  return result[0];
}

export async function createGoal(goal: InsertGoal): Promise<Goal> {
  const result = await db.insert(goals).values(goal).returning() as Goal[];
  if (!result[0]) throw new Error("Failed to create goal");
  return result[0];
}

export async function updateGoal(id: number, updates: Partial<UpdateGoal>): Promise<Goal | undefined> {
  const result = await db.update(goals)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(eq(goals.id, id))
    .returning() as Goal[];
  return result[0];
}

export async function deleteGoal(id: number): Promise<boolean> {
  const result = await db.delete(goals).where(eq(goals.id, id)) as any;
  return result.changes > 0;
}

// =========================================================================
// Exports — Summary
// =========================================================================

export async function getGoalsSummary(includeArchived = false): Promise<GoalSummary[]> {
  const allGoals = await getGoals(includeArchived);
  if (allGoals.length === 0) return [];

  const goalIds = allGoals.map(g => g.id);

  // 1. Tasks linked to these goals (for habit count)
  const allLinkedTasks = await db.select().from(tasks)
    .where(inArray(tasks.goalId, goalIds));

  const tasksByGoal = groupBy(allLinkedTasks, t => t.goalId!);

  // 2. Subtask counts per goal (non-habit only)
  const subtaskCountRows = await db.select({
    goalId: effectiveGoalId,
    total: sql<number>`COUNT(*)`,
    completed: sql<number>`SUM(CASE WHEN ${subtasks.status} = 'completed' THEN 1 ELSE 0 END)`,
  }).from(subtasks)
    .innerJoin(tasks, eq(subtasks.parentTaskId, tasks.id))
    .where(and(eq(tasks.isHabit, false), effectiveGoalWhere(goalIds)))
    .groupBy(effectiveGoalId);

  const subtaskCountsByGoal = new Map<number, { total: number; completed: number }>();
  for (const row of subtaskCountRows) {
    if (row.goalId) subtaskCountsByGoal.set(row.goalId, { total: row.total, completed: row.completed });
  }

  // 3. Worked minutes per goal
  const minutesRows = await db.select({
    goalId: effectiveGoalId,
    total: sql<number>`COALESCE(SUM(${workSessionsHistory.durationMinutes}), 0)`,
  }).from(workSessionsHistory)
    .innerJoin(subtasks, eq(workSessionsHistory.subtaskId, subtasks.id))
    .innerJoin(tasks, eq(subtasks.parentTaskId, tasks.id))
    .where(effectiveGoalWhere(goalIds))
    .groupBy(effectiveGoalId);

  const minutesByGoal = new Map<number, number>();
  for (const row of minutesRows) {
    if (row.goalId) minutesByGoal.set(row.goalId, Math.round(row.total));
  }

  // 4. Build summary
  return allGoals.map(goal => {
    const linked = tasksByGoal.get(goal.id) ?? [];
    const sc = subtaskCountsByGoal.get(goal.id) ?? { total: 0, completed: 0 };
    return {
      ...goal,
      stats: {
        totalMinutes: minutesByGoal.get(goal.id) ?? 0,
        subtaskCount: sc.total,
        completedSubtaskCount: sc.completed,
        habitCount: linked.filter(t => t.isHabit).length,
      },
    };
  });
}

// =========================================================================
// Exports — Details
// =========================================================================

export async function getGoalDetailsWithMetrics(goalId: number, days: number = 30): Promise<GoalDetails | undefined> {
  const goal = await getGoal(goalId);
  if (!goal) return undefined;

  const today = new Date();
  const todayStr = dateUtils.formatDate(today);
  const startDate = days === 0 ? new Date(goal.createdAt) : dateUtils.daysAgo(days - 1, today);
  const startStr = dateUtils.formatDate(startDate);

  // 1. Linked habits (task-level)
  const linkedHabits = await db.select().from(tasks)
    .where(and(eq(tasks.goalId, goalId), eq(tasks.isHabit, true)));

  // 2. All subtasks effectively linked to this goal (inherited + overridden)
  const allGoalSubtasks = await db.select({
    id: subtasks.id,
    title: subtasks.title,
    parentTaskTitle: tasks.title,
    parentTaskId: subtasks.parentTaskId,
    status: subtasks.status,
    isHabit: tasks.isHabit,
  }).from(subtasks)
    .innerJoin(tasks, eq(subtasks.parentTaskId, tasks.id))
    .where(effectiveGoalWhere([goalId]));

  const subIds = allGoalSubtasks.map(r => r.id);

  // 3. Worked minutes per subtask (within date range)
  const minutesBySubtask = new Map<number, number>();
  if (subIds.length > 0) {
    const rows = await db.select({
      subtaskId: workSessionsHistory.subtaskId,
      total: sql<number>`COALESCE(SUM(${workSessionsHistory.durationMinutes}), 0)`,
    }).from(workSessionsHistory)
      .where(and(
        inArray(workSessionsHistory.subtaskId, subIds),
        gte(workSessionsHistory.date, startStr),
        lte(workSessionsHistory.date, todayStr),
      ))
      .groupBy(workSessionsHistory.subtaskId);

    for (const row of rows) {
      if (row.subtaskId) minutesBySubtask.set(row.subtaskId, Math.round(row.total));
    }
  }

  // 4. Activity buckets → time breakdown (within date range)
  const totalWorked = [...minutesBySubtask.values()].reduce((sum, m) => sum + m, 0);
  const buckets = subIds.length > 0
    ? await db.select({
        category: activityBuckets.category,
        startTime: activityBuckets.startTime,
        endTime: activityBuckets.endTime,
      }).from(activityBuckets)
        .where(and(
          inArray(activityBuckets.subtaskId, subIds),
          gte(activityBuckets.date, startStr),
          lte(activityBuckets.date, todayStr),
        ))
    : [];
  const timeBreakdown = calculateTimeBreakdown(buckets, totalWorked);

  // 5. Split subtasks into task vs habit, aggregate habit minutes by parent
  const taskSubtasks = allGoalSubtasks.filter(s => !s.isHabit);
  const minutesByHabitTask = new Map<number, number>();
  for (const s of allGoalSubtasks.filter(s => s.isHabit)) {
    minutesByHabitTask.set(s.parentTaskId, (minutesByHabitTask.get(s.parentTaskId) ?? 0) + (minutesBySubtask.get(s.id) ?? 0));
  }

  return {
    goal,
    subtasks: taskSubtasks.map(s => ({
      id: s.id,
      title: s.title,
      isCompleted: s.status === 'completed',
      minutes: minutesBySubtask.get(s.id) ?? 0,
      parentTaskTitle: s.parentTaskTitle,
    })),
    habits: linkedHabits.map(h => ({
      id: h.id,
      title: h.title,
      minutes: minutesByHabitTask.get(h.id) ?? 0,
    })),
    timeBreakdown,
  };
}
