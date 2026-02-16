import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MetricCard from "@/components/MetricCard";
import TimelineChart from "@/components/TimelineChart";
import FocusFlowChart from "@/components/ProductivityGraph";
import { Clock, Target, Zap, TrendingDown } from "lucide-react";
import { type DayReportMetrics } from "@shared/metrics";

interface DayReportProps {
  data?: DayReportMetrics;
  isLoading: boolean;
}

/**
 * Calculate the percentage change between current and previous values.
 * Returns null if there's no previous data to compare against.
 */
function trendChange(current: number, previous: number | undefined): number | undefined {
  if (previous === undefined || previous === 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

export default function DayReport({ data, isLoading }: DayReportProps) {
  const tb = data?.timeBreakdown;
  const prev = data?.previousDayBreakdown;

  const focusHours = tb ? Number((tb.focusMinutes / 60).toFixed(1)) : 0;
  const distractionHours = tb ? Number((tb.distractionMinutes / 60).toFixed(1)) : 0;
  const efficiency = tb ? Math.round(tb.productivityRatio * 100) : 0;

  const focusChange = trendChange(tb?.focusMinutes ?? 0, prev?.focusMinutes);
  const distractionChange = trendChange(tb?.distractionMinutes ?? 0, prev?.distractionMinutes);
  const efficiencyChange = trendChange(
    tb?.productivityRatio ?? 0,
    prev?.productivityRatio
  );

  const pe = data?.planExecution;

  // Build timeline chart data from segments
  const timelineData = data?.timeline && data.timeline.length > 0
    ? { segments: data.timeline }
    : undefined;

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
              value={focusHours.toString()}
              unit="h"
              change={focusChange}
              trendPeriod="previous day"
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Daily Distraction Time"
              value={distractionHours.toString()}
              unit="h"
              change={distractionChange}
              trendPeriod="previous day"
              invertTrend
              icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Daily Efficiency"
              value={efficiency.toString()}
              unit="%"
              change={efficiencyChange}
              trendPeriod="previous day"
              icon={<Zap className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Daily Plan Execution"
              value={pe ? pe.completionPercentage.toString() : "0"}
              unit="%"
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
            />
          </>
        )}
      </div>

      {/* Plan Execution Details */}
      {pe && pe.totalCount > 0 && (
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
                  <span className="text-2xl font-bold">{pe.completedCount}/{pe.totalCount}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-foreground/60 h-2 rounded-full" style={{ width: `${pe.completionPercentage}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{pe.totalCount - pe.completedCount} tasks remaining</span>
                  <span>{pe.completionPercentage}% complete</span>
                </div>
              </div>

              {/* Time Estimation Accuracy */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Estimation Accuracy</span>
                  <span className="text-2xl font-bold">{pe.estimationAccuracy}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-foreground/70 h-2 rounded-full" style={{ width: `${pe.estimationAccuracy}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Estimated: {(pe.estimatedMinutes / 60).toFixed(1)}h</span>
                  <span>Actual: {(pe.actualMinutes / 60).toFixed(1)}h</span>
                </div>
              </div>

              {/* Schedule Adherence placeholder — no data source yet */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Apps */}
      {data?.topApps && data.topApps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Apps</CardTitle>
            <CardDescription>Most used applications today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topApps.slice(0, 3).map((app) => (
                <div key={app.app} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-32 truncate">{app.app}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-foreground/50 h-2 rounded-full"
                      style={{ width: `${app.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {app.minutes >= 60
                      ? `${(app.minutes / 60).toFixed(1)}h`
                      : `${Math.round(app.minutes)}m`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Activity Timeline */}
      {timelineData && <TimelineChart data={timelineData} />}

      {/* Focus Flow Chart */}
      {data?.hourlyEfficiency && data.hourlyEfficiency.length > 0 && (
        <FocusFlowChart data={data.hourlyEfficiency} />
      )}

      {/* Empty state when no data at all */}
      {!isLoading && (!tb || tb.totalMinutes === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No activity recorded for this day.
          </CardContent>
        </Card>
      )}
    </div>
  );
}