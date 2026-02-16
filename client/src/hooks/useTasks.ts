import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, subtasksApi } from "@/lib/api";
import { type InsertTask, type Subtask, type InsertSubtask, type UpdateSubtask, UpdateTask } from "@shared/schema";
import { ACTIVITY_CONFIG } from "@shared/constants.js";
import { TaskWithMetrics } from "@shared/metrics";
import { dateUtils } from "@shared/utils";

// ------------------------------------------------
// QUERY HOOKS - For reading data
// ------------------------------------------------

export function usePlanningTasks(sortBy?: string, sortOrder?: string) {
  return useQuery<any[]>({
    queryKey: ['tasks', 'planning', sortBy, sortOrder],
    queryFn: () => tasksApi.getTasksWithMetrics(sortBy, sortOrder),
    staleTime: ACTIVITY_CONFIG.METRICS_CACHE_TIME_MS,
  });
}

export function useDayPlanTasks() {
  return useQuery<TaskWithMetrics[]>({
    queryKey: ['tasks', 'day-plan'],
    queryFn: tasksApi.getDayPlanWithMetrics,
    staleTime: ACTIVITY_CONFIG.METRICS_CACHE_TIME_MS,
  });
}

export function useScheduledSubtasks(date?: string) {
  const targetDate = date || dateUtils.getTodayDate();
  return useQuery<Subtask[]>({
    queryKey: ['subtasks', 'scheduled', targetDate],
    queryFn: () => subtasksApi.getScheduledForDate(targetDate),
    staleTime: ACTIVITY_CONFIG.METRICS_CACHE_TIME_MS,
  });
}

// ------------------------------------------------
// TASK MUTATION HOOKS - For modifying tasks
// ------------------------------------------------

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (task: InsertTask) => tasksApi.create(task),
    onSuccess: () => {
      // Simple: invalidate all task queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<UpdateTask> }) => 
      tasksApi.update(id, updates),
    onSuccess: () => {
      // Simple: invalidate all task queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => {
      // Simple: invalidate all task queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ------------------------------------------------
// SUBTASK MUTATION HOOKS - For modifying subtasks
// ------------------------------------------------

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (subtask: InsertSubtask) => subtasksApi.create(subtask),
    onSuccess: () => {
      // Simple: just invalidate what might be affected
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<UpdateSubtask> }) => 
      subtasksApi.update(id, updates),
    onSuccess: () => {
      // Simple: invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => subtasksApi.delete(id),
    onSuccess: () => {
      // Simple: invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}