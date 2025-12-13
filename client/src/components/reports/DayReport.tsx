import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MetricCard from "@/components/MetricCard";
import TimelineChart from "@/components/TimelineChart";
import FocusFlowChart from "@/components/ProductivityGraph";
import { Clock, Target, Zap, TrendingDown } from "lucide-react";

interface DayReportProps {
  aggregateData: {
    focusedHours: number;
    distractedHours: number;
    totalHours: number;
    focusPercentage: number;
  };
  isLoading: boolean;
  timelineData?: {
    segments: Array<{
      start: number;
      end: number;
      status: 'focus' | 'distracted' | 'idle' | 'untracked';
    }>;
  };
  productivityData?: Array<{
    time: string;
    timestamp: number;
    efficiency: number;
  }>;
  timeRange?: {
    start: number;
    end: number;
  };
}

export default function DayReport({ 
  aggregateData, 
  isLoading, 
  timelineData, 
  productivityData, 
  timeRange 
}: DayReportProps) {
  // Use provided data or fallback to mock data
  const dailyTimelineData = timelineData || {
    segments: [
      { start: 9, end: 10.5, status: 'focus' as const },
      { start: 10.5, end: 11, status: 'distracted' as const },
      { start: 11, end: 11.5, status: 'focus' as const },
      { start: 11.5, end: 12, status: 'idle' as const },
      { start: 12, end: 13, status: 'untracked' as const },
      { start: 13, end: 14, status: 'focus' as const },
      { start: 14, end: 14.5, status: 'distracted' as const },
      { start: 14.5, end: 16, status: 'focus' as const },
      { start: 16, end: 16.5, status: 'untracked' as const },
      { start: 16.5, end: 17, status: 'focus' as const },
    ]
  };

  const dailyProductivityData = productivityData || [
    { time: '9AM', timestamp: 9, efficiency: 85 },
    { time: '10AM', timestamp: 10, efficiency: 92 },
    { time: '11AM', timestamp: 11, efficiency: 78 },
    { time: '12PM', timestamp: 12, efficiency: 45 },
    { time: '1PM', timestamp: 13, efficiency: 20 },
    { time: '2PM', timestamp: 14, efficiency: 88 },
    { time: '3PM', timestamp: 15, efficiency: 75 },
    { time: '4PM', timestamp: 16, efficiency: 82 },
  ];

  const dailyTimeRange = timeRange || { start: 9, end: 16 };

  return (
    <div className="space-y-6">
      {/* Daily Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : (
          <>
            <MetricCard
              title="Daily Focus Time"
              value={aggregateData.focusedHours.toString()}
              unit="h"
              change={12}
              trendPeriod="previous day"
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Daily Distraction Time"
              value={aggregateData.distractedHours.toString()}
              unit="h"
              change={-8}
              trendPeriod="previous day"
              icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Daily Efficiency"
              value={aggregateData.focusPercentage.toString()}
              unit="%"
              change={5}
              trendPeriod="previous day"
              icon={<Zap className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Daily Plan Execution"
              value="85"
              unit="%"
              change={7}
              trendPeriod="previous day"
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
            />
          </>
        )}
      </div>

      {/* Plan Execution Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Plan Execution</CardTitle>
          <CardDescription>Task completion status and estimation accuracy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Task Completion */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tasks Completed</span>
                <span className="text-2xl font-bold">7/9</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-foreground/60 h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2 tasks remaining</span>
                <span>78% complete</span>
              </div>
            </div>

            {/* Time Estimation Accuracy */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estimation Accuracy</span>
                <span className="text-2xl font-bold">92%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-foreground/70 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Estimated: 6.5h</span>
                <span>Actual: 6.0h</span>
              </div>
            </div>

            {/* Schedule Adherence */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Schedule Adherence</span>
                <span className="text-2xl font-bold">85%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-foreground/80 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Started on time: 6/7</span>
                <span>15min avg delay</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Activity Timeline */}
      <TimelineChart data={dailyTimelineData} />

      {/* Focus Flow Chart */}
      <FocusFlowChart data={dailyProductivityData} timeRange={dailyTimeRange} />
    </div>
  );
}