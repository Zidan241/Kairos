import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, GripVertical, X, Calendar } from "lucide-react";
import { useState } from "react";
import { useScheduledSubtasks, useUpdateSubtask } from "@/hooks/useTasks";
import { dateUtils } from "@shared/utils";

// Quick calendar event type
interface CalendarEvent {
  id: string;
  title: string;
  startTime: number; // minutes from midnight
  duration: number;  // duration in minutes
  source: string;
}

interface DayScheduleTimelineProps {
  date?: string; // YYYY-MM-DD format, defaults to today
  onTaskScheduled?: (task: { id: string; title: string; estimatedTime: number; startTime: number }) => void;
  startHour?: number; // Default 6 AM
  endHour?: number;   // Default 10 PM
}

export default function DayScheduleTimeline({ 
  date = dateUtils.getTodayDate(),
  onTaskScheduled,
  startHour = 6,  // Default: 6 AM
  endHour = 22    // Default: 10 PM
}: DayScheduleTimelineProps) {
  // Fetch scheduled subtasks for the date
  const { data: allScheduledSubtasks = [], isLoading } = useScheduledSubtasks(date);
  
  // Filter out subtasks that don't have a scheduledStartTime
  const scheduledSubtasks = allScheduledSubtasks.filter(subtask => subtask.scheduledStartTime !== null);

  // Mock calendar events - replace with real API later
  const calendarEvents: CalendarEvent[] = [
    {
      id: 'cal-1',
      title: 'Team Standup',
      startTime: 9 * 60, // 9:00 AM
      duration: 45,
      source: 'Google Calendar'
    },
    {
      id: 'cal-2', 
      title: 'Client Meeting',
      startTime: 14 * 60, // 2:00 PM
      duration: 60,
      source: 'Outlook'
    },
    {
      id: 'cal-3',
      title: 'Lunch Break',
      startTime: 12 * 60, // 12:00 PM  
      duration: 60,
      source: 'Personal'
    }
  ];

  const scheduleTaskMutation = useUpdateSubtask();

  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [draggedFromOutside, setDraggedFromOutside] = useState<boolean>(false);

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

  // Calculate position and height for scheduled subtasks
  const getTaskPosition = (subtask: any) => {    
    const startMinutes = subtask.scheduledStartTime!;
    const timelineStart = startHour * 60;
    const timelineEnd = endHour * 60;
    const timelineHeight = timelineEnd - timelineStart; // Total minutes in timeline
    
    // Calculate position as percentage from top - each slot is 30 minutes
    const relativeStart = Math.max(0, startMinutes - timelineStart);
    const top = (relativeStart / timelineHeight) * 100;
    
    // Calculate height as percentage - use estimatedMinutes for duration
    const duration = subtask.estimatedMinutes || 60;
    const height = (duration / timelineHeight) * 100;
    
    return { top: `${top}%`, height: `${height}%` };
  };

  // Calculate position for calendar events (same logic as tasks)
  const getEventPosition = (event: CalendarEvent) => {
    const timelineStart = startHour * 60;
    const timelineEnd = endHour * 60; 
    const timelineHeight = timelineEnd - timelineStart;
    
    const relativeStart = Math.max(0, event.startTime - timelineStart);
    const top = (relativeStart / timelineHeight) * 100;
    const height = (event.duration / timelineHeight) * 100;
    
    return { top: `${top}%`, height: `${height}%` };
  };

  const handleTimeSlotClick = (timeMinutes: number) => {
  };

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Day Schedule</CardTitle>
        <p className="text-sm text-muted-foreground">
          {scheduledSubtasks.length} scheduled items • {formatTime(startHour * 60)} - {formatTime(endHour * 60)}
        </p>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="relative h-full overflow-y-auto overflow-x-hidden scrollbar-clean">
          {/* Timeline container - scrolls as one unit */}
          <div className="flex">
            {/* Time labels - show only on hour marks */}
            <div className="w-20 bg-muted/20 border-r">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.time}
                  className="h-12 flex items-start justify-end pr-3 pt-1 text-xs text-muted-foreground border-b border-muted/20"
                >
                  {slot.isHour ? slot.label : ''}
                </div>
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
                  onClick={() => handleTimeSlotClick(slot.time)}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, slot.time)}
                  data-testid={`time-slot-${index}`}
                >
                  {/* Subtle but visible drop zone */}
                  {(draggedTask || draggedFromOutside) && (
                    <div className="absolute inset-0 border border-blue-300/60 bg-blue-50/30 opacity-40 hover:opacity-80 transition-all duration-200 flex items-center justify-center">
                      <span className="text-xs text-blue-600 bg-white/70 px-1.5 py-0.5 rounded">
                        {slot.label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Scheduled subtasks */}
              {scheduledSubtasks.map((subtask) => {
                const position = getTaskPosition(subtask);
                const isDragging = draggedTask === subtask.id;
                const startTime = subtask.scheduledStartTime || 0;
                const duration = subtask.estimatedMinutes || 60;
                
                return (
                  <div
                    key={subtask.id}
                    className={`absolute left-1 right-1 bg-background border border-border rounded-md p-2 shadow-sm transition-all duration-200 z-10 overflow-hidden border-l-4 border-l-blue-400 cursor-move hover:shadow-lg hover:scale-[1.02] ${
                      isDragging ? 'opacity-50 scale-105 shadow-lg z-20 border-blue-400' : ''
                    }`}
                    style={position}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, subtask.id)}
                    onDragEnd={handleDragEnd}
                    data-testid={`scheduled-task-${subtask.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium mb-1 text-foreground">
                          {subtask.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          <span>
                            {formatTime(startTime)} - {formatTime(startTime + duration)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {formatDuration(duration)}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromSchedule(subtask.id);
                        }}
                        className="flex-shrink-0 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                        title="Remove from schedule"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {/* Calendar events - read-only/blocked */}
              {calendarEvents.map((event) => {
                const position = getEventPosition(event);
                
                return (
                  <div
                    key={event.id}
                    className="absolute left-1 right-1 bg-background border border-border rounded-md p-2 shadow-sm transition-all duration-200 z-5 overflow-hidden border-l-4 border-l-muted-foreground opacity-90"
                    style={position}
                    data-testid={`calendar-event-${event.id}`}
                    title="Calendar event - read only"
                  >
                    <div className="flex items-start gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium mb-1 text-foreground/80">
                          {event.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          <span>
                            {formatTime(event.startTime)} - {formatTime(event.startTime + event.duration)}
                          </span>
                          <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
                            {event.source}
                          </Badge>
                        </div>
                      </div>
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