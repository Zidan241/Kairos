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
  Clock,
  Calendar,
  AlertTriangle,
  Check,
  MoreHorizontal,
  Edit,
  Trash,
  X,
  CalendarCheck,
  CalendarPlus,
} from "lucide-react";
import { SubtaskWithMetrics, type TaskWithMetrics } from "@shared/metrics";
import { calculateTaskProgress } from "@/lib/taskUtils";
import { TaskHelpers } from "@/components/utils/taskHelpers";

interface TaskCardProps {
  task: TaskWithMetrics;
  handleCompleteTask: (taskId: number, isCompleted: boolean) => void;
  handleCompleteSubtask: (subtaskId: number, isCompleted: boolean) => void;
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
  const priority = TaskHelpers.getTaskPriority(task.priority);
  const deadline = TaskHelpers.getTaskDeadlineUrgency(task.dueDate);
  const isOverdue = TaskHelpers.isOverdue(task.isCompleted, task.dueDate);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  
  // Calculate progress using utility function
  const progress = calculateTaskProgress(task);
  
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
              <CardTitle className={titleClassName} data-testid={`task-title-${task.id}`}>
                {task.title}
              </CardTitle>
              {task.description && (
                <p className={`text-sm text-muted-foreground mb-2 ${task.isCompleted ? 'line-through' : ''}`}>
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className={`h-3 w-3 ${TaskHelpers.getStatusColor(task.isCompleted, progress.trackedMinutes > progress.totalMinutes, progress.progress)}`} />
                  <span 
                    data-testid={`task-time-${task.id}`}
                    className={TaskHelpers.getStatusColor(task.isCompleted,  progress.trackedMinutes > progress.totalMinutes, progress.progress)}
                  >
                    {TaskHelpers.formatTime(isEmptyTask ? 0 : progress.trackedMinutes)} / {TaskHelpers.formatTime(progress.totalMinutes)}
                  </span>
                </div>
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${isOverdue ? "text-chart-5" : "text-muted-foreground"}`}>
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
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
            {!task.isCompleted && 
            <>
                {deadline && (
                <Badge 
                    variant="outline"
                    className={`flex items-center justify-center ${TaskHelpers.getBadgeTheme(deadline.variant === "destructive" ? 'deadline-urgent' : 'deadline-warning')}`}
                >
                    {deadline.icon}
                    <span className="ml-1">{deadline.text}</span>
                </Badge>
                )}

                <Badge variant="outline" className={`flex items-center justify-center ${TaskHelpers.getBadgeTheme('priority')}`}>
                  {priority.icon}
                  <span className="ml-1">{priority.text}</span>
                </Badge>
            </>
            }

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
            {task.subtasks?.filter((st) => st.isCompleted).length || 0} / {task.subtasks?.length || 0} subtasks
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
                .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted))
                .map((subtask) => {
                  const isParentCompleted = task.isCompleted;
                  const subtaskClassName = isParentCompleted 
                    ? "border rounded-lg p-3 bg-muted/30 opacity-60" 
                    : "border rounded-lg p-3 bg-muted/30";
                  
                  return (
                    <div key={subtask.id} className={subtaskClassName}>
                      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 mb-2">
                        <Checkbox
                          checked={subtask.isCompleted}
                          onCheckedChange={() => handleCompleteSubtask(subtask.id, subtask.isCompleted)}
                          data-testid={`checkbox-subtask-${subtask.id}`}
                          className="mt-1"
                          disabled={isParentCompleted}
                        />
                        <div className="min-w-0">
                          <span className={`font-medium text-sm block mb-1 ${
                            subtask.isCompleted ? "line-through" : ""
                          }`}>
                            {subtask.title}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs ${TaskHelpers.getStatusColor(subtask.isCompleted, subtask.metrics.timeBreakdown.totalMinutes > subtask.estimatedMinutes, (subtask.metrics.timeBreakdown.totalMinutes / subtask.estimatedMinutes) * 100)}`}>
                              {TaskHelpers.formatTime(subtask.metrics.timeBreakdown.totalMinutes)} / {TaskHelpers.formatTime(subtask.estimatedMinutes)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Subtask action buttons - only show if parent task is not completed */}
                        {!isParentCompleted && (
                          <div className="flex items-center justify-end gap-1 w-[160px]">
                              {/* Today toggle button for subtask - only show if subtask and parent task not completed */}
                              {!subtask.isCompleted && !task.isCompleted && (
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
                              )}
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" data-testid={`button-menu-subtask-${subtask.id}`}>
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
                      {subtask.metrics.scheduleBreakdown.length > 0 && subtask.metrics.scheduleBreakdown.some(sb => sb.apps && sb.apps.length > 0) && (
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
                                        {Math.round(subtask.metrics.timeBreakdown.productivityRatio * 100)}%
                                      </span>
                                    </div>
                                    <div className="flex gap-3 text-xs text-muted-foreground">
                                      <span className="font-medium">Total: {TaskHelpers.formatTime(subtask.metrics.timeBreakdown.totalMinutes)}</span>
                                      <span >•</span>
                                      <span>Focus: {TaskHelpers.formatTime(subtask.metrics.timeBreakdown.focusMinutes)}</span>
                                      <span>Distraction: {TaskHelpers.formatTime(subtask.metrics.timeBreakdown.distractionMinutes)}</span>
                                      <span>Idle: {TaskHelpers.formatTime(subtask.metrics.timeBreakdown.idleMinutes)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  {subtask.metrics.scheduleBreakdown
                                    .filter(sb => sb.apps && sb.apps.length > 0)
                                    .map((dailyBreakdown) => (
                                      <div key={dailyBreakdown.date} className="border rounded-md p-3 bg-background/30">
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-sm font-medium text-muted-foreground">
                                            {new Date(dailyBreakdown.date).toLocaleDateString()}
                                          </span>
                                          <div className="flex gap-3 text-xs text-muted-foreground">
                                            <span className="font-medium">Total: {TaskHelpers.formatTime(dailyBreakdown.timeBreakdown.totalMinutes)}</span>
                                            <span>•</span>
                                            <span>Focus: {TaskHelpers.formatTime(dailyBreakdown.timeBreakdown.focusMinutes)}</span>
                                            <span>Distraction: {TaskHelpers.formatTime(dailyBreakdown.timeBreakdown.distractionMinutes)}</span>
                                            <span>Idle: {TaskHelpers.formatTime(dailyBreakdown.timeBreakdown.idleMinutes)}</span>
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          {TaskHelpers.groupAppsByUsage(dailyBreakdown.apps).map((app, index) => (
                                              <div key={`${dailyBreakdown.date}-${app.app}-${index}`} className="flex justify-between p-2 rounded-md bg-background/50 border">
                                                <span className="text-sm font-medium">{app.app}</span>
                                                <div className="flex gap-3">
                                                  <span className="text-sm text-muted-foreground">
                                                    {TaskHelpers.formatTime(app.minutes)}
                                                  </span>
                                                  <span className="text-sm font-bold min-w-[3rem] text-right">
                                                    {app.percentage.toFixed(1)}%
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    ))}
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
    </Card>
  );
}