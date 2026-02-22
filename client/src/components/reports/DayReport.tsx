import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MetricCard from "@/components/MetricCard";
import TimelineChart from "@/components/TimelineChart";
import FocusFlowChart from "@/components/ProductivityGraph";
import { CircleDot, Zap, Shuffle } from "lucide-react";
import { type DayReportMetrics } from "@shared/metrics";

interface DayReportProps {
  data?: DayReportMetrics;
  isLoading: boolean;
}

/**
 * Calculate the percentage change between current and previous values.
 * Returns null if there's no previous data to compare against.
 */
function trendChange(current: number, previous: number | undefined, minThreshold = 5): number | undefined {
  if (previous === undefined) return undefined;
  // Either value too small — percentage change is noisy, hide trend
  if (previous < minThreshold || current < minThreshold) return undefined;
  const change = ((current - previous) / previous) * 100;
  return Math.round(change);
}

export default function DayReport({ data, isLoading }: DayReportProps) {
  const tb = data?.timeBreakdown;
  const prev = data?.previousDayBreakdown;

  const focusHours = tb ? Number((tb.focusMinutes / 60).toFixed(2)) : 0;
  const distractionHours = tb ? Number((tb.distractionMinutes / 60).toFixed(2)) : 0;
  const efficiency = tb ? Math.round(tb.productivityRatio * 100) : 0;

  const focusChange = trendChange(tb?.focusMinutes ?? 0, prev?.focusMinutes);
  const distractionChange = trendChange(tb?.distractionMinutes ?? 0, prev?.distractionMinutes);
  const efficiencyChange = trendChange(
    tb ? tb.productivityRatio * 100 : 0,
    prev ? prev.productivityRatio * 100 : undefined
  );

  const pe = data?.planExecution;
  const hasPlanExecution = pe && pe.totalCount > 0;
  const hasTopApps = data?.topApps && data.topApps.length > 0;

  // Build timeline chart data from segments
  const timelineData = data?.timeline && data.timeline.length > 0
    ? { segments: data.timeline }
    : undefined;

  return (
    <div className="space-y-6">
      {/* Daily Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              icon={<CircleDot className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Daily Distraction Time"
              value={distractionHours.toString()}
              unit="h"
              change={distractionChange}
              trendPeriod="previous day"
              invertTrend
              icon={<Shuffle className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Daily Efficiency"
              value={efficiency.toString()}
              unit="%"
              change={efficiencyChange}
              trendPeriod="previous day"
              icon={<Zap className="h-4 w-4 text-muted-foreground" />}
            />
          </>
        )}
      </div>

      {/* Plan Execution & Top Apps — same grid as metrics above */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasPlanExecution && (
          <Card className={hasTopApps ? 'md:col-span-2' : 'md:col-span-2 lg:col-span-3'}>
            <CardHeader>
              <CardTitle className="text-lg">Plan Execution</CardTitle>
              <CardDescription>Task completion and estimation accuracy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Task Completion */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tasks Completed</span>
                    <span className="text-2xl font-bold">{pe.completedCount}/{pe.totalCount}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-foreground/60 h-2 rounded-full" style={{ width: `${pe.completionPercentage}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{pe.totalCount - pe.completedCount} remaining</span>
                    <span>{pe.completionPercentage}%</span>
                  </div>
                </div>

                {/* Estimation Accuracy */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimation Accuracy</span>
                    <span className="text-2xl font-bold">{pe.estimationAccuracy}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-foreground/70 h-2 rounded-full" style={{ width: `${pe.estimationAccuracy}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Est: {(pe.estimatedMinutes / 60).toFixed(1)}h</span>
                    <span>Actual: {(pe.actualMinutes / 60).toFixed(1)}h</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasTopApps && (
          <Card className={hasPlanExecution ? '' : 'md:col-span-2 lg:col-span-3'}>
            <CardHeader>
              <CardTitle className="text-lg">Top Apps</CardTitle>
              <CardDescription>Most used applications today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topApps.map((app) => (
                  <div key={app.app} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-24 shrink-0 truncate">{app.app}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-foreground/50 h-2 rounded-full"
                        style={{ width: `${app.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 shrink-0 text-right">
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
      </div>

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
            <p className="text-sm">No activity recorded for this day.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Activity will appear here once tracked</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}