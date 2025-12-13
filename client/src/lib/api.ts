import { apiRequest } from '@/lib/queryClient';
import { 
  type Task, type InsertTask, type Subtask, type UpdateSubtask, type InsertSubtask,
  UpdateTask
} from '@shared/schema';
import { 
  type DailyMetrics, type TaskWithMetrics
} from '@shared/metrics';

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
  }
};

// -------------------------
// Metrics API
// -------------------------
export const metricsApi = {
  getDailyMetrics: async (date?: string): Promise<DailyMetrics> => {
    const queryParam = date ? `?date=${date}` : '';
    const res = await apiRequest('GET', `/api/metrics/daily${queryParam}`);
    return res.json();
  },
};