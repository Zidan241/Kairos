import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Calendar,
  Check,
  MoreHorizontal,
  Edit,
  Trash,
  X,
  CalendarPlus,
  Clock,
  FileText,
  Target,
} from "lucide-react";
import { SubtaskWithMetrics, type TaskWithMetrics } from "@shared/types";
import { type Subtask } from "@shared/schema";
import { calculateTaskElapsedProgress, getSessionMinutes } from "@/lib/taskUtils";
import { TaskHelpers } from "@/lib/taskHelpers";
import { NotesPanel } from "@/components/NotesPanel";
import { useState } from "react";

interface TaskCardProps {
  task: TaskWithMetrics;
  handleCompleteTask: (taskId: number, isCompleted: boolean) => void;
  handleCompleteSubtask: (subtaskId: number, currentStatus: Subtask['status']) => void;
  handleAddSubtask: (parentTaskId: number) => void;
  handleEditTask: (task: TaskWithMetrics) => void;
  handleEditSubtask: (subtask: SubtaskWithMetrics) => void;
  handleDeleteTask: (taskId: number) => void;
  handleDeleteSubtask: (subtaskId: number) => void;
  handleToggleDayPlan: (subtaskId: number, isPlannedOnDate: boolean) => void;
}

export default function TaskCard({
  task,
  handleCompleteTask,
  handleCompleteSubtask,
  handleAddSubtask,
  handleEditTask,
  handleEditSubtask,
  handleDeleteTask,
  handleDeleteSubtask,
  handleToggleDayPlan,
}: TaskCardProps) {
  const [notesSubtask, setNotesSubtask] = useState<SubtaskWithMetrics | null>(null);
  const priority = TaskHelpers.getTaskPriority(task.priority);
  const deadline = TaskHelpers.getTaskDeadlineUrgency(task.dueDate);
  const isOverdue = TaskHelpers.isOverdue(task.isCompleted, task.dueDate);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  
  // Calculate progress using elapsed (work session) time
  const progress = calculateTaskElapsedProgress(task);
  
  // Determine card styling based on task state
  const isEmptyTask = !hasSubtasks && !task.isCompleted;
  const cardClassName = isEmptyTask 
    ? "mb-6 border-dashed border-2 border-muted-foreground/30 bg-muted/10"
    : "mb-6";
  
  // Determine title styling
  const titleClassName = task.isCompleted 
    ? "text-base mb-1 line-through"
    : isEmptyTask 
      ? "text-base mb-1 text-muted-foreground"
      : "text-base mb-1";

  return (
    <Card className={cardClassName}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={task.isCompleted}
              onCheckedChange={() => handleCompleteTask(task.id, task.isCompleted)}
              data-testid={`checkbox-task-${hasSubtasks && task.isCompleted ? 'completed-' : ''}${task.id}`}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <CardTitle className={`${titleClassName} break-words`} data-testid={`task-title-${task.id}`}>
                {task.title}
              </CardTitle>
              {task.description && (
                <p className={`text-sm text-muted-foreground mb-2 ${task.isCompleted ? 'line-through' : ''}`}>
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1" title="Work session time">
                  <Clock className={`h-3 w-3 ${TaskHelpers.getStatusColor(task.isCompleted, progress.workedMinutes > progress.totalMinutes, progress.progress)}`} />
                  <span 
                    data-testid={`task-time-${task.id}`}
                    className={TaskHelpers.getStatusColor(task.isCompleted, progress.workedMinutes > progress.totalMinutes, progress.progress)}
                  >
                    {TaskHelpers.formatTime(isEmptyTask ? 0 : progress.workedMinutes)} / {TaskHelpers.formatTime(progress.totalMinutes)}
                  </span>
                </div>
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${isOverdue ? "text-chart-5" : "text-muted-foreground"}`}>
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
                {!task.isCompleted && task.goal && (<>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Target className="h-3 w-3" />
                    {task.goal.title}
                  </span>
                </>)}
              </div>
            </div>
          </div>
          
          {/* Right side badges and menu */}
          <div className="flex items-center gap-2">
            {/* Status badge */}
            {task.isCompleted ? (
              <Badge variant="outline" className={`flex items-center justify-center ${TaskHelpers.getBadgeTheme('completed')}`}>
                Completed
              </Badge>
            ) : isEmptyTask ? (
              <Badge variant="outline" className={`flex items-center justify-center ${TaskHelpers.getBadgeTheme('waiting')}`}>
                Waiting for subtasks
              </Badge>
            ) : null
            }
            
            {/* In progress badge for active tasks */}
            {!task.isCompleted && deadline && (
                <Badge 
                    variant="outline"
                    className={`flex items-center justify-center ${TaskHelpers.getBadgeTheme(deadline.variant === "destructive" ? 'deadline-urgent' : 'deadline-warning')}`}
                >
                    {deadline.icon}
                    <span className="ml-1">{deadline.text}</span>
                </Badge>
            )}

            {!task.isCompleted && (
                <Badge variant="outline" className={`flex items-center justify-center ${TaskHelpers.getBadgeTheme('priority')}`}>
                  {priority.icon}
                  <span className="ml-1">{priority.text}</span>
                </Badge>
            )}

            {/* Dropdown menu - only show if task is not completed */}
            {!task.isCompleted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid={`button-menu-task-${task.id}`}>
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => handleEditTask(task)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteTask(task.id)}>
                      <Trash className="mr-2 h-3 w-3" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Progress section */}
        <div className="flex justify-between items-center text-xs mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {task.isCompleted ? "100" : Math.round(progress.progress)}% complete
            </span>
          </div>
          <span className="text-muted-foreground">
            {task.subtasks?.filter(st => st.status === 'completed').length || 0} / {task.subtasks?.length || 0} subtasks
          </span>
        </div>
        <Progress value={task.isCompleted ? 100 : progress.progress} className="mb-3 h-1" />
        
        {/* Content based on task state */}
        {!hasSubtasks && task.isCompleted ? (
          // Completed simple task
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <div className="text-center">
              <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Task completed successfully</p>
            </div>
          </div>
        ) : !hasSubtasks ? (
          // Empty task - waiting for subtasks (only show Add button if task not completed)
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <div className="text-center">
              {!task.isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSubtask(task.id)}
                  data-testid={`button-add-subtask-${task.id}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Subtask
                </Button>
              )}
            </div>
          </div>
        ) : (
          // Task with subtasks
          <>
            <div className="space-y-2">
              {[...task.subtasks!]
                .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'))
                .map((subtask) => {
                  const isSubtaskCompleted = subtask.status === 'completed';
                  const isParentCompleted = task.isCompleted;
                  const subtaskClassName = isParentCompleted 
                    ? "border rounded-lg p-3 bg-muted/30 opacity-60" 
                    : "border rounded-lg p-3 bg-muted/30";
                  
                  return (
                    <div key={subtask.id} className={subtaskClassName}>
                      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 mb-2">
                        <Checkbox
                          checked={isSubtaskCompleted}
                          onCheckedChange={() => handleCompleteSubtask(subtask.id, subtask.status)}
                          data-testid={`checkbox-subtask-${subtask.id}`}
                          className="mt-1"
                          disabled={isParentCompleted}
                        />
                        <div className="min-w-0">
                          <span className={`font-medium text-sm block mb-1 break-words ${
                            isSubtaskCompleted ? "line-through" : ""
                          }`}>
                            {subtask.title}
                          </span>
                          {subtask.description && (
                            <p className={`text-xs text-muted-foreground mb-1 break-words ${isSubtaskCompleted ? "line-through" : ""}`}>
                              {subtask.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3">
                            {(() => {
                              const worked = getSessionMinutes(subtask);
                              const est = subtask.estimatedMinutes ?? 0;
                              const pct = est > 0 ? (worked / est) * 100 : 0;
                              return (
                                <span className="text-xs flex items-center gap-1" title="Work session time">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className={TaskHelpers.getStatusColor(isSubtaskCompleted, est > 0 && worked > est, pct)}>
                                    {TaskHelpers.formatTime(worked)}{est > 0 && <> / {TaskHelpers.formatTime(est)}</>}
                                  </span>
                                </span>
                              );
                            })()}
                            <span className="text-muted-foreground/40">•</span>
                            <span className="text-xs flex items-center gap-1" title="ActivityWatch tracked time">
                              <span className="text-muted-foreground">{TaskHelpers.formatTime(subtask.metrics.timeBreakdown.trackedMinutes)} tracked</span>
                            </span>
                            {subtask.overrideGoal && (
                              subtask.goal
                                ? subtask.goal.id !== task.goalId && (<>
                                    <span className="text-muted-foreground/40">•</span>
                                    <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                      <Target className="h-3 w-3" />
                                      {subtask.goal.title}
                                    </span>
                                  </>)
                                : task.goalId && (<>
                                    <span className="text-muted-foreground/40">•</span>
                                    <span className="text-xs flex items-center gap-1 text-muted-foreground italic">
                                      No goal
                                    </span>
                                  </>)
                            )}
                          </div>
                        </div>
                        
                        {/* Subtask action buttons - only show if parent task is not completed */}
                        {!isParentCompleted && (
                          <div className="flex items-center justify-end gap-1">
                              {/* Today toggle button for subtask - only show if subtask and parent task not completed */}
                              {!isSubtaskCompleted && !task.isCompleted && (
                                <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleDayPlan(subtask.id, subtask.isPlannedOnDate ?? false)}
                                  className={`text-xs h-7 px-3 transition-all border ${
                                    subtask.isPlannedOnDate
                                      ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" 
                                      : "text-muted-foreground border-muted-foreground/20 hover:border-primary/30 hover:text-primary hover:bg-primary/5"
                                  }`}
                                  data-testid={`button-today-subtask-${subtask.id}`}
                                >
                                  {subtask.isPlannedOnDate ? (
                                    <>
                                      <X className="h-3 w-3 mr-1" />
                                      Remove
                                    </>
                                  ) : (
                                    <>
                                      <CalendarPlus className="h-3 w-3 mr-1" />
                                      Today
                                    </>
                                  )}
                                </Button>
                                <div className="h-4 w-px bg-border mx-1" />
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setNotesSubtask(subtask)}
                                title="Notes"
                              >
                                <FileText className="h-3 w-3" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-menu-subtask-${subtask.id}`}>
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => handleEditSubtask(subtask)}>
                                      <Edit className="mr-2 h-3 w-3" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteSubtask(subtask.id)}>
                                      <Trash className="mr-2 h-3 w-3" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                        )}
                      </div>
                      
                      {/* App Time Breakdown Accordion - Daily Breakdown */}
                      {(subtask.metrics.scheduleBreakdown.length > 0 || (subtask.metrics?.workSessions ?? []).length > 0) && (
                        <div className="mt-3 mr-3">
                          <Accordion type="single" collapsible>
                            <AccordionItem value={`apps-${subtask.id}`} className="border-none">
                              <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                                View more details
                              </AccordionTrigger>
                              <AccordionContent>
                                {/* Total Summary */}
                                <div className="mb-4 p-3 bg-muted/20 rounded-md border text-xs">
                                  <div className="flex justify-between items-center">
                                    <div className="text-muted-foreground">
                                      <span className="font-medium">Productivity: </span>
                                      <span className="font-bold">
                                        {subtask.metrics.timeBreakdown.trackedMinutes > 0
                                          ? `${Math.round(subtask.metrics.timeBreakdown.productivityRatio * 100)}%`
                                          : '–'}
                                      </span>
                                    </div>
                                    <div className="flex gap-3 text-xs text-muted-foreground">
                                      <span>Focus: {TaskHelpers.formatTime(subtask.metrics.timeBreakdown.focusMinutes)}</span>
                                      <span>Distraction: {TaskHelpers.formatTime(subtask.metrics.timeBreakdown.distractionMinutes)}</span>
                                      <span>Idle: {TaskHelpers.formatTime(subtask.metrics.timeBreakdown.idleMinutes)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  {(() => {
                                    // Merge dates from schedule breakdowns and work sessions
                                    const scheduleByDate: Record<string, typeof subtask.metrics.scheduleBreakdown[0]> = {};
                                    for (const sb of subtask.metrics.scheduleBreakdown) {
                                      scheduleByDate[sb.date] = sb;
                                    }
                                    const dateSet: Record<string, true> = {};
                                    for (const d of Object.keys(scheduleByDate)) dateSet[d] = true;
                                    for (const s of subtask.metrics?.workSessions ?? []) dateSet[s.date] = true;
                                    const allDates = Object.keys(dateSet).sort();

                                    return allDates.map((date) => {
                                      const breakdown = scheduleByDate[date];
                                      const dayWorked = getSessionMinutes(subtask, date);
                                      const tracked = breakdown?.timeBreakdown.trackedMinutes ?? 0;
                                      return (
                                      <div key={date} className="border rounded-md p-3 bg-background/30">
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-sm font-medium text-muted-foreground">
                                            {new Date(date).toLocaleDateString()}
                                          </span>
                                          <div className="flex gap-3 text-xs text-muted-foreground">
                                            <span className="font-medium">{TaskHelpers.formatTime(dayWorked)}</span>
                                            <span>•</span>
                                            <span className="font-medium">Tracked: {TaskHelpers.formatTime(tracked)}</span>
                                            {breakdown && tracked > 0 && (
                                              <>
                                                <span>•</span>
                                                <span>Focus: {TaskHelpers.formatTime(breakdown.timeBreakdown.focusMinutes)}</span>
                                                <span>Distraction: {TaskHelpers.formatTime(breakdown.timeBreakdown.distractionMinutes)}</span>
                                                <span>Idle: {TaskHelpers.formatTime(breakdown.timeBreakdown.idleMinutes)}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        {breakdown && breakdown.apps && breakdown.apps.length > 0 && (
                                        <div className="space-y-1">
                                          {TaskHelpers.groupAppsByUsage(breakdown.apps).map((app, index) => (
                                              <div key={`${date}-${app.app}-${index}`} className="flex justify-between p-1.5 rounded-md bg-background/50 border">
                                                <span className="text-xs font-medium">{app.app}</span>
                                                <div className="flex gap-3">
                                                  <span className="text-xs text-muted-foreground">
                                                    {TaskHelpers.formatTime(app.minutes)}
                                                  </span>
                                                  <span className="text-xs font-bold min-w-[3rem] text-right">
                                                    {app.percentage.toFixed(1)}%
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                        )}
                                      </div>
                                    );
                                    });
                                  })()}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Add Subtask Button - only show if task is not completed */}
            {!task.isCompleted && (
              <div className="mt-4 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSubtask(task.id)}
                  data-testid={`button-add-subtask-${task.id}`}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Subtask
                </Button>
              </div>
            )}
          </>
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