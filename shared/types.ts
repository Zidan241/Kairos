import { Goal, Habit, Subtask, Task, WorkSessionHistory, ActivityBucket } from "./schema";

// ----------------------------
// Core metric building blocks
// ----------------------------

export interface TimeBreakdown {
  workedMinutes: number;        // from work sessions (play/pause timer)
  trackedMinutes: number;         // from ActivityWatch activity buckets
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

export type HabitDayStatus = 'completed' | 'missed' | 'skipped' | 'pending';

// ----------------------------
// Task / Subtask metrics (used by Planning views)
// ----------------------------

/** Lightweight goal reference for joins — derived from Goal schema */
export type GoalRef = Pick<Goal, 'id' | 'title'>;

export interface ScheduleBreakdown {
  date: string;
  timeBreakdown: TimeBreakdown;
  apps: AppUsage[];
}

export interface SubtaskMetrics {
  timeBreakdown: TimeBreakdown;
  scheduleBreakdown: ScheduleBreakdown[];
  workSessions: WorkSessionHistory[];
}

export interface SubtaskWithMetrics extends Subtask {
  metrics: SubtaskMetrics;
  requestDate?: string;
  isPlannedOnDate?: boolean;
  goal?: GoalRef | null;
}

export interface TaskWithMetrics extends Task {
  subtasks: SubtaskWithMetrics[];
  goal?: GoalRef | null;
}

// ----------------------------
// Habit types
// ----------------------------

export interface HabitSummary extends Habit {
  progress: { completedCount: number; totalMinutes: number };
  streak: number;
  isDueToday: boolean;
  completionRate: { completed: number; total: number };
  history: Array<{ date: string; status: HabitDayStatus; minutes: number }>;
}

export interface HabitDetails {
  habit: Habit;
  bestStreak: number;
  timeBreakdown: TimeBreakdown;
  perDay: Array<{
    date: string;
    status: HabitDayStatus;
    trackedMinutes: number;
  }>;
}

// ----------------------------
// Goal types
// ----------------------------

export interface GoalSummary extends Goal {
  stats: {
    totalMinutes: number;
    subtaskCount: number;
    completedSubtaskCount: number;
    habitCount: number;
  };
}

export interface GoalDetails {
  goal: Goal;
  subtasks: Array<{ id: number; title: string; isCompleted: boolean; minutes: number; parentTaskTitle: string }>;
  habits: Array<{ id: number; title: string; minutes: number }>;
  timeBreakdown: TimeBreakdown;
}

// ----------------------------
// Database types
// ----------------------------

export interface DatabaseInfo {
  path: string;
  exists: boolean;
  size: number;
  lastModified: string | null;
  lastBackup: string | null;
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
  workedMinutes: number;  // from work sessions (play/pause timer)
  trackedMinutes: number; // from activity buckets (ActivityWatch)
  estimationAccuracy: number;
}

export interface ReflectSummary {
  habits: { done: number; skipped: number; missed: number; due: number };
  tasks: { planned: number; done: number; rescheduled: number };
  goals: { total: number; progressed: number; perGoal: Array<GoalRef & { minutes: number }> };
}

export interface TimelineSegment {
  start: number;  // hour as decimal (9.5 = 9:30 AM)
  end: number;
  status: ActivityBucket['category'] | 'untracked';
}

export interface DayReportMetrics {
  date: string;
  timeBreakdown: TimeBreakdown;
  previousDayBreakdown: TimeBreakdown | null;
  timeline: TimelineSegment[];
  hourlyEfficiency: Array<{
    time: string;     // "9AM", "10AM"
    timestamp: number; // hour as integer
    efficiency: number; // 0-100
  }>;
  planExecution: PlanExecution;
  topApps: AppUsage[];
  reflect: ReflectSummary;
}

// ----------------------------
// Notes
// ----------------------------

export interface NoteListItem {
  id: number;
  title: string;
  parentTaskTitle: string;
  updatedAt: string;
}
