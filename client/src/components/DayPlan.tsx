import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import TaskItem from "./TaskItem";
import { NotesPanel } from "./NotesPanel";
import { useDayPlanTasks, useUpdateSubtask } from "@/hooks/useTasks";
import { calculateMultipleTasksElapsedProgress, getTodayWorkedMinutes } from "@/lib/taskUtils";
import { type TaskWithMetrics } from "@shared/metrics";
import { TaskHelpers } from "./utils/taskHelpers";
import { useState } from "react";
import { useElapsedMinutes } from "@/hooks/useElapsedTime";

export default function DayPlan() {
  const { data: dayTasks = [], isLoading } = useDayPlanTasks();
  const [notesSubtask, setNotesSubtask] = useState<{ id: number; title: string } | null>(null);
  
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

  const activeSubtask = dayTasks.flatMap(t => t.subtasks ?? []).find(s => s.isActive);
  const liveElapsed = useElapsedMinutes(activeSubtask?.activatedAt ?? null);

  const dayProgress = calculateMultipleTasksElapsedProgress(dayTasks, liveElapsed);
  const todayWorked = getTodayWorkedMinutes(dayTasks, liveElapsed);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 border-b pb-4 h-[5.5rem] justify-center">
        <div className="flex items-center justify-between">
          <CardTitle>Today's Plan</CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {todayWorked < dayProgress.workedMinutes && <>{TaskHelpers.formatTime(todayWorked)} today • </>}<span className={TaskHelpers.getStatusColor(false, dayProgress.workedMinutes > dayProgress.totalMinutes, dayProgress.progress)}>{TaskHelpers.formatTime(dayProgress.workedMinutes)} / {TaskHelpers.formatTime(dayProgress.totalMinutes)}</span>
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
              onOpenNotes={setNotesSubtask}
            />
          ))
        )}
      </CardContent>
      {notesSubtask && (
        <NotesPanel
          open={!!notesSubtask}
          onOpenChange={(open) => { if (!open) setNotesSubtask(null); }}
          subtaskId={notesSubtask.id}
          subtaskTitle={notesSubtask.title}
        />
      )}
    </Card>
  );
}