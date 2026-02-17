import { 
  type Task, 
  type Subtask,
} from "@shared/schema";
import { type SubtaskMetrics, TaskWithMetrics, SubtaskWithMetrics } from "@shared/metrics";

// Build task hierarchy from tasks and subtasks with simplified metrics
export function buildTaskHierarchyWithMetrics(
  parentTasks: Task[],
  subtasks: Subtask[],
  subtaskMetrics: Record<number, SubtaskMetrics>,
  requestDate?: string
): TaskWithMetrics[] {
  // Group subtasks by parent task
  const subtasksByParent = new Map<number, Subtask[]>();
  subtasks.forEach(subtask => {
    if (!subtasksByParent.has(subtask.parentTaskId)) {
      subtasksByParent.set(subtask.parentTaskId, []);
    }
    subtasksByParent.get(subtask.parentTaskId)!.push(subtask);
  });

  // Transform each parent task with its subtasks
  const results: TaskWithMetrics[] = [];
  
  for (const task of parentTasks) {
    const taskSubtasks = subtasksByParent.get(task.id) || [];
    
    // Transform subtasks to SubtaskWithMetrics
    const transformedSubtasks: SubtaskWithMetrics[] = taskSubtasks.map(subtask => {
      const metrics = subtaskMetrics[subtask.id] || {
        timeBreakdown: {
          totalMinutes: 0,
          focusMinutes: 0,
          prefocusMinutes: 0,
          idleMinutes: 0,
          distractionMinutes: 0,
          productivityRatio: 0
        },
        scheduleBreakdown: []
      };
      
      const subtaskWithMetrics : SubtaskWithMetrics = {
        ...subtask,
        metrics,
      };
      if (requestDate){
        subtaskWithMetrics.requestDate = requestDate;
        // Ensure both values are strings and handle null/undefined scheduledDate
        subtaskWithMetrics.isPlannedOnDate = subtask.scheduledDate !== null && 
                                           subtask.scheduledDate !== undefined && 
                                           subtask.scheduledDate === requestDate;
      }
      return subtaskWithMetrics
    });
    

    
    const transformedTask = {
      ...task,
      subtasks: transformedSubtasks,

    };
    
    results.push(transformedTask);
  }
  
  return results;
}