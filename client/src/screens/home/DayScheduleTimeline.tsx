import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, GripVertical, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useScheduledSubtasks, useUpdateSubtask, useWorkSessionsByDate } from "@/hooks/useTasks";
import { dateUtils } from "@shared/utils";

interface DayScheduleTimelineProps {
  date?: string; // YYYY-MM-DD format, defaults to today
  onTaskScheduled?: (task: { id: string; title: string; estimatedTime: number; startTime: number }) => void;
  startHour?: number;
  endHour?: number;
}

export default function DayScheduleTimeline({
  date = dateUtils.getTodayDate(),
  onTaskScheduled,
  startHour = 0,
  endHour = 24
}: DayScheduleTimelineProps) {
  // Fetch scheduled subtasks for the date
  const { data: allScheduledSubtasks = [], isLoading } = useScheduledSubtasks(date);

  // Fetch work sessions for the date (for overlay)
  const { data: workSessions = [] } = useWorkSessionsByDate(date);

  // Filter out subtasks that don't have a scheduledStartTime
  const scheduledSubtasks = allScheduledSubtasks.filter(subtask => subtask.scheduledStartTime !== null);

  const scheduleTaskMutation = useUpdateSubtask();

  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [draggedFromOutside, setDraggedFromOutside] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Current time as minutes from midnight
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on first render
  const scrollToCurrentTime = useCallback(() => {
    if (hasScrolledRef.current) return;
    if (scrollContainerRef.current && currentTimeRef.current) {
      const container = scrollContainerRef.current;
      const timeLine = currentTimeRef.current;
      const containerHeight = container.clientHeight;
      const timeLineOffset = timeLine.offsetTop;
      container.scrollTop = timeLineOffset - containerHeight / 3;
      hasScrolledRef.current = true;
    }
  }, []);

  useEffect(() => {
    // Small delay to ensure DOM is rendered
    const timeout = setTimeout(scrollToCurrentTime, 100);
    return () => clearTimeout(timeout);
  }, [scrollToCurrentTime, isLoading]);

  // Current time position as percentage
  const currentTimePosition = (() => {
    const timelineStart = startHour * 60;
    const timelineEnd = endHour * 60;
    const timelineHeight = timelineEnd - timelineStart;
    const relative = Math.max(0, Math.min(currentTimeMinutes - timelineStart, timelineHeight));
    return (relative / timelineHeight) * 100;
  })();

  const isCurrentTimeVisible = currentTimeMinutes >= startHour * 60 && currentTimeMinutes <= endHour * 60;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Generate uniform 30-minute time slots for the day
  const generateTimeSlots = () => {
    const slots = [];
    const startMinutes = startHour * 60;
    const endMinutes = endHour * 60;

    // Create a slot every 30 minutes
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const isHour = minutes % 60 === 0;

      slots.push({
        time: minutes,
        label: formatTime(minutes),
        hour: hour,
        isHour: isHour
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Assign columns to overlapping subtasks
  const getColumnLayout = (subtasks: typeof scheduledSubtasks) => {
    const sorted = [...subtasks].sort((a, b) => (a.scheduledStartTime || 0) - (b.scheduledStartTime || 0));
    const placed: { id: number; end: number; col: number }[] = [];

    for (const subtask of sorted) {
      const start = subtask.scheduledStartTime || 0;
      const end = start + (subtask.estimatedMinutes || 60);

      // Find first column not occupied by an overlapping item
      const overlapping = placed.filter(p => p.end > start);
      const usedCols = new Set(overlapping.map(p => p.col));
      let col = 0;
      while (usedCols.has(col)) col++;

      placed.push({ id: subtask.id, end, col });
    }

    // For each item, totalCols = max columns used among all its overlapping peers
    const layout = new Map<number, { col: number; totalCols: number }>();
    for (const item of placed) {
      const start = sorted.find(s => s.id === item.id)!.scheduledStartTime || 0;
      const overlapping = placed.filter(p => {
        const pStart = sorted.find(s => s.id === p.id)!.scheduledStartTime || 0;
        return pStart < item.end && (pStart + (sorted.find(s => s.id === p.id)!.estimatedMinutes || 60)) > start;
      });
      const totalCols = Math.max(...overlapping.map(p => p.col)) + 1;
      layout.set(item.id, { col: item.col, totalCols });
    }

    return layout;
  };

  const columnLayout = getColumnLayout(scheduledSubtasks);

  // Calculate position and height for scheduled subtasks
  const getTaskPosition = (subtask: any) => {
    const startMinutes = subtask.scheduledStartTime!;
    const timelineStart = startHour * 60;
    const timelineEnd = endHour * 60;
    const timelineHeight = timelineEnd - timelineStart;

    const relativeStart = Math.max(0, startMinutes - timelineStart);
    const top = (relativeStart / timelineHeight) * 100;

    const duration = subtask.estimatedMinutes || 60;
    const height = (duration / timelineHeight) * 100;

    // Column-based horizontal positioning
    const layout = columnLayout.get(subtask.id);
    const col = layout?.col ?? 0;
    const totalCols = layout?.totalCols ?? 1;
    const widthPercent = 100 / totalCols;
    const leftPercent = col * widthPercent;

    return {
      top: `${top}%`,
      height: `${height}%`,
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // Compute work session block positions
  const getSessionBlocks = () => {
    const timelineStart = startHour * 60;
    const timelineEnd = endHour * 60;
    const timelineHeight = timelineEnd - timelineStart;

    return workSessions
      .map((session) => {
        const start = new Date(session.startedAt);
        const end = session.endedAt ? new Date(session.endedAt) : new Date();
        const startMin = start.getHours() * 60 + start.getMinutes();
        const endMin = end.getHours() * 60 + end.getMinutes();

        const clampedStart = Math.max(startMin, timelineStart);
        const clampedEnd = Math.min(endMin, timelineEnd);
        if (clampedEnd <= clampedStart) return null;

        const top = ((clampedStart - timelineStart) / timelineHeight) * 100;
        const height = ((clampedEnd - clampedStart) / timelineHeight) * 100;
        return { top, height, id: session.id };
      })
      .filter(Boolean) as { top: number; height: number; id: number }[];
  };

  const sessionBlocks = getSessionBlocks();



  const handleRemoveFromSchedule = async (taskId: number) => {
    try {
      await scheduleTaskMutation.mutateAsync({
        id: taskId,
        updates: { scheduledStartTime: null }
      });
      console.log(`Task ${taskId} removed from schedule`);
    } catch (error) {
      console.error('Error removing task from schedule:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    console.log(`Starting to drag scheduled task: ${taskId}`);
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    // Set a marker to indicate this is an internal drag
    e.dataTransfer.setData('text/plain', `internal-task-${taskId}`);
  };

  const handleDragEnd = () => {
    console.log("Drag ended, clearing states");
    setDraggedTask(null);
    setDraggedFromOutside(false);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    // If no internal task is being dragged, this must be external
    if (!draggedTask) {
      setDraggedFromOutside(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDraggedFromOutside(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, dropTimeMinutes: number) => {
    e.preventDefault();

    try {
      // Check if this is a task from DayPlan
      const taskDataStr = e.dataTransfer.getData('application/json');
      if (taskDataStr) {
        const taskData = JSON.parse(taskDataStr);

        await scheduleTaskMutation.mutateAsync({
          id: taskData.id,
          updates: { scheduledStartTime: dropTimeMinutes }
        });

        // Notify parent component
        onTaskScheduled?.({
          id: taskData.id,
          title: taskData.title,
          estimatedTime: taskData.estimatedTime || 60,
          startTime: dropTimeMinutes
        });

        console.log(`Task "${taskData.title}" scheduled at ${formatTime(dropTimeMinutes)}`);
      } else if (draggedTask) {
        const taskId = draggedTask;
        await scheduleTaskMutation.mutateAsync({
          id: taskId,
          updates: { scheduledStartTime: dropTimeMinutes }
        });

        console.log(`Task ${taskId} moved to ${formatTime(dropTimeMinutes)}`);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }

    setDraggedTask(null);
    setDraggedFromOutside(false);
  };

  // Find current or next scheduled item
  const getScheduledLabel = () => {
    const mins = currentTimeMinutes;
    const upcoming = scheduledSubtasks
      .filter(s => s.scheduledStartTime !== null && s.status !== 'completed')
      .sort((a, b) => a.scheduledStartTime! - b.scheduledStartTime!);
    const current = upcoming.find(s =>
      s.scheduledStartTime! <= mins &&
      (s.scheduledStartTime! + (s.estimatedMinutes || 60)) > mins
    );
    const next = upcoming.find(s => s.scheduledStartTime! > mins);
    if (current) return current.title;
    if (next) return formatTime(next.scheduledStartTime!);
    return '';
  };

  if (isLoading) {
    return (
      <Card className="h-full min-h-[600px]">
        <CardHeader>
          <CardTitle>Day Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            Loading scheduled tasks...
          </div>
        </CardContent>
      </Card>
    );
  }

  const scheduledLabel = getScheduledLabel();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 border-b pb-4 h-[5.5rem] justify-center">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Day Schedule</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {scheduledSubtasks.length} scheduled items
            </p>
          </div>
          {scheduledLabel && (
            <div className="text-right leading-tight">
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wide">Up next</p>
              <p className="flex items-center justify-end gap-1 text-sm text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                {scheduledLabel}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden rounded-b-xl">
        <div ref={scrollContainerRef} className="relative h-full overflow-y-auto overflow-x-hidden scrollbar-clean">
          {/* Timeline container - scrolls as one unit */}
          <div className="flex">
            {/* Time labels - show only on hour marks */}
            <div className="w-20 bg-muted/20 border-r relative">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.time}
                  className="h-12 flex items-start justify-end pr-3 pt-1 text-xs text-muted-foreground border-b border-muted/20"
                >
                  {slot.isHour ? slot.label : ''}
                </div>
              ))}
              {/* Work session bars on the right edge of time sidebar */}
              {sessionBlocks.map((block) => (
                <div
                  key={`session-${block.id}`}
                  className="absolute right-0 w-[3px] bg-status-success rounded-full pointer-events-none z-20"
                  style={{ top: `${block.top}%`, height: `${block.height}%` }}
                />
              ))}
            </div>

            {/* Schedule area */}
            <div
              className="flex-1 relative bg-background"
              onDragLeave={handleDragLeave}
            >
              {/* Time slot grid - uniform 30-minute intervals */}
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.time}
                  className="relative h-12 border-b border-muted/20 hover:bg-muted/10 cursor-pointer transition-colors group"
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, slot.time)}
                  data-testid={`time-slot-${index}`}
                >
                  {/* Subtle but visible drop zone */}
                  {(draggedTask || draggedFromOutside) && (
                    <div className="absolute inset-0 border border-status-info/60 bg-status-info/10 opacity-40 hover:opacity-80 transition-all duration-200 flex items-center justify-center">
                      <span className="text-xs text-status-info-foreground bg-background/70 px-1.5 py-0.5 rounded">
                        {slot.label}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* Current time indicator */}
              {isCurrentTimeVisible && (
                <div
                  ref={currentTimeRef}
                  className="absolute left-0 right-0 z-30 pointer-events-none"
                  style={{ top: `${currentTimePosition}%` }}
                >
                  <div className="flex-1 h-[2px] bg-status-info shadow-sm" />
                </div>
              )}

              {/* Scheduled subtasks */}
              {scheduledSubtasks.map((subtask) => {
                const position = getTaskPosition(subtask);
                const isDragging = draggedTask === subtask.id;
                const startTime = subtask.scheduledStartTime || 0;
                const duration = subtask.estimatedMinutes || 60;
                const isCompact = duration < 30;

                return (
                  <div
                    key={subtask.id}
                    className={`absolute bg-background border border-border rounded-md shadow-sm transition-all duration-200 overflow-hidden border-l-4 border-l-status-info cursor-move hover:shadow-lg ${isCompact ? 'px-2 py-0.5' : 'px-2 py-1'
                      } ${isDragging ? 'opacity-50 scale-105 shadow-lg border-status-info' : ''
                      } ${(draggedTask || draggedFromOutside) && !isDragging ? 'pointer-events-none' : 'z-10 hover:z-20'
                      }`}
                    style={isCompact ? { ...position, minHeight: '1.5rem' } : position}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, subtask.id)}
                    onDragEnd={handleDragEnd}
                    data-testid={`scheduled-task-${subtask.id}`}
                  >
                    <div className={`flex items-center gap-1.5 h-full group/task`}>
                      <GripVertical className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">
                          {subtask.title}
                          {isCompact && <span className="text-muted-foreground font-normal"> ({formatDuration(duration)})</span>}
                        </div>
                        {!isCompact && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            <span>
                              {formatTime(startTime)} - {formatTime(startTime + duration)}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {formatDuration(duration)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromSchedule(subtask.id);
                        }}
                        className={`flex-shrink-0 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors
                        `}
                        title="Remove from schedule"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}


            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}