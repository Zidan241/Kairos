import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CircularProgress } from "@/components/ui/circularProgress";
import { Play, Pause, Zap, FileText } from "lucide-react";
import { type SubtaskWithMetrics } from "@shared/types";
import { type Subtask } from "@shared/schema";
import { TaskHelpers } from "@/lib/taskHelpers";
import { useElapsedMinutes } from "@/hooks/useElapsedTime";
import { getTodayDate, getSessionMinutes } from "@/lib/taskUtils";

export function SubtaskRow({
  subtask,
  onToggleActive,
  onToggleComplete,
  onOpenNotes,
}: {
  subtask: SubtaskWithMetrics;
  onToggleActive: (id: number, currentStatus: Subtask['status']) => void;
  onToggleComplete: (id: number, currentStatus: Subtask['status']) => void;
  onOpenNotes?: (s: { id: number; title: string }) => void;
}) {
  const isCompleted = subtask.status === 'completed';
  const isActive = subtask.status === 'active';
  const elapsed = useElapsedMinutes(isActive ? subtask.activatedAt : null);

  const today = getTodayDate();

  // Today's worked time (for display)
  const todayWorked = getSessionMinutes(subtask, today) + elapsed;

  // All-time worked time (for progress — estimate is total, not per-day)
  const totalWorked = getSessionMinutes(subtask) + elapsed;

  const est = subtask.estimatedMinutes ?? 0;
  const overallProgress = est > 0 ? Math.min((totalWorked / est) * 100, 100) : 0;
  const isOverEstimate = est > 0 && totalWorked > est;

  const hasPriorWork = totalWorked > todayWorked;

  const handleDragStart = (e: React.DragEvent) => {
    if (isCompleted) { e.preventDefault(); return; }
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: subtask.id,
      title: subtask.title,
      estimatedTime: subtask.estimatedMinutes ?? 30,
      type: 'subtask' as const,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const borderColor = isActive
    ? 'border-l-chart-2'
    : 'border-l-border';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border border-l-4 transition-all duration-200 ${borderColor} ${isCompleted
          ? 'bg-muted/10'
          : isActive
            ? 'bg-chart-2/5 ring-1 ring-chart-2/20'
            : 'bg-muted/30'
        } ml-6 ${!isCompleted ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      draggable={!isCompleted}
      onDragStart={handleDragStart}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => onToggleComplete(subtask.id, subtask.status)}
        className={`h-3.5 w-3.5 ${isCompleted ? 'opacity-50' : ''}`}
        data-testid={`checkbox-task-${subtask.id}`}
      />

      <span className={`text-sm flex-1 truncate ${isCompleted ? 'line-through text-muted-foreground/60' : ''}`} data-testid={`text-task-title-${subtask.id}`}>
        {subtask.title}
      </span>

      {isActive && (
        <Zap className="h-3 w-3 text-chart-2 shrink-0" />
      )}

      <span className="text-[11px] text-muted-foreground tabular-nums">
        <span className={TaskHelpers.getStatusColor(isCompleted, isOverEstimate, overallProgress)}>
          {TaskHelpers.formatTime(totalWorked)}{est > 0 && <> / {TaskHelpers.formatTime(est)}</>}
        </span>
        {hasPriorWork && (
          <span className="text-muted-foreground/50"> · {TaskHelpers.formatTime(todayWorked)} today</span>
        )}
      </span>

      {!isCompleted && est > 0 && (
        <CircularProgress
          progress={overallProgress}
          size={14}
          strokeWidth={3}
          isOverTime={isOverEstimate}
        />
      )}

      {!isCompleted ? (
        <div className="flex items-center gap-0.5">
          {onOpenNotes && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenNotes({ id: subtask.id, title: subtask.title })}>
              <FileText className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onToggleActive(subtask.id, subtask.status)}
            data-testid={`button-toggle-${subtask.id}`}
          >
            {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
        </div>
      ) : (
        onOpenNotes && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenNotes({ id: subtask.id, title: subtask.title })}>
            <FileText className="h-3 w-3" />
          </Button>
        )
      )}
    </div>
  );
}
