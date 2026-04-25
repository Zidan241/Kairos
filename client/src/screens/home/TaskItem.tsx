import { Button } from "@/components/ui/button";
import { Zap, ChevronDown, ChevronRight } from "lucide-react";
import { type TaskWithMetrics } from "@shared/types";
import { type Subtask } from "@shared/schema";
import { useState } from "react";
import { SubtaskRow } from "./SubtaskRow";
import { HabitSubtaskRow } from "./HabitSubtaskRow";

interface TaskItemProps {
  task: TaskWithMetrics;
  onToggleSubtaskActive: (subtaskId: number, currentStatus: Subtask['status']) => void;
  onToggleSubtaskComplete: (subtaskId: number, currentStatus: Subtask['status']) => void;
  onOpenNotes?: (subtask: { id: number; title: string }) => void;
  onSkipSubtask?: (subtaskId: number) => void;
}

export default function TaskItem({
  task,
  onToggleSubtaskActive,
  onToggleSubtaskComplete,
  onOpenNotes,
  onSkipSubtask,
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const allSubtasksCompleted = hasSubtasks && task.subtasks.every(subtask => subtask.status === 'completed');
  const hasActiveSubtask = hasSubtasks && task.subtasks.some(subtask => subtask.status === 'active');

  if (task.isHabit && hasSubtasks) {
    return (
      <div className="space-y-0.5">
        {task.subtasks
          .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'))
          .map(subtask => (
            <HabitSubtaskRow
              key={subtask.id}
              subtask={subtask}
              frequency={task.frequency}
              onToggleActive={onToggleSubtaskActive}
              onToggleComplete={onToggleSubtaskComplete}
              onSkip={onSkipSubtask}
              onOpenNotes={onOpenNotes}
            />
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-200 ${allSubtasksCompleted ? 'opacity-60' : ''} ${hasActiveSubtask && !isExpanded ? 'border-chart-2 bg-chart-2/5 ring-1 ring-chart-2/20' : 'bg-card'}`}
      >
        <div className="flex-1 min-w-0 overflow-hidden">
          <span className={`text-sm font-medium truncate ${allSubtasksCompleted ? 'line-through' : ''}`} data-testid={`text-task-title-${task.id}`}>
            {task.title}
          </span>
        </div>
        {hasActiveSubtask && !isExpanded && <Zap className="h-3 w-3 text-chart-2 shrink-0" />}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
      </div>
      {hasSubtasks && isExpanded && (
        <div className="space-y-1">
          {task.subtasks
            .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'))
            .map(subtask => (
              <SubtaskRow
                key={subtask.id}
                subtask={subtask}
                onToggleActive={onToggleSubtaskActive}
                onToggleComplete={onToggleSubtaskComplete}
                onOpenNotes={onOpenNotes}
              />
            ))}
        </div>
      )}
    </div>
  );
}
