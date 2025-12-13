import { type TaskWithMetrics } from "@shared/metrics";

/**
 * Calculate progress for a single planning task
 * @param task Planning task with completion status, tracked time, estimated time, and optional subtasks
 * @returns Progress percentage (0-100)
 */

interface TaskProgress {
  progress: number;
  trackedMinutes: number;
  totalMinutes: number;
}

export function calculateTaskProgress(task: TaskWithMetrics): TaskProgress {
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  var totalTrackedMinutes = 0;
  var totalMinutes = 0;
  
    const totalProgress = task.subtasks!.reduce((sum, subtask) => {
      const trackedMinutes = subtask.metrics?.timeBreakdown?.totalMinutes || 0;
      totalTrackedMinutes += trackedMinutes;
      totalMinutes += subtask.estimatedMinutes;
      if (subtask.isCompleted) {
        return sum + 100;
      } else {
        // if estimated time <= tracked time then keep progress at 90 until mark subtask completed
        const subtaskProgress = Math.min((trackedMinutes / subtask.estimatedMinutes) * 100, 90);
        return sum + subtaskProgress;
      }
    }, 0);

    return { progress: hasSubtasks ? totalProgress / task.subtasks!.length :  task.isCompleted ? 100 : 0, trackedMinutes: totalTrackedMinutes, totalMinutes };
}

/**
 * Calculate progress for multiple planning tasks (for daily progress)
 * @param tasks Array of planning tasks
 * @returns TaskProgress object with progress percentage, tracked minutes, and total minutes
 */
export function calculateMultipleTasksProgress(tasks: TaskWithMetrics[]): TaskProgress {
  if (tasks.length === 0) return { progress: 0, trackedMinutes: 0, totalMinutes: 0 };
  
  let totalProgress = 0;
  let totalTrackedMinutes = 0;
  let totalEstimatedMinutes = 0;
  
  tasks.forEach(task => {
    const { progress, trackedMinutes, totalMinutes } = calculateTaskProgress(task);
    totalProgress += progress;
    totalTrackedMinutes += trackedMinutes;
    totalEstimatedMinutes += totalMinutes;
  });
  
  return {
    progress: totalProgress / tasks.length,
    trackedMinutes: totalTrackedMinutes,
    totalMinutes: totalEstimatedMinutes
  };
}