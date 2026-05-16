import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi, type GoalSummary, type GoalDetails } from "@/lib/api";
import { type InsertGoal, type UpdateGoal, type Goal } from "@shared/schema";

function invalidateGoals(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['goals'] });
}

export function useGoalsList(includeArchived = false) {
  return useQuery<Goal[]>({
    queryKey: ['goals', 'list', includeArchived],
    queryFn: () => goalsApi.list(includeArchived),
    staleTime: 60000,
  });
}

export function useGoalsSummary(includeArchived = false, days = 30) {
  return useQuery<GoalSummary[]>({
    queryKey: ['goals', 'summary', includeArchived, days],
    queryFn: () => goalsApi.getSummary(includeArchived, days),
    staleTime: 60000,
  });
}

export function useGoalDetails(goalId: number | null, days: number = 30) {
  return useQuery<GoalDetails>({
    queryKey: ['goals', 'details', goalId, days],
    queryFn: () => goalsApi.getDetails(goalId!, days),
    enabled: goalId !== null,
    staleTime: 60000,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: InsertGoal) => goalsApi.create(goal),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<UpdateGoal> }) =>
      goalsApi.update(id, updates),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => goalsApi.delete(id),
    onSuccess: () => invalidateGoals(queryClient),
  });
}
