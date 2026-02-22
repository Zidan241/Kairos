import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import TaskItem from "./TaskItem";
import { useDayPlanTasks, useUpdateSubtask, useUpdateTask } from "@/hooks/useTasks";
import { calculateMultipleTasksProgress } from "@/lib/taskUtils";
import { type TaskWithMetrics } from "@shared/metrics";
import { TaskHelpers } from "./utils/taskHelpers";

interface DayPlanProps {}

export default function DayPlan(_props: DayPlanProps) {
  const { data: dayTasks = [], isLoading } = useDayPlanTasks();
  
  const updateSubtaskMutation = useUpdateSubtask();

  const handleToggleSubtaskActive = (subtaskId: number, isActive: boolean) => {
    updateSubtaskMutation.mutate({ 
      id: subtaskId, 
      updates: { isActive: !isActive }
    });
  };

  const handleToggleSubtaskComplete = (subtaskId: number, isCompleted: boolean) => {
    updateSubtaskMutation.mutate({ 
      id: subtaskId,
      updates: { isCompleted: !isCompleted }
    });
  };

  const dayProgress = calculateMultipleTasksProgress(dayTasks);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 border-b pb-4 h-[5.5rem] justify-center">
        <div className="flex items-center justify-between">
          <CardTitle>Today's Plan</CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {dayTasks.length} tasks • <span className={TaskHelpers.getStatusColor(false, dayProgress.trackedMinutes > dayProgress.totalMinutes, dayProgress.progress)}>{TaskHelpers.formatTime(dayProgress.trackedMinutes)} / {TaskHelpers.formatTime(dayProgress.totalMinutes)}</span> • {Math.round(dayProgress.progress)}%
            </span>
          </div>
        </div>
        <Progress value={dayProgress.progress} className="h-1 !mt-3" />
      </CardHeader>
      <CardContent className="space-y-4 flex-1 overflow-y-auto scrollbar-clean pt-4">
        {/* Show loading skeleton when data is loading */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : dayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No tasks planned for today</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Schedule subtasks from the Plan page</p>
          </div>
        ) : (
          /* Render tasks with their subtasks handled internally */
          dayTasks.map((task: TaskWithMetrics) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleSubtaskActive={handleToggleSubtaskActive}
              onToggleSubtaskComplete={handleToggleSubtaskComplete}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}