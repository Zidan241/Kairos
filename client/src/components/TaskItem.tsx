import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Play, Pause, Zap, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { type TaskWithMetrics, type SubtaskWithMetrics } from "@shared/metrics";
import { useState } from "react";
import { TaskHelpers } from "@/components/utils/taskHelpers";
import { useElapsedMinutes } from "@/hooks/useElapsedTime";
import { getTodayDate, getSessionMinutes } from "@/lib/taskUtils";

interface TaskItemProps {
  task: TaskWithMetrics;
  onToggleSubtaskActive: (subtaskId: number, isActive: boolean) => void;
  onToggleSubtaskComplete: (subtaskId: number, isCompleted: boolean) => void;
  onOpenNotes?: (subtask: { id: number; title: string }) => void;
}

// Circular Progress Component
function CircularProgress({ 
  progress, 
  size = 16, 
  strokeWidth = 4, 
  isOverTime = false, 
  isCompleted = false 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number; 
  isOverTime?: boolean; 
  isCompleted?: boolean; 
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  
  // Ensure minimum visible progress (at least 5% visible)
  const minProgress = 5;
  const displayProgress = Math.max(progress, minProgress);
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-20"
        />
        {/* Dotted line for remaining progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={strokeWidth - 1}
          fill="transparent"
          strokeDasharray="2 3"
          className="opacity-30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={TaskHelpers.getStrokeColor(isCompleted, isOverTime, progress)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
    </div>
  );
}

export default function TaskItem({
  task,
  onToggleSubtaskActive,
  onToggleSubtaskComplete,
  onOpenNotes,
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const allSubtasksCompleted = hasSubtasks && task.subtasks.every(subtask => subtask.isCompleted);

  const renderTask = () => (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
        allSubtasksCompleted ? 'opacity-60' : ''
      } bg-card`}
    >
      <div className="flex-1 min-w-0 overflow-hidden">
        <span className={`font-medium break-words ${allSubtasksCompleted ? 'line-through' : ''}`} data-testid={`text-task-title-${task.id}`}>
          {task.title}
        </span>
      </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
    </div>
  );

  // Subtask rendering
  const renderSubtask = (subtask: SubtaskWithMetrics) => (
    <SubtaskRow
      key={subtask.id}
      subtask={subtask}
      onToggleActive={onToggleSubtaskActive}
      onToggleComplete={onToggleSubtaskComplete}
      onOpenNotes={onOpenNotes}
    />
  );

  return (
    <div className="space-y-2">
      {renderTask()}
      {hasSubtasks && isExpanded && (
        <div className="space-y-2">
          {task.subtasks
            .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted))
            .map(renderSubtask)}
        </div>
      )}
    </div>
  );
}

// ---- Subtask row (extracted as component so hooks work) ----

function SubtaskRow({
  subtask,
  onToggleActive,
  onToggleComplete,
  onOpenNotes,
}: {
  subtask: SubtaskWithMetrics;
  onToggleActive: (id: number, isActive: boolean) => void;
  onToggleComplete: (id: number, isCompleted: boolean) => void;
  onOpenNotes?: (s: { id: number; title: string }) => void;
}) {
  const elapsed = useElapsedMinutes(subtask.isActive ? subtask.activatedAt : null);

  const today = getTodayDate();

  // Today's worked time (for display)
  const todayWorked = getSessionMinutes(subtask, today) + elapsed;

  // All-time worked time (for progress — estimate is total, not per-day)
  const totalWorked = getSessionMinutes(subtask) + elapsed;

  const overallProgress = Math.min((totalWorked / subtask.estimatedMinutes) * 100, 100);
  const isOverEstimate = totalWorked > subtask.estimatedMinutes;

  const hasPriorWork = totalWorked > todayWorked;

  const handleDragStart = (e: React.DragEvent) => {
    if (subtask.isCompleted) { e.preventDefault(); return; }
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: subtask.id,
      title: subtask.title,
      estimatedTime: subtask.estimatedMinutes,
      type: 'subtask' as const,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
        subtask.isCompleted
          ? 'opacity-60'
          : subtask.isActive
          ? 'border-chart-2 bg-chart-2/5 shadow-lg shadow-chart-2/20 ring-1 ring-chart-2/20'
          : ''
      } ml-6 ${subtask.isActive ? '' : 'bg-muted/30'} ${
        !subtask.isCompleted ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      draggable={!subtask.isCompleted}
      onDragStart={handleDragStart}
    >
      <Checkbox
        checked={subtask.isCompleted}
        onCheckedChange={() => onToggleComplete(subtask.id, subtask.isCompleted)}
        data-testid={`checkbox-task-${subtask.id}`}
      />

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-start gap-2 mb-2">
          <span className={`font-medium break-words ${subtask.isCompleted ? 'line-through' : ''}`} data-testid={`text-task-title-${subtask.id}`}>
            {subtask.title}
          </span>
          {subtask.isActive && (
            <Badge
              variant="secondary"
              className="text-xs bg-chart-2 text-white border-chart-2 transition-all duration-200 shrink-0"
            >
              <Zap className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span className={TaskHelpers.getStatusColor(subtask.isCompleted, isOverEstimate, overallProgress)}>
              {TaskHelpers.formatTime(totalWorked)} / {TaskHelpers.formatTime(subtask.estimatedMinutes)}
            </span>
            {!subtask.isCompleted && (
              <CircularProgress
                progress={overallProgress}
                isOverTime={isOverEstimate}
                isCompleted={subtask.isCompleted}
              />
            )}
          </div>
          {hasPriorWork && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground" data-testid={`text-time-${subtask.id}`}>
                {TaskHelpers.formatTime(todayWorked)} today
              </span>
            </>
          )}
        </div>
      </div>

      {!subtask.isCompleted ? (
        <div className="flex items-center gap-1">
          {onOpenNotes && (
            <Button variant="ghost" size="icon" onClick={() => onOpenNotes({ id: subtask.id, title: subtask.title })}>
              <FileText className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleActive(subtask.id, subtask.isActive)}
            data-testid={`button-toggle-${subtask.id}`}
          >
            {subtask.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        onOpenNotes && (
          <Button variant="ghost" size="icon" onClick={() => onOpenNotes({ id: subtask.id, title: subtask.title })}>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </Button>
        )
      )}
    </div>
  );
}