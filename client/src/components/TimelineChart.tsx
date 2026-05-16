import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TimelineSegment } from "@shared/types";

interface ActivitySegment extends TimelineSegment {
  task?: string;
}

interface TimelineData {
  segments: ActivitySegment[];
}

interface TimelineChartProps {
  data: TimelineData;
}

export default function TimelineChart({ data }: TimelineChartProps) {
  // Derive range from actual data instead of hardcoding 9–5
  const dataStart = data?.segments?.length
    ? Math.floor(Math.min(...data.segments.map(s => s.start)))
    : 0;
  const dataEnd = data?.segments?.length
    ? Math.ceil(Math.max(...data.segments.map(s => s.end)))
    : 24;
  const dayStart = dataStart;
  const dayEnd = Math.max(dataEnd, dayStart + 1); // at least 1 hour range
  const totalHours = dayEnd - dayStart;

  // Safety check for data
  if (!data || !data.segments || !Array.isArray(data.segments)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today's Activity Timeline</CardTitle>
          <CardDescription>No activity data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No timeline data to display
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'focus': return 'bg-status-success/75';
      case 'prefocus': return 'bg-status-success/50';
      case 'distraction': return 'bg-status-danger/75';
      case 'idle': return 'bg-status-neutral/50';
      case 'untracked': return '';
      default: return 'bg-muted';
    }
  };

  const getUntrackedStyle = (): React.CSSProperties => ({
    backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 3px, hsl(var(--neutral) / 0.15) 3px, hsl(var(--neutral) / 0.15) 6px)',
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'focus': return 'Focus';
      case 'prefocus': return 'Pre Focus';
      case 'distraction': return 'Distracted';
      case 'idle': return 'Idle';
      case 'untracked': return 'Untracked';
      default: return 'Unknown';
    }
  };

  const formatTime = (hour: number) => {
    const wholeHour = Math.floor(hour);
    const minutes = Math.round((hour - wholeHour) * 60);
    
    let timeStr;
    if (wholeHour === 12) {
      timeStr = '12';
    } else if (wholeHour > 12) {
      timeStr = `${wholeHour - 12}`;
    } else {
      timeStr = `${wholeHour}`;
    }
    
    if (minutes > 0) {
      timeStr += `:${minutes.toString().padStart(2, '0')}`;
    }
    
    return timeStr + (wholeHour >= 12 ? 'PM' : 'AM');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Today's Activity Timeline</CardTitle>
        <CardDescription>
          Focus, distraction, and idle time throughout the day with active tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" data-testid="timeline-chart">
          {/* Legend */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-status-success/75"></div>
              <span>Focus</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-status-success/50"></div>
              <span>Pre Focus</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-status-danger/75"></div>
              <span>Distracted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-status-neutral/50"></div>
              <span>Idle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-muted-foreground/20" style={getUntrackedStyle()}></div>
              <span>Untracked</span>
            </div>
          </div>

          {/* Timeline Strip */}
          <div className="relative">
            {/* Hour markers */}
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              {Array.from({ length: totalHours + 1 }, (_, i) => (
                <span key={i} className="text-center">
                  {formatTime(dayStart + i)}
                </span>
              ))}
            </div>

            {/* Timeline container */}
            <div className="relative h-8 bg-border rounded-md overflow-hidden" data-testid="timeline-strip">
              <TooltipProvider delayDuration={150}>
                {data.segments.map((segment, index) => {
                  const leftPercent = ((segment.start - dayStart) / totalHours) * 100;
                  const widthPercent = ((segment.end - segment.start) / totalHours) * 100;
                  const isNarrow = widthPercent < 8; // Hide label if too narrow
                  const duration = (segment.end - segment.start) * 60;
                  const durationLabel = duration >= 60
                    ? `${(duration / 60).toFixed(1)}h`
                    : `${Math.round(duration)}m`;

                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <div
                          className={`absolute h-full ${getStatusColor(segment.status)} border-r border-muted-foreground/10`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            ...(segment.status === 'untracked' ? getUntrackedStyle() : {}),
                          }}
                          data-testid={`segment-${index}`}
                        >
                          {/* Task label */}
                          {segment.task && !isNarrow && (
                            <div className="absolute inset-0 flex items-center justify-center px-2">
                              <Badge
                                variant="secondary"
                                className="text-xs bg-background/90 text-foreground border-0 truncate max-w-full"
                                data-testid={`task-label-${index}`}
                              >
                                {segment.task}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="font-medium">{getStatusLabel(segment.status)}</div>
                        <div className="text-muted-foreground">
                          {formatTime(segment.start)} – {formatTime(segment.end)} ({durationLabel})
                        </div>
                        {segment.task && <div className="mt-0.5">{segment.task}</div>}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>

            {/* Hour tick marks */}
            <div className="flex justify-between mt-1">
              {Array.from({ length: totalHours + 1 }, (_, i) => (
                <div key={i} className="w-px h-2 bg-muted-foreground/30"></div>
              ))}
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}