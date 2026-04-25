import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import TaskItem from "./TaskItem";
import { NotesPanel } from "@/components/NotesPanel";
import { useDayPlanTasks, useUpdateSubtask } from "@/hooks/useTasks";
import { useSkipSubtask } from "@/hooks/useHabits";
import { calculateMultipleTasksElapsedProgress, getTodayWorkedMinutes } from "@/lib/taskUtils";
import { type TaskWithMetrics } from "@shared/types";
import { type Subtask } from "@shared/schema";
import { TaskHelpers } from "@/lib/taskHelpers";
import { useState } from "react";
import { useElapsedMinutes } from "@/hooks/useElapsedTime";
import { ChevronDown, ChevronRight, Zap } from "lucide-react";

export default function DayPlan() {
  const { data: dayTasks = [], isLoading } = useDayPlanTasks();
  const [notesSubtask, setNotesSubtask] = useState<{ id: number; title: string } | null>(null);
  const [habitsExpanded, setHabitsExpanded] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [skippedExpanded, setSkippedExpanded] = useState(false);
  
  const updateSubtaskMutation = useUpdateSubtask();
  const skipSubtaskMutation = useSkipSubtask();

  const handleSkipSubtask = (id: number) => skipSubtaskMutation.mutate(id);

  const handleToggleSubtaskActive = (subtaskId: number, currentStatus: Subtask['status']) => {
    updateSubtaskMutation.mutate({ 
      id: subtaskId, 
      updates: { status: currentStatus === 'active' ? 'pending' : 'active' }
    });
  };

  const handleToggleSubtaskComplete = (subtaskId: number, currentStatus: Subtask['status']) => {
    updateSubtaskMutation.mutate({ 
      id: subtaskId,
      updates: { status: currentStatus === 'completed' ? 'pending' : 'completed' }
    });
  };

  const activeSubtask = dayTasks.flatMap(t => t.subtasks ?? []).find(s => s.status === 'active');
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
      <CardContent className="space-y-4 flex-1 overflow-y-auto scrollbar-clean pt-4 pb-12">
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
          (() => {
            const habits = dayTasks.filter((t: TaskWithMetrics) => t.isHabit);
            const tasks = dayTasks.filter((t: TaskWithMetrics) => !t.isHabit);
            const habitsHaveActive = habits.some(t => t.subtasks?.some(s => s.status === 'active'));
            const tasksHaveActive = tasks.some(t => t.subtasks?.some(s => s.status === 'active'));

            // Split habits into active and fully-skipped
            const activeHabits = habits
              .filter(t => t.subtasks?.some(s => s.status !== 'skipped'))
              .sort((a, b) => {
                const aDone = a.subtasks?.every(s => s.status === 'completed') ? 1 : 0;
                const bDone = b.subtasks?.every(s => s.status === 'completed') ? 1 : 0;
                return aDone - bDone;
              });
            const skippedHabits = habits.filter(t => t.subtasks?.every(s => s.status === 'skipped'));
            return (
              <>
                {habits.length > 0 && (
                  <>
                    <button onClick={() => setHabitsExpanded(!habitsExpanded)} className="flex items-center gap-3 py-1 w-full group cursor-pointer">
                      <div className="h-px flex-1 bg-border" />
                      <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                        {habitsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        Habits ({activeHabits.length})
                        {!habitsExpanded && habitsHaveActive && <Zap className="h-3 w-3 text-chart-2" />}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </button>
                    {habitsExpanded && (
                      <>
                        {activeHabits.map((task: TaskWithMetrics) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggleSubtaskActive={handleToggleSubtaskActive}
                            onToggleSubtaskComplete={handleToggleSubtaskComplete}
                            onOpenNotes={setNotesSubtask}
                            onSkipSubtask={handleSkipSubtask}
                          />
                        ))}
                        {skippedHabits.length > 0 && (
                          <>
                            <button
                              onClick={() => setSkippedExpanded(!skippedExpanded)}
                              className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors w-full"
                            >
                              {skippedExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              Skipped ({skippedHabits.length})
                            </button>
                            {skippedExpanded && skippedHabits.map((task: TaskWithMetrics) => (
                              <TaskItem
                                key={task.id}
                                task={task}
                                onToggleSubtaskActive={handleToggleSubtaskActive}
                                onToggleSubtaskComplete={handleToggleSubtaskComplete}
                                onOpenNotes={setNotesSubtask}
                                onSkipSubtask={handleSkipSubtask}
                              />
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
                {tasks.length > 0 && (
                  <>
                    {habits.length > 0 && (
                      <button onClick={() => setTasksExpanded(!tasksExpanded)} className="flex items-center gap-3 py-1 w-full group cursor-pointer">
                        <div className="h-px flex-1 bg-border" />
                        <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                          {tasksExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          Tasks ({tasks.length})
                          {!tasksExpanded && tasksHaveActive && <Zap className="h-3 w-3 text-chart-2" />}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </button>
                    )}
                    {tasksExpanded && tasks.map((task: TaskWithMetrics) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggleSubtaskActive={handleToggleSubtaskActive}
                        onToggleSubtaskComplete={handleToggleSubtaskComplete}
                        onOpenNotes={setNotesSubtask}
                      />
                    ))}
                  </>
                )}
              </>
            );
          })()
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