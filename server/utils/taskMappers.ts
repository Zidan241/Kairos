import { 
  type Task, 
  type Subtask,
} from "@shared/schema";
import { type SubtaskMetrics, TaskWithMetrics, SubtaskWithMetrics } from "@shared/metrics";

const emptyMetrics: SubtaskMetrics = {
  timeBreakdown: {
    totalMinutes: 0,
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
  requestDate?: string,
): SubtaskWithMetrics {
  return {
    ...subtask,
    metrics,
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
  requestDate?: string,
): TaskWithMetrics[] {
  const subtasksByParent = Map.groupBy(subtasks, s => s.parentTaskId);

  return parentTasks.map(task => ({
    ...task,
    subtasks: (subtasksByParent.get(task.id) ?? []).map(subtask =>
      mapSubtask(
        subtask,
        subtaskMetrics[subtask.id] ?? emptyMetrics,
        requestDate,
      )
    ),
  }));
}