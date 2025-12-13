// Metrics types for productivity analytics

import { Subtask, Task } from "./schema";

// Task Metrics
export interface AppUsage {
  app: string;
  minutes: number;
  percentage: number;
}

export interface ScheduleBreakdown {
  date: string;
  timeBreakdown: TimeBreakdown;
  apps: AppUsage[];
}


export interface TimeBreakdown {
  totalMinutes: number;
  focusMinutes: number;
  prefocusMinutes: number;
  idleMinutes: number;
  distractionMinutes: number;
  productivityRatio: number; // (focus + prefocus) / total
}

export interface TaskWithMetrics extends Task {
  subtasks: SubtaskWithMetrics[];
}

export interface SubtaskMetrics {
  timeBreakdown: TimeBreakdown;
  scheduleBreakdown: ScheduleBreakdown[];
}

export interface SubtaskWithMetrics extends Subtask {
  metrics: SubtaskMetrics;
  requestDate?: string;
  isPlannedOnDate?: boolean;
}


// Reporting Metrics
export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  timeBreakdown: TimeBreakdown;
}

// Additional metrics types for future use
export interface WeeklyMetrics {
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string; // YYYY-MM-DD (Sunday)
  dailyMetrics: DailyMetrics[];
}
