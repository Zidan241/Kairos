import {
  type Habit, type InsertHabit, type UpdateHabit, type Subtask,
  tasks, subtasks, workSessionsHistory, activityBuckets,
} from "@shared/schema";
import { type HabitSummary, type HabitDetails, type HabitDayStatus } from "@shared/types";
import { db } from "../core/database";
import { eq, and, inArray, sql, gte, lte } from "drizzle-orm";
import { dateUtils } from "@shared/utils";
import { calculateTimeBreakdown } from "./calculations";

// =========================================================================
// Types
// =========================================================================

type ScheduleEntry = { from: string; frequency: string; customDays: number[] | null };
type DateStatusMap = Map<string, { status: Subtask['status'] }>;

// =========================================================================
// Schedule Helpers
//
// Habits store a scheduleHistory JSON column: an append-only list of
// { from, frequency, customDays } entries. This lets isHabitDueOnDate
// check historical dates against the frequency that was active at that time,
// so frequency changes never corrupt past stats.
// =========================================================================

function parseScheduleHistory(habit: Habit): ScheduleEntry[] {
  const raw = habit.scheduleHistory as ScheduleEntry[] | null;
  if (raw && raw.length > 0) return raw;
  // Legacy habits without scheduleHistory — synthesize from current fields
  if (!habit.frequency) return [];
  return [{ from: dateUtils.formatDate(new Date(habit.createdAt)), frequency: habit.frequency, customDays: habit.customDays as number[] | null }];
}

// Binary-searchable since entries are sorted by `from` — but linear reverse walk
// is simpler and fast enough for the expected 1-3 entries per habit.
function getScheduleForDate(habit: Habit, dateStr: string): ScheduleEntry | null {
  const history = parseScheduleHistory(habit);
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].from <= dateStr) return history[i];
  }
  return null;
}

function isScheduledDay(frequency: string, customDays: number[] | null, date: Date): boolean {
  const dow = date.getDay();
  switch (frequency) {
    case 'daily': return true;
    case 'weekly': return dow === 0;
    case 'custom': return !customDays || customDays.length === 0 || customDays.includes(dow);
    default: return false;
  }
}

// =========================================================================
// Streak Helpers
//
// walkStreaks walks calendar days, checking if each scheduled day has a
// record (completed/skipped) or is a gap (missed). Up to 3 consecutive
// skipped days are tolerated within a streak.
// =========================================================================

const MAX_SKIP_TOLERANCE = 3;

// Walks forward from start to end. Returns both the streak touching the end
// date (current) and the longest streak in the range (best).
function walkStreaks(habit: Habit, dateMap: DateStatusMap, start: Date, end: Date): { current: number; best: number } {
  let best = 0;
  let current = 0;
  let consecutiveSkips = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    if (isHabitScheduledOnDate(habit, cursor)) {
      const status = dateMap.get(dateUtils.formatDate(cursor))?.status;
      if (status === 'completed') {
        consecutiveSkips = 0;
        if (++current > best) best = current;
      } else if (status === 'skipped') {
        if (++consecutiveSkips > MAX_SKIP_TOLERANCE) current = 0;
      } else {
        current = 0;
        consecutiveSkips = 0;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { current, best };
}

// =========================================================================
// Exports — Scheduling
// =========================================================================

// Cleared on habit create/update/delete so the next call re-evaluates.
let lastEnsuredDate: string | null = null;

// Internal: checks schedule only (endDate + frequency). Used for historical
// calculations where archived habits still need their past days evaluated.
function isHabitScheduledOnDate(habit: Habit, date: Date): boolean {
  const dateStr = dateUtils.formatDate(date);
  if (habit.endDate && dateStr > habit.endDate) return false;
  const schedule = getScheduleForDate(habit, dateStr);
  return schedule ? isScheduledDay(schedule.frequency, schedule.customDays, date) : false;
}

// Public: also excludes archived habits. Use for forward-looking logic
// (ensureHabitSubtasksForToday, isDueToday).
export function isHabitDueOnDate(habit: Habit, date: Date): boolean {
  if (habit.isArchived) return false;
  return isHabitScheduledOnDate(habit, date);
}

// Creates today's subtask for each due habit (if not already present).
// Missed days are never stored — they're derived from gaps at query time.
export async function ensureHabitSubtasksForToday(): Promise<void> {
  const today = new Date();
  const todayStr = dateUtils.formatDate(today);
  if (lastEnsuredDate === todayStr) return;

  const allHabits = await getHabits(false);
  if (allHabits.length === 0) { lastEnsuredDate = todayStr; return; }

  const existing = await db.select({ parentTaskId: subtasks.parentTaskId })
    .from(subtasks)
    .where(and(
      inArray(subtasks.parentTaskId, allHabits.map(h => h.id)),
      eq(subtasks.scheduledDate, todayStr),
    ));
  const hasToday = new Set(existing.map(r => r.parentTaskId));

  const toInsert = allHabits
    .filter(h => isHabitDueOnDate(h, today) && !hasToday.has(h.id))
    .map(h => ({
      parentTaskId: h.id,
      title: h.title,
      scheduledDate: todayStr,
      estimatedMinutes: h.estimateMinutes ?? null,
    }));

  if (toInsert.length > 0) await db.insert(subtasks).values(toInsert);
  lastEnsuredDate = todayStr;
}

// =========================================================================
// Exports — CRUD
// =========================================================================

export async function getHabits(includeArchived = false): Promise<Habit[]> {
  if (includeArchived) {
    return db.select().from(tasks)
      .where(eq(tasks.isHabit, true))
      .orderBy(tasks.createdAt) as Promise<Habit[]>;
  }
  return db.select().from(tasks)
    .where(and(eq(tasks.isHabit, true), eq(tasks.isArchived, false)))
    .orderBy(tasks.createdAt) as Promise<Habit[]>;
}

export async function getHabit(id: number): Promise<Habit | undefined> {
  const result = await db.select().from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.isHabit, true))) as Habit[];
  return result[0];
}

export async function createHabit(habit: InsertHabit): Promise<Habit> {
  lastEnsuredDate = null;
  const result = await db.insert(tasks).values({
    ...habit,
    priority: 'medium',
    isHabit: true,
    scheduleHistory: [{
      from: dateUtils.getTodayDate(),
      frequency: habit.frequency,
      customDays: habit.customDays ?? null,
    }],
  }).returning() as Habit[];
  if (!result[0]) throw new Error("Failed to create habit");
  return result[0];
}

export async function updateHabit(id: number, updates: Partial<UpdateHabit>): Promise<Habit | undefined> {
  const scheduleChanged = updates.frequency !== undefined || updates.customDays !== undefined;
  if (scheduleChanged || updates.endDate !== undefined || updates.isArchived !== undefined) {
    lastEnsuredDate = null;
  }

  // If schedule changed, append a new entry to scheduleHistory with the new frequency starting today.
  let scheduleHistory: ScheduleEntry[] | undefined;
  if (scheduleChanged) {
    const habit = await getHabit(id);
    if (habit) {
      scheduleHistory = [
        ...parseScheduleHistory(habit),
        {
          from: dateUtils.getTodayDate(),
          frequency: updates.frequency ?? habit.frequency!,
          customDays: (updates.customDays ?? habit.customDays) as number[] | null,
        },
      ];
    }
  }

  const result = await db.update(tasks)
    .set({ ...updates, updatedAt: new Date().toISOString(), ...(scheduleHistory && { scheduleHistory }) })
    .where(and(eq(tasks.id, id), eq(tasks.isHabit, true)))
    .returning() as Habit[];
  return result[0];
}

export async function deleteHabit(id: number): Promise<boolean> {
  lastEnsuredDate = null;
  const result = await db.delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.isHabit, true))) as any;
  return result.changes > 0;
}

// =========================================================================
// Exports — Summary
// =========================================================================

export async function getHabitsSummary(includeArchived = false, days = 30): Promise<HabitSummary[]> {
  const now = new Date();
  const today = dateUtils.getTodayDate();
  const startDate = days === 0 ? null : dateUtils.daysAgo(days - 1, now);
  const startStr = startDate ? dateUtils.formatDate(startDate) : null;

  // 1. Load all habits
  const allHabits = await getHabits(includeArchived);
  if (allHabits.length === 0) return [];

  const habitIds = allHabits.map(h => h.id);

  // 2. Fetch subtask records (last 365 days) and index by habit → date
  const lookbackDate = dateUtils.daysAgo(365, now);

  const allSubtaskData = await db.select({
    parentTaskId: subtasks.parentTaskId,
    scheduledDate: subtasks.scheduledDate,
    status: subtasks.status,
  }).from(subtasks)
    .where(and(
      inArray(subtasks.parentTaskId, habitIds),
      gte(subtasks.scheduledDate, dateUtils.formatDate(lookbackDate)),
      lte(subtasks.scheduledDate, today),
    ));

  // Index by habit → date for O(1) lookups
  const subtasksByHabit = new Map<number, DateStatusMap>();
  for (const id of habitIds) subtasksByHabit.set(id, new Map());
  for (const row of allSubtaskData) {
    if (!row.scheduledDate) continue;
    subtasksByHabit.get(row.parentTaskId)!.set(row.scheduledDate, row);
  }

  // 3. Fetch session minutes (scoped to days param for workedMinutes, history sparkline uses last 7 days from the map)
  const sessionRows = await db.select({
    parentTaskId: subtasks.parentTaskId,
    date: workSessionsHistory.date,
    minutes: sql<number>`COALESCE(SUM(${workSessionsHistory.durationMinutes}), 0)`,
  }).from(workSessionsHistory)
    .innerJoin(subtasks, eq(workSessionsHistory.subtaskId, subtasks.id))
    .where(and(
      inArray(subtasks.parentTaskId, habitIds),
      ...(startStr ? [gte(workSessionsHistory.date, startStr)] : []),
      lte(workSessionsHistory.date, today),
    ))
    .groupBy(subtasks.parentTaskId, workSessionsHistory.date);

  const minutesMap = new Map<number, Map<string, number>>();
  for (const id of habitIds) minutesMap.set(id, new Map());
  for (const row of sessionRows) {
    minutesMap.get(row.parentTaskId)!.set(row.date, Math.round(row.minutes));
  }

  // 4. Build summary for each habit
  return allHabits.map(habit => {
    const dateMap = subtasksByHabit.get(habit.id)!;
    const habitMinutes = minutesMap.get(habit.id)!;

    // 4a. Completion rate — walk calendar days within the `days` window
    //     so missed days (due but no subtask record) are correctly counted.
    let totalCompleted = 0;
    let totalDue = 0;
    const rateStart = startDate ?? new Date(habit.createdAt);
    const rateCursor = new Date(rateStart);
    while (rateCursor <= now) {
      if (isHabitScheduledOnDate(habit, rateCursor)) {
        totalDue++;
        const dStr = dateUtils.formatDate(rateCursor);
        if (dateMap.get(dStr)?.status === 'completed') totalCompleted++;
      }
      rateCursor.setDate(rateCursor.getDate() + 1);
    }

    // 4b. History: last 7 calendar days — includes missed days (due but no record)
    const history: HabitSummary['history'] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (!isHabitScheduledOnDate(habit, d)) continue;
      const dStr = dateUtils.formatDate(d);
      const entry = dateMap.get(dStr);
      const status: HabitDayStatus = entry
        ? (entry.status as HabitDayStatus)
        : (dStr === today ? 'pending' : 'missed');
      history.push({
        date: dStr,
        status,
        minutes: habitMinutes.get(dStr) ?? 0,
      });
    }

    // 4c. Total worked minutes across all fetched days
    let workedMinutes = 0;
    habitMinutes.forEach((mins) => { workedMinutes += mins; });

    return {
      ...habit,
      workedMinutes,
      streak: walkStreaks(habit, dateMap, lookbackDate, now).current,
      isDueToday: isHabitDueOnDate(habit, now),
      completionRate: { done: totalCompleted, due: totalDue },
      history,
    };
  });
}

// =========================================================================
// Exports — Details
// =========================================================================

export async function getHabitDetailsWithMetrics(habitId: number, days: number = 30): Promise<HabitDetails | undefined> {
  // 1. Load habit
  const habit = await getHabit(habitId);
  if (!habit) return undefined;

  const today = new Date();
  const todayStr = dateUtils.formatDate(today);
  const startDate = days === 0 ? new Date(habit.createdAt) : dateUtils.daysAgo(days - 1, today);
  const startStr = dateUtils.formatDate(startDate);

  // 2. Fetch subtask records in range and index by date
  const habitSubtasks = await db.select().from(subtasks)
    .where(and(
      eq(subtasks.parentTaskId, habitId),
      gte(subtasks.scheduledDate, startStr),
      lte(subtasks.scheduledDate, todayStr),
    ));

  const dateMap: DateStatusMap = new Map();
  const subtaskIdMap = new Map<string, number>();
  for (const st of habitSubtasks) {
    if (!st.scheduledDate) continue;
    dateMap.set(st.scheduledDate, st);
    subtaskIdMap.set(st.scheduledDate, st.id);
  }

  // 3. Calendar walk: every scheduled day gets a status (done/skipped/missed/pending)
  const perDay: Array<{ date: string; status: HabitDayStatus; subtaskId: number | null }> = [];

  const cursor = new Date(startDate);
  while (cursor <= today) {
    if (isHabitScheduledOnDate(habit, cursor)) {
      const dStr = dateUtils.formatDate(cursor);
      const status = dateMap.get(dStr)?.status;
      const isToday = dStr === todayStr;
      let dayStatus: HabitDayStatus;
      if (status === 'completed') { dayStatus = 'completed'; }
      else if (status === 'skipped') { dayStatus = 'skipped'; }
      else if (isToday) { dayStatus = 'pending'; }
      else { dayStatus = 'missed'; }
      perDay.push({ date: dStr, status: dayStatus, subtaskId: subtaskIdMap.get(dStr) ?? null });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  perDay.reverse(); // Newest first

  const { best: bestStreak } = walkStreaks(habit, dateMap, startDate, today);

  // 4. Fetch activity data and compute metrics
  const subtaskIds = perDay.map(d => d.subtaskId).filter((id): id is number => id !== null);
  let timeBreakdown = calculateTimeBreakdown([]);
  const trackedBySubtask = new Map<number, number>();

  if (subtaskIds.length > 0) {
    // All buckets for aggregate breakdown (sorted for correct streak calculation)
    const allBuckets = await db.select({
      subtaskId: activityBuckets.subtaskId,
      category: activityBuckets.category,
      startTime: activityBuckets.startTime,
      endTime: activityBuckets.endTime,
    }).from(activityBuckets)
      .where(inArray(activityBuckets.subtaskId, subtaskIds))
      .orderBy(activityBuckets.startTime);

    // Total worked minutes from work sessions (for timeBreakdown)
    const sessionRows = await db.select({
      total: sql<number>`COALESCE(SUM(${workSessionsHistory.durationMinutes}), 0)`,
    }).from(workSessionsHistory)
      .where(inArray(workSessionsHistory.subtaskId, subtaskIds));
    const totalWorked = Math.round(sessionRows[0]?.total ?? 0);

    timeBreakdown = calculateTimeBreakdown(allBuckets, totalWorked);

    // Per-subtask tracked minutes from AW buckets
    for (const b of allBuckets) {
      if (!b.subtaskId) continue;
      const mins = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000;
      trackedBySubtask.set(b.subtaskId, (trackedBySubtask.get(b.subtaskId) ?? 0) + mins);
    }
  }

  return {
    habit,
    bestStreak,
    timeBreakdown,
    perDay: perDay.map(d => ({
      date: d.date,
      status: d.status,
      trackedMinutes: d.subtaskId ? Math.round(trackedBySubtask.get(d.subtaskId) ?? 0) : 0,
    })),
  };
}
