import { 
  type Task, 
  type Subtask,
} from "@shared/schema";
import { type SubtaskMetrics, TaskWithMetrics, SubtaskWithMetrics } from "@shared/types";

const emptyMetrics: SubtaskMetrics = {
  timeBreakdown: {
    workedMinutes: 0,
    trackedMinutes: 0,
    focusMinutes: 0,
    prefocusMinutes: 0,
    idleMinutes: 0,
    distractionMinutes: 0,
    productivityRatio: 0,
    longestFocusStreak: 0,
  },
  scheduleBreakdown: [],
  workSessions: [],
};

function mapSubtask(
  subtask: Subtask,
  metrics: SubtaskMetrics,
  goalsMap: Map<number, string>,
  parentGoalId: number | null,
  requestDate?: string,
): SubtaskWithMetrics {
  const effectiveGoalId = subtask.overrideGoal ? subtask.goalId : (subtask.goalId ?? parentGoalId);

  return {
    ...subtask,
    metrics,
    goal: effectiveGoalId ? { id: effectiveGoalId, title: goalsMap.get(effectiveGoalId) ?? 'Unknown' } : null,
    ...(requestDate && {
      requestDate,
      isPlannedOnDate: subtask.scheduledDate === requestDate,
    }),
  };
}

// Build task hierarchy from tasks and subtasks with simplified metrics
export function buildTaskHierarchyWithMetrics(
  parentTasks: Task[],
  subtasks: Subtask[],
  subtaskMetrics: Record<number, SubtaskMetrics>,
  goalsMap: Map<number, string>,
  requestDate?: string,
): TaskWithMetrics[] {
  const subtasksByParent = Map.groupBy(subtasks, s => s.parentTaskId);

  return parentTasks.map(task => ({
    ...task,
    goal: task.goalId ? { id: task.goalId, title: goalsMap.get(task.goalId) ?? 'Unknown' } : null,
    subtasks: (subtasksByParent.get(task.id) ?? []).map(subtask =>
      mapSubtask(
        subtask,
        subtaskMetrics[subtask.id] ?? emptyMetrics,
        goalsMap,
        task.goalId,
        requestDate,
      )
    ),
  }));
}