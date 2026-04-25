import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Pause, Zap, SkipForward, Undo2, FileText } from "lucide-react";
import { type SubtaskWithMetrics } from "@shared/types";
import { type Subtask } from "@shared/schema";
import { TaskHelpers } from "@/lib/taskHelpers";
import { useElapsedMinutes } from "@/hooks/useElapsedTime";
import { getTodayDate, getSessionMinutes } from "@/lib/taskUtils";

export function HabitSubtaskRow({
  subtask,
  frequency,
  onToggleActive,
  onToggleComplete,
  onSkip,
  onOpenNotes,
}: {
  subtask: SubtaskWithMetrics;
  frequency?: string | null;
  onToggleActive: (id: number, currentStatus: Subtask['status']) => void;
  onToggleComplete: (id: number, currentStatus: Subtask['status']) => void;
  onSkip?: (id: number) => void;
  onOpenNotes?: (subtask: { id: number; title: string }) => void;
}) {
  const elapsed = useElapsedMinutes(subtask.status === 'active' ? subtask.activatedAt : null);
  const today = getTodayDate();
  const todayWorked = getSessionMinutes(subtask, today) + elapsed;

  const isCompleted = subtask.status === 'completed';
  const isActive = subtask.status === 'active';
  const isSkipped = subtask.status === 'skipped';
  const frequencyLabel = frequency === 'custom' ? 'specific days' : (frequency ?? 'daily');

  const borderColor = isCompleted
    ? 'border-l-emerald-500/40'
    : isSkipped
      ? 'border-l-yellow-500'
      : isActive
        ? 'border-l-chart-2'
        : 'border-l-border';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border border-l-4 transition-all duration-200 ${borderColor} ${isActive
          ? 'bg-chart-2/5 ring-1 ring-chart-2/20'
          : isSkipped || isCompleted
            ? 'bg-muted/10'
            : 'bg-muted/20'
        }`}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => onToggleComplete(subtask.id, subtask.status)}
        className={isCompleted || isSkipped ? 'opacity-50' : ''}
        disabled={isSkipped}
      />

      <span className={`text-sm flex-1 truncate ${isCompleted || isSkipped ? 'text-muted-foreground/60' : ''}`}>
        <span className={isCompleted ? 'line-through' : ''}>{subtask.title}</span>
        <span className="text-[10px] text-muted-foreground/50 ml-1.5">· {frequencyLabel}</span>
      </span>

      {isActive && (
        <Zap className="h-3 w-3 text-chart-2 shrink-0" />
      )}

      {!isSkipped && (
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {TaskHelpers.formatTime(todayWorked)}{subtask.estimatedMinutes ? ` / ${TaskHelpers.formatTime(subtask.estimatedMinutes)}` : ''}
        </span>
      )}

      {!isCompleted && (
        <div className="flex items-center gap-0.5">
          {onOpenNotes && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenNotes({ id: subtask.id, title: subtask.title })}>
              <FileText className="h-3 w-3" />
            </Button>
          )}
          {onSkip && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onSkip(subtask.id)}
              title={isSkipped ? 'Un-skip' : 'Skip'}
            >
              {isSkipped
                ? <Undo2 className="h-3 w-3" />
                : <SkipForward className="h-3 w-3" />
              }
            </Button>
          )}
          {!isSkipped && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onToggleActive(subtask.id, subtask.status)}
            >
              {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
          )}
        </div>
      )}

      {isCompleted && onOpenNotes && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenNotes({ id: subtask.id, title: subtask.title })}>
          <FileText className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
