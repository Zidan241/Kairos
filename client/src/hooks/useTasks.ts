import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, subtasksApi, workSessionsApi } from "@/lib/api";
import { type InsertTask, type Subtask, type InsertSubtask, type UpdateSubtask, type WorkSessionHistory, UpdateTask } from "@shared/schema";
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

export function useWorkSessionsByDate(date?: string) {
  const targetDate = date || dateUtils.getTodayDate();
  return useQuery<WorkSessionHistory[]>({
    queryKey: ['work-sessions', targetDate],
    queryFn: () => workSessionsApi.getByDate(targetDate),
    staleTime: ACTIVITY_CONFIG.METRICS_CACHE_TIME_MS,
  });
}

export function useActiveSubtask() {
  return useQuery<Subtask | null>({
    queryKey: ['subtasks', 'active'],
    queryFn: subtasksApi.getActive,
    refetchInterval: ACTIVITY_CONFIG.METRICS_CACHE_TIME_MS,
  });
}

// Invalidate all data queries that could be affected by task/subtask changes
function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  queryClient.invalidateQueries({ queryKey: ['subtasks'] });
  queryClient.invalidateQueries({ queryKey: ['work-sessions'] });
  queryClient.invalidateQueries({ queryKey: ['notes-list'] });
  queryClient.invalidateQueries({ queryKey: ['metrics'] });
}

// ------------------------------------------------
// TASK MUTATION HOOKS - For modifying tasks
// ------------------------------------------------

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (task: InsertTask) => tasksApi.create(task),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<UpdateTask> }) => 
      tasksApi.update(id, updates),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

// ------------------------------------------------
// SUBTASK MUTATION HOOKS - For modifying subtasks
// ------------------------------------------------

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (subtask: InsertSubtask) => subtasksApi.create(subtask),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<UpdateSubtask> }) => 
      subtasksApi.update(id, updates),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => subtasksApi.delete(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}