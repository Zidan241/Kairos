import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MetricCard from "@/components/MetricCard";
import ProductivityChart from "@/components/ProductivityChart";
import { Clock, Target, Zap, TrendingDown, TrendingUp, Award } from "lucide-react";

interface WeekReportProps {
  aggregateData: {
    focusedHours: number;
    distractionHours: number;
    totalHours: number;
    focusPercentage: number;
  };
  isLoading: boolean;
}

export default function WeekReport({ aggregateData, isLoading }: WeekReportProps) {
  // Weekly data
  const weeklyFocusData = [
    { name: 'Week 1', value: 32.5 },
    { name: 'Week 2', value: 28.8 },
    { name: 'Week 3', value: 35.2 },
    { name: 'Week 4', value: 31.7 },
  ];

  const weeklyTasksData = [
    { name: 'Week 1', value: 42 },
    { name: 'Week 2', value: 38 },
    { name: 'Week 3', value: 45 },
    { name: 'Week 4', value: 40 },
  ];

  return (
    <div className="space-y-6">
      {/* Weekly Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : (
          <>
            <MetricCard
              title="Weekly Focus Time"
              value={aggregateData.focusedHours.toString()}
              unit="h/week"
              change={8}
              trendPeriod="previous week"
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Weekly Distraction Time"
              value={aggregateData.distractionHours.toString()}
              unit="h/week"
              change={-5}
              trendPeriod="previous week"
              icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Weekly Efficiency"
              value={aggregateData.focusPercentage.toString()}
              unit="%"
              change={3}
              trendPeriod="previous week"
              icon={<Zap className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Weekly Total Activity"
              value={aggregateData.totalHours.toString()}
              unit="h/week"
              change={12}
              trendPeriod="previous week"
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            />
          </>
        )}
      </div>

      {/* Weekly Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductivityChart
          title="Weekly Productivity Trend"
          description="Average productivity percentage per week"
          data={weeklyFocusData}
          average={32.05}
          color="hsl(var(--chart-2))"
        />
        <ProductivityChart
          title="Weekly Plan Execution"
          description="Tasks completed per week"
          data={weeklyTasksData}
          average={41.25}
          color="hsl(var(--chart-1))"
        />
      </div>

      {/* Weekly Summary & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Week Summary</CardTitle>
            <CardDescription>Key highlights and statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Most productive day</span>
              <span className="font-medium">Wednesday</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Longest focus session</span>
              <span className="font-medium">3h 45m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total tasks completed</span>
              <span className="font-medium">24 tasks</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Average session length</span>
              <span className="font-medium">1h 32m</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Insights & Recommendations</CardTitle>
            <CardDescription>AI-powered productivity insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-chart-2 mt-2"></div>
              <div>
                <p className="font-medium">Strong Focus Patterns</p>
                <p className="text-sm text-muted-foreground">Your best focus sessions happen between 9-11 AM. Consider scheduling complex tasks during this time.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-chart-3 mt-2"></div>
              <div>
                <p className="font-medium">Task Estimation Accuracy</p>
                <p className="text-sm text-muted-foreground">You tend to underestimate design tasks by 20%. Consider adding buffer time for creative work.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-chart-1 mt-2"></div>
              <div>
                <p className="font-medium">Distraction Reduction</p>
                <p className="text-sm text-muted-foreground">Your distraction time decreased by 15% this week. Great progress on maintaining focus!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}