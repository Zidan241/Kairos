import { apiRequest } from '@/lib/queryClient';
import { 
  type Task, type InsertTask, type Subtask, type UpdateSubtask, type InsertSubtask,
  type WorkSessionHistory,
  type Habit, type InsertHabit, type UpdateHabit,
  type Goal, type InsertGoal, type UpdateGoal,
  UpdateTask
} from '@shared/schema';
import { 
  type DailyMetrics, type DayReportMetrics, type TaskWithMetrics, type NoteListItem,
  type HabitSummary, type HabitDetails, type HabitDayStatus, type GoalSummary, type GoalDetails
} from '@shared/types';

// Re-export shared types used by hooks/components
export type { DailyMetrics, DayReportMetrics, TaskWithMetrics, NoteListItem, HabitSummary, HabitDetails, HabitDayStatus, GoalSummary, GoalDetails };

// -------------------------
// Tasks API
// -------------------------
export const tasksApi = {
  create: async (task: InsertTask): Promise<Task> => {
    const res = await apiRequest('POST', '/api/tasks', task);
    return res.json();
  },
  update: async (id: number, updates: Partial<UpdateTask>): Promise<Task> => {
    const res = await apiRequest('PUT', `/api/tasks/${id}`, updates);
    return res.json();
  },
  delete: async (id: number): Promise<void> => {
    await apiRequest('DELETE', `/api/tasks/${id}`);
  },
  // Optimized composite endpoints
  getTasksWithMetrics: async (sortBy?: string, sortOrder?: string): Promise<TaskWithMetrics[]> => {
    const params = new URLSearchParams();
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    
    const url = `/api/tasks/planning${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await apiRequest('GET', url);
    return res.json();
  },
  getDayPlanWithMetrics: async (): Promise<TaskWithMetrics[]> => {
    const res = await apiRequest('GET', '/api/tasks/day-plan');
    return res.json();
  }
};

// -------------------------
// Subtasks API
// -------------------------
export const subtasksApi = {
  create: async (subtask: InsertSubtask): Promise<Subtask> => {
    const res = await apiRequest('POST', '/api/subtasks', subtask);
    return res.json();
  },
  update: async (id: number, updates: Partial<UpdateSubtask>): Promise<Subtask> => {
    const res = await apiRequest('PUT', `/api/subtasks/${id}`, updates);
    return res.json();
  },
  delete: async (id: number): Promise<void> => {
    await apiRequest('DELETE', `/api/subtasks/${id}`);
  },
  skip: async (id: number): Promise<Subtask> => {
    const res = await apiRequest('PATCH', `/api/subtasks/${id}/skip`);
    return res.json();
  },
  getActive: async (): Promise<Subtask | null> => {
    try {
      const res = await apiRequest('GET', '/api/subtasks/active');
      return res.json();
    } catch (error) {
      // If it's a 404 error (no active subtask), return null
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      // For other errors, re-throw
      throw error;
    }
  },
  getScheduledForDate: async (date: string): Promise<Subtask[]> => {
    const res = await apiRequest('GET', `/api/subtasks/scheduled/${date}`);
    return res.json();
  },
};

// -------------------------
// Notes API
// -------------------------
export const notesApi = {
  get: async (id: number): Promise<string | null> => {
    const res = await apiRequest('GET', `/api/notes/${id}`);
    const data = await res.json();
    return data.notes;
  },
  save: async (id: number, content: string): Promise<void> => {
    await apiRequest('PUT', `/api/notes/${id}`, { content });
  },
  list: async (): Promise<NoteListItem[]> => {
    const res = await apiRequest('GET', '/api/notes');
    return res.json();
  },
};

// -------------------------
// Analytics API
// -------------------------
export const analyticsApi = {
  getWorkSessionsByDate: async (date: string): Promise<WorkSessionHistory[]> => {
    const res = await apiRequest('GET', `/api/analytics/work-sessions/${date}`);
    return res.json();
  },
  getDailyMetrics: async (date?: string): Promise<DailyMetrics> => {
    const queryParam = date ? `?date=${date}` : '';
    const res = await apiRequest('GET', `/api/analytics/daily-metrics${queryParam}`);
    return res.json();
  },
  getDayReport: async (date: string): Promise<DayReportMetrics> => {
    const res = await apiRequest('GET', `/api/analytics/day-report?date=${date}`);
    return res.json();
  },
};

// -------------------------
// ActivityWatch API
// -------------------------
export const activityApi = {
  getStatus: async (): Promise<{ running: boolean; paused: boolean }> => {
    const res = await apiRequest('GET', '/api/activity/status');
    return res.json();
  },
  pause: async (): Promise<void> => {
    await apiRequest('POST', '/api/activity/pause');
  },
  resume: async (): Promise<void> => {
    await apiRequest('POST', '/api/activity/resume');
  },
};

// -------------------------
// Database API
// -------------------------
export const databaseApi = {
  getInfo: async (): Promise<{ path: string; exists: boolean; size: number; lastModified: string | null; lastBackup: string | null }> => {
    const res = await apiRequest('GET', '/api/database/info');
    return res.json();
  },
  backup: async (): Promise<{ path: string }> => {
    const res = await apiRequest('POST', '/api/database/backup');
    return res.json();
  },
};

// -------------------------
// Goals API
// -------------------------
export const goalsApi = {
  list: async (includeArchived = false): Promise<Goal[]> => {
    const res = await apiRequest('GET', `/api/goals?archived=${includeArchived}`);
    return res.json();
  },
  getSummary: async (includeArchived = false): Promise<GoalSummary[]> => {
    const res = await apiRequest('GET', `/api/goals/summary?archived=${includeArchived}`);
    return res.json();
  },
  create: async (goal: InsertGoal): Promise<Goal> => {
    const res = await apiRequest('POST', '/api/goals', goal);
    return res.json();
  },
  update: async (id: number, updates: Partial<UpdateGoal>): Promise<Goal> => {
    const res = await apiRequest('PATCH', `/api/goals/${id}`, updates);
    return res.json();
  },
  delete: async (id: number): Promise<void> => {
    await apiRequest('DELETE', `/api/goals/${id}`);
  },
  getDetails: async (id: number, days: number = 30): Promise<GoalDetails> => {
    const res = await apiRequest('GET', `/api/goals/${id}/details?days=${days}`);
    return res.json();
  },
};

// -------------------------
// Habits API
// -------------------------

export const habitsApi = {
  create: async (habit: InsertHabit): Promise<Habit> => {
    const res = await apiRequest('POST', '/api/habits', habit);
    return res.json();
  },
  update: async (id: number, updates: Partial<UpdateHabit>): Promise<Habit> => {
    const res = await apiRequest('PUT', `/api/habits/${id}`, updates);
    return res.json();
  },
  delete: async (id: number): Promise<void> => {
    await apiRequest('DELETE', `/api/habits/${id}`);
  },
  getSummary: async (includeArchived = false): Promise<HabitSummary[]> => {
    const param = includeArchived ? '?includeArchived=true' : '';
    const res = await apiRequest('GET', `/api/habits/summary${param}`);
    return res.json();
  },
  getDetails: async (id: number, days: number = 30): Promise<HabitDetails> => {
    const res = await apiRequest('GET', `/api/habits/${id}/details?days=${days}`);
    return res.json();
  },
};