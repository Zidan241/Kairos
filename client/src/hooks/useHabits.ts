import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { habitsApi, subtasksApi, type HabitSummary, type HabitDetails } from "@/lib/api";
import { type InsertHabit, type UpdateHabit } from "@shared/schema";
import { ACTIVITY_CONFIG } from "@shared/constants.js";

function invalidateHabits(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['habits'] });
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  queryClient.invalidateQueries({ queryKey: ['subtasks'] });
}

export function useHabitsSummary(includeArchived = false) {
  return useQuery<HabitSummary[]>({
    queryKey: ['habits', 'summary', includeArchived],
    queryFn: () => habitsApi.getSummary(includeArchived),
    staleTime: ACTIVITY_CONFIG.METRICS_CACHE_TIME_MS,
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (habit: InsertHabit) => habitsApi.create(habit),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<UpdateHabit> }) =>
      habitsApi.update(id, updates),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => habitsApi.delete(id),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useHabitDetails(habitId: number | null, days: number = 30) {
  return useQuery<HabitDetails>({
    queryKey: ['habits', 'details', habitId, days],
    queryFn: () => habitsApi.getDetails(habitId!, days),
    enabled: habitId !== null,
    staleTime: 60000,
  });
}

export function useSkipSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subtaskId: number) => subtasksApi.skip(subtaskId),
    onSuccess: () => invalidateHabits(queryClient),
  });
}
