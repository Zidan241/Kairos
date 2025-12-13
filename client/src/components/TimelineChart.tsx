import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ActivitySegment {
  start: number; // hour (9 = 9AM)
  end: number;   // hour (10 = 10AM)
  status: 'focus' | 'distracted' | 'idle' | 'untracked';
  task?: string;
}

interface TimelineData {
  segments: ActivitySegment[];
}

interface TimelineChartProps {
  data: TimelineData;
}

export default function TimelineChart({ data }: TimelineChartProps) {
  const dayStart = 9; // 9AM
  const dayEnd = 17;  // 5PM
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
      case 'focus': return 'bg-green-400/75';
      case 'distracted': return 'bg-red-400/75';
      case 'idle': return 'bg-gray-500/65';
      case 'untracked': return 'bg-gray-400/5';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'focus': return 'Focus';
      case 'distracted': return 'Distracted';
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
              <div className="w-4 h-4 rounded bg-green-400/75"></div>
              <span>Focus</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-400/75"></div>
              <span>Distracted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-500/65"></div>
              <span>Idle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-300/5  border border-gray-400/80 border-dashed"></div>
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
              {data.segments.map((segment, index) => {
                const leftPercent = ((segment.start - dayStart) / totalHours) * 100;
                const widthPercent = ((segment.end - segment.start) / totalHours) * 100;
                const isNarrow = widthPercent < 8; // Hide label if too narrow

                return (
                  <div
                    key={index}
                    className={`absolute h-full ${getStatusColor(segment.status)} border-r border-background`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                    data-testid={`segment-${index}`}
                    title={`${formatTime(segment.start)} - ${formatTime(segment.end)}: ${getStatusLabel(segment.status)}${segment.task ? ` • ${segment.task}` : ''}`}
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
                );
              })}
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