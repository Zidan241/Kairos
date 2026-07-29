import {
  type Subtask, type InsertSubtask,
  type WorkSessionHistory,
  subtasks, workSessionsHistory, activityBuckets, taskScheduleHistory,
  type UpdateSubtask,
} from "@shared/schema";
import { type SubtaskMetrics, type ScheduleBreakdown } from "@shared/types";
import { db } from "../core/database";
import { eq, asc, inArray, isNull } from "drizzle-orm";
import { dateUtils } from "@shared/utils";
import { calculateTimeBreakdown, calculateAppUsage } from "./calculations";
import { groupBy } from "../utils/collections";

// =========================================================================
// Exports — CRUD
// =========================================================================

// Normalize overrideGoal/goalId pair:
// - goalId set → overrideGoal must be true
// - not overriding → goalId must be null (inherit from parent)
// - overrideGoal=true + goalId=null → "explicitly no goal"
function sanitizeGoalOverride<T extends Partial<Pick<InsertSubtask, 'goalId' | 'overrideGoal'>>>(data: T): T {
  if (data.goalId != null) {
    data.overrideGoal = true;
  } else if (!data.overrideGoal) {
    data.goalId = null;
  }
  return data;
}

// Transaction context type derived from the drizzle db (bun-sqlite is synchronous).
type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Pure read of the currently active subtask (no side effects).
function selectActive(exec: typeof db | DrizzleTx): Subtask | undefined {
  return (exec.select().from(subtasks).where(eq(subtasks.status, 'active')).limit(1).all() as Subtask[])[0];
}

export async function createSubtask(subtask: InsertSubtask): Promise<Subtask> {
  const normalized = sanitizeGoalOverride({ ...subtask });
  return db.transaction((tx) => {
    const result = tx.insert(subtasks).values(normalized).returning().all() as Subtask[];
    if (!result[0]) throw new Error("Failed to create subtask");
    if (result[0].scheduledDate) {
      tx.insert(taskScheduleHistory).values({ subtaskId: result[0].id, scheduledDate: result[0].scheduledDate }).run();
    }
    return result[0];
  });
}

// Handles status transitions: sets completedAt, manages activation/deactivation.
export async function updateSubtask(id: number, updates: Partial<UpdateSubtask>): Promise<Subtask | undefined> {
  const finalUpdates: Partial<UpdateSubtask> & { activatedAt?: string | null } = { ...sanitizeGoalOverride({ ...updates }) };
  let completedAt: string | null | undefined;
  const now = new Date().toISOString();

  if (updates.status === 'completed') {
    completedAt = now;
  } else if (updates.status) {
    completedAt = null;
  }

  return db.transaction((tx) => {
    if (finalUpdates.status === 'active') {
      activateTx(tx, id, now);
      finalUpdates.activatedAt = now;
    } else if (finalUpdates.status || finalUpdates.scheduledDate !== undefined) {
      const active = selectActive(tx);
      if (active?.id === id) {
        endCurrentWorkSessionTx(tx, now);
        finalUpdates.status = finalUpdates.status ?? 'pending';
        finalUpdates.activatedAt = null;
      }
    }

    const result = tx.update(subtasks)
      .set({ ...finalUpdates, updatedAt: now, completedAt })
      .where(eq(subtasks.id, id))
      .returning().all() as Subtask[];
    if (result[0] && finalUpdates.scheduledDate) {
      tx.insert(taskScheduleHistory).values({ subtaskId: id, scheduledDate: finalUpdates.scheduledDate }).run();
    }
    return result[0];
  });
}

export async function deleteSubtask(id: number): Promise<boolean> {
  return db.transaction((tx) => {
    const active = selectActive(tx);
    if (active?.id === id) {
      endCurrentWorkSessionTx(tx, new Date().toISOString());
    }
    const deleted = tx.delete(subtasks).where(eq(subtasks.id, id)).returning().all() as Subtask[];
    return deleted.length > 0;
  });
}

// =========================================================================
// Exports — Queries
// =========================================================================

// Returns the currently active subtask, atomically deactivating it if it's from a past day.
export async function getActiveSubtask(): Promise<Subtask | undefined> {
  const active = selectActive(db);
  if (!active) return undefined;

  const today = dateUtils.getTodayDate();
  if (active.scheduledDate && active.scheduledDate < today) {
    const now = new Date().toISOString();
    db.transaction((tx) => {
      endCurrentWorkSessionTx(tx, now);
      tx.update(subtasks).set({ status: 'pending', activatedAt: null, updatedAt: now }).where(eq(subtasks.id, active.id)).run();
    });
    return undefined;
  }

  return active;
}

export async function getScheduledSubtasks(date: string): Promise<Subtask[]> {
  return await db.select()
    .from(subtasks)
    .where(eq(subtasks.scheduledDate, date));
}

// Toggles between 'skipped' and 'pending'. Deactivates if currently active.
export async function toggleSkip(subtaskId: number): Promise<Subtask | undefined> {
  const now = new Date().toISOString();
  return db.transaction((tx) => {
    const current = (tx.select().from(subtasks).where(eq(subtasks.id, subtaskId)).limit(1).all() as Subtask[])[0];
    if (!current) return undefined;

    if (current.status === 'active') {
      endCurrentWorkSessionTx(tx, now);
    }

    const newStatus = current.status === 'skipped' ? 'pending' : 'skipped';
    const result = tx.update(subtasks)
      .set({ status: newStatus, activatedAt: null, updatedAt: now })
      .where(eq(subtasks.id, subtaskId))
      .returning().all() as Subtask[];
    return result[0];
  });
}

// =========================================================================
// Exports — Activation
// =========================================================================

export async function deactivate(): Promise<void> {
  db.transaction((tx) => endCurrentWorkSessionTx(tx, new Date().toISOString()));
}

// =========================================================================
// Exports — Work Sessions
// =========================================================================

export async function getWorkSessionsBySubtask(subtaskId: number): Promise<WorkSessionHistory[]> {
  return await db.select().from(workSessionsHistory)
    .where(eq(workSessionsHistory.subtaskId, subtaskId))
    .orderBy(asc(workSessionsHistory.startedAt));
}

export async function getWorkSessionsByDate(date: string): Promise<WorkSessionHistory[]> {
  return await db.select().from(workSessionsHistory)
    .where(eq(workSessionsHistory.date, date))
    .orderBy(asc(workSessionsHistory.startedAt));
}

// =========================================================================
// Exports — Metrics
// =========================================================================

// Full metrics: time breakdown + schedule breakdown + apps + work sessions.
export async function getSubtaskMetricsBulk(subtaskIds: number[]): Promise<Record<number, SubtaskMetrics>> {
  if (subtaskIds.length === 0) return {};

  // 1. Fetch activity buckets
  const activityRows = await db.select({
    subtaskId: activityBuckets.subtaskId,
    category: activityBuckets.category,
    startTime: activityBuckets.startTime,
    endTime: activityBuckets.endTime,
    apps: activityBuckets.apps,
    date: activityBuckets.date,
  })
    .from(activityBuckets)
    .where(inArray(activityBuckets.subtaskId, subtaskIds))
    .orderBy(activityBuckets.date, activityBuckets.startTime);

  // 2. Fetch work sessions
  const sessionRows = await db.select().from(workSessionsHistory)
    .where(inArray(workSessionsHistory.subtaskId, subtaskIds))
    .orderBy(asc(workSessionsHistory.startedAt));

  // 3. Group by subtask
  const bucketsBySubtask = groupBy(activityRows, r => r.subtaskId!);
  const sessionsBySubtask = groupBy(sessionRows, r => r.subtaskId);

  // 4. Build metrics per subtask
  const result: Record<number, SubtaskMetrics> = {};

  for (const subtaskId of subtaskIds) {
    const buckets = bucketsBySubtask.get(subtaskId) ?? [];
    const sessions = sessionsBySubtask.get(subtaskId) ?? [];

    // Per-date schedule breakdown
    const bucketsByDate = groupBy(buckets, b => b.date);
    const scheduleBreakdown: ScheduleBreakdown[] = [];

    for (const [date, dateBuckets] of bucketsByDate) {
      const dateSessions = sessions.filter(s => s.date === date);
      scheduleBreakdown.push({
        date,
        timeBreakdown: calculateTimeBreakdown(dateBuckets, dateSessions),
        apps: calculateAppUsage(dateBuckets),
      });
    }

    result[subtaskId] = {
      timeBreakdown: calculateTimeBreakdown(buckets, sessions),
      scheduleBreakdown: scheduleBreakdown.sort((a, b) => a.date.localeCompare(b.date)),
      workSessions: sessions,
    };
  }

  return result;
}

// =========================================================================
// Internal
// =========================================================================

// Ends previous work session, deactivates previous subtask, starts new session.
function activateTx(tx: DrizzleTx, subtaskId: number, now: string): void {
  endCurrentWorkSessionTx(tx, now);
  tx.update(subtasks).set({ status: 'pending', activatedAt: null, updatedAt: now }).where(eq(subtasks.status, 'active')).run();
  startWorkSessionTx(tx, subtaskId, now);
}

function startWorkSessionTx(tx: DrizzleTx, subtaskId: number, now: string): void {
  const today = dateUtils.getTodayDate();
  tx.insert(workSessionsHistory).values({
    subtaskId,
    startedAt: now,
    date: today,
  }).run();
}

// Closes any open work session by setting endedAt and computing duration.
function endCurrentWorkSessionTx(tx: DrizzleTx, now: string): void {
  const openSession = tx.select().from(workSessionsHistory)
    .where(isNull(workSessionsHistory.endedAt))
    .limit(1)
    .all();

  if (openSession[0]) {
    const startMs = new Date(openSession[0].startedAt).getTime();
    const endMs = new Date(now).getTime();
    const durationMinutes = Math.max(0, (endMs - startMs) / 60000);

    tx.update(workSessionsHistory)
      .set({ endedAt: now, durationMinutes, updatedAt: now })
      .where(eq(workSessionsHistory.id, openSession[0].id))
      .run();
  }
}
