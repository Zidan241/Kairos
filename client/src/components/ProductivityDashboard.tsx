import { Clock, Zap, TrendingDown, Moon } from "lucide-react";
import MetricCard from "./MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useDailyMetrics } from "@/hooks/useMetrics";

export default function ProductivityDashboard() {
  // Get today's metrics data
  const { data: todayMetrics, isLoading: todayLoading } = useDailyMetrics();

  if (todayLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Convert minutes to hours for display
  const focusHours = todayMetrics ? Number((todayMetrics.timeBreakdown.focusMinutes / 60).toFixed(1)) : 0;
  const distractionHours = todayMetrics ? Number((todayMetrics.timeBreakdown.distractionMinutes / 60).toFixed(1)) : 0;
  const productivityPercentage = todayMetrics ? Math.round(todayMetrics.timeBreakdown.productivityRatio * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Focus Time"
          value={focusHours.toString()}
          unit="h"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Distraction Time"
          value={distractionHours.toString()}
          unit="h"
          icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Productivity"
          value={productivityPercentage.toString()}
          unit="%"
          icon={<Zap className="h-4 w-4 text-muted-foreground" />}
        />
      </div>
    </div>
  );
}