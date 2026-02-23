import { Subtask, Task } from "./schema";

// ----------------------------
// Core metric building blocks
// ----------------------------

export interface TimeBreakdown {
  totalMinutes: number;
  focusMinutes: number;
  prefocusMinutes: number;
  idleMinutes: number;
  distractionMinutes: number;
  productivityRatio: number; // (focus + weighted prefocus) / active time
  longestFocusStreak: number; // longest consecutive focus run in minutes
}

export interface AppUsage {
  app: string;
  minutes: number;
  percentage: number;
}

// ----------------------------
// Task / Subtask metrics (used by Planning views)
// ----------------------------

export interface ScheduleBreakdown {
  date: string;
  timeBreakdown: TimeBreakdown;
  apps: AppUsage[];
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

export interface TaskWithMetrics extends Task {
  subtasks: SubtaskWithMetrics[];
}

// ----------------------------
// Reporting metrics
// ----------------------------

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  timeBreakdown: TimeBreakdown;
}

export interface PlanExecution {
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  estimatedMinutes: number;
  actualMinutes: number;
  estimationAccuracy: number;
}

export interface DayReportMetrics {
  date: string;
  timeBreakdown: TimeBreakdown;
  previousDayBreakdown: TimeBreakdown | null;
  timeline: Array<{
    start: number;  // hour as decimal (9.5 = 9:30 AM)
    end: number;
    status: 'focus' | 'prefocus' | 'distracted' | 'idle' | 'untracked';
  }>;
  hourlyEfficiency: Array<{
    time: string;     // "9AM", "10AM"
    timestamp: number; // hour as integer
    efficiency: number; // 0-100
  }>;
  planExecution: PlanExecution;
  topApps: AppUsage[];
}
