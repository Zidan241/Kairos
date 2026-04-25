import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MetricCard from "@/components/MetricCard";
import ProductivityChart from "@/components/ProductivityChart";
import { Calendar, Target, TrendingUp, TrendingDown, Award, Clock, Zap } from "lucide-react";

interface MonthReportProps {
  aggregateData: {
    focusedHours: number;
    distractionHours: number;
    totalHours: number;
    focusPercentage: number;
  };
  isLoading: boolean;
}

export default function MonthReport({ aggregateData, isLoading }: MonthReportProps) {
  // Monthly data
  const monthlyProductivityData = [
    { name: 'Jan', value: 78 },
    { name: 'Feb', value: 82 },
    { name: 'Mar', value: 75 },
    { name: 'Apr', value: 85 },
    { name: 'May', value: 88 },
    { name: 'Jun', value: 90 },
  ];

  const monthlyGoalsData = [
    { name: 'Jan', value: 92 },
    { name: 'Feb', value: 87 },
    { name: 'Mar', value: 95 },
    { name: 'Apr', value: 88 },
    { name: 'May', value: 91 },
    { name: 'Jun', value: 94 },
  ];

  // Monthly goals progress
  const monthlyGoals = [
    { goal: "Focus time 100h", progress: 92, current: 92, target: 100 },
    { goal: "Productivity >85%", progress: 95, current: 88, target: 85 },
    { goal: "Work-life balance <10h", progress: 87, current: 8.7, target: 10 },
  ];

  return (
    <div className="space-y-6">
      {/* Monthly Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : (
          <>
            <MetricCard
              title="Monthly Focus Time"
              value={aggregateData.focusedHours.toString()}
              unit="h/month"
              change={15}
              trendPeriod="previous month"
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Monthly Distraction Time"
              value={aggregateData.distractionHours.toString()}
              unit="h/month"
              change={-8}
              trendPeriod="previous month"
              icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Monthly Efficiency"
              value={aggregateData.focusPercentage.toString()}
              unit="%"
              change={8}
              trendPeriod="previous month"
              icon={<Zap className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Monthly Total Activity"
              value={aggregateData.totalHours.toString()}
              unit="h/month"
              change={12}
              trendPeriod="previous month"
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            />
          </>
        )}
      </div>

      {/* Monthly Goals Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Goals Progress</CardTitle>
          <CardDescription>Track your monthly productivity targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {monthlyGoals.map((goal, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{goal.goal}</span>
                  <span className="text-2xl font-bold">
                    {goal.current}{typeof goal.target === 'number' && goal.target > 50 ? '' : goal.target > 20 ? 'h' : '%'}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-foreground/70 h-2 rounded-full" style={{ width: `${goal.progress}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Target: {goal.target}{typeof goal.target === 'number' && goal.target > 50 ? '' : goal.target > 20 ? 'h' : '%'}</span>
                  <span>{goal.progress}% complete</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductivityChart
          title="Monthly Productivity Trend"
          description="Average productivity percentage by month"
          data={monthlyProductivityData}
          average={83}
          color="hsl(var(--chart-2))"
        />
        <ProductivityChart
          title="Monthly Plan Execution"
          description="Goal completion rate by month"
          data={monthlyGoalsData}
          average={91.2}
          color="hsl(var(--chart-1))"
        />
      </div>

      {/* Monthly Summary & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Month Summary</CardTitle>
            <CardDescription>Key highlights and statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Most productive day</span>
              <span className="font-medium">Tuesday</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Longest focus session</span>
              <span className="font-medium">4h 15m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total tasks completed</span>
              <span className="font-medium">102 tasks</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Average session length</span>
              <span className="font-medium">1h 48m</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>Milestones reached this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Focus Master</p>
                <p className="text-sm text-muted-foreground">Achieved 90%+ productivity for 5 consecutive days</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Goal Crusher</p>
                <p className="text-sm text-muted-foreground">Completed 3 out of 4 monthly goals</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Consistency Champion</p>
                <p className="text-sm text-muted-foreground">Maintained daily productivity tracking for 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}