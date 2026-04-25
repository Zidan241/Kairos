import { type TaskWithMetrics, type SubtaskWithMetrics } from "@shared/types";
import { dateUtils } from "@shared/utils";

export interface TaskProgress {
  progress: number;
  workedMinutes: number;
  totalMinutes: number;
}

/** Get today's date as YYYY-MM-DD (local timezone, matches server). */
export function getTodayDate(): string {
  return dateUtils.getTodayDate();
}

/** Sum work session durations for a subtask, optionally filtered to a date. */
export function getSessionMinutes(subtask: SubtaskWithMetrics, date?: string): number {
  return (subtask.metrics?.workSessions ?? [])
    .filter(s => !date || s.date === date)
    .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
}

// ---- Core weighted-progress algorithm ----

/** Compute weighted progress for a task given a per-subtask "worked minutes" accessor. */
function computeTaskProgress(
  task: TaskWithMetrics,
  getWorked: (sub: SubtaskWithMetrics) => number,
): TaskProgress {
  const subtasks = task.subtasks ?? [];
  if (subtasks.length === 0) {
    return { progress: task.isCompleted ? 100 : 0, workedMinutes: 0, totalMinutes: 0 };
  }

  let totalWorked = 0;
  let totalEstimated = 0;
  let weightedProgress = 0;

  for (const subtask of subtasks) {
    const worked = getWorked(subtask);
    const est = subtask.estimatedMinutes ?? 0;
    totalWorked += worked;
    totalEstimated += est;

    if (subtask.status === 'completed') {
      weightedProgress += est * 100;
    } else {
      weightedProgress += est * (est > 0 ? Math.min((worked / est) * 100, 90) : 0);
    }
  }

  return {
    progress: task.isCompleted ? 100 : totalEstimated > 0 ? weightedProgress / totalEstimated : 0,
    workedMinutes: totalWorked,
    totalMinutes: totalEstimated,
  };
}

/** Aggregate progress across multiple tasks. */
function aggregateProgress(tasks: TaskWithMetrics[], perTask: (t: TaskWithMetrics) => TaskProgress): TaskProgress {
  if (tasks.length === 0) return { progress: 0, workedMinutes: 0, totalMinutes: 0 };

  let wp = 0, worked = 0, estimated = 0;
  for (const task of tasks) {
    const p = perTask(task);
    wp += p.totalMinutes * p.progress;
    worked += p.workedMinutes;
    estimated += p.totalMinutes;
  }
  return {
    progress: estimated > 0 ? wp / estimated : 0,
    workedMinutes: worked,
    totalMinutes: estimated,
  };
}

// ---- Tracked time (ActivityWatch) — Planning page & Reports ----

export function calculateTaskProgress(task: TaskWithMetrics): TaskProgress {
  return computeTaskProgress(task, sub => sub.metrics?.timeBreakdown?.trackedMinutes ?? 0);
}

export function calculateMultipleTasksProgress(tasks: TaskWithMetrics[]): TaskProgress {
  return aggregateProgress(tasks, calculateTaskProgress);
}

// ---- Elapsed time (work sessions) — Focus page ----

export function calculateTaskElapsedProgress(task: TaskWithMetrics, liveElapsedMinutes = 0): TaskProgress {
  return computeTaskProgress(task, sub =>
    getSessionMinutes(sub) + (sub.status === 'active' ? liveElapsedMinutes : 0)
  );
}

export function calculateMultipleTasksElapsedProgress(tasks: TaskWithMetrics[], liveElapsedMinutes = 0): TaskProgress {
  return aggregateProgress(tasks, t => calculateTaskElapsedProgress(t, liveElapsedMinutes));
}

/** Sum today's worked minutes across all tasks (for "Xm today" display). */
export function getTodayWorkedMinutes(tasks: TaskWithMetrics[], liveElapsedMinutes = 0): number {
  const today = getTodayDate();
  let total = 0;
  for (const task of tasks) {
    for (const sub of task.subtasks ?? []) {
      total += getSessionMinutes(sub, today);
      if (sub.status === 'active') total += liveElapsedMinutes;
    }
  }
  return total;
}