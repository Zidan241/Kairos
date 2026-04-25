import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { useState } from "react";
import { format, isToday } from "date-fns";

import DayReport from "./DayReport";
import DateRangeSelector from "./DateRangeSelector";
import { useDayReport } from "@/hooks/useMetrics";
import { dateUtils } from "@shared/utils";
import { TaskHelpers } from "@/lib/taskHelpers";
import { getWeekStart } from "@/lib/utils";

export default function Reports() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');

  const getDateRange = (type: 'day' | 'week' | 'month', baseDate: Date = selectedDate) => {
    if (type === 'day') {
      const dateStr = dateUtils.formatDate(baseDate);
      return { startDate: dateStr, endDate: dateStr };
    } else if (type === 'week') {
      const weekStart = getWeekStart(baseDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return {
        startDate: dateUtils.formatDate(weekStart),
        endDate: dateUtils.formatDate(weekEnd)
      };
    } else {
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        startDate: dateUtils.formatDate(firstDay),
        endDate: dateUtils.formatDate(lastDay)
      };
    }
  };

  // Day tab
  const dayDateStr = dateUtils.formatDate(selectedDate);
  const { data: dayReport, isLoading: dayLoading, refetch: refetchDay, isFetching: dayFetching } = useDayReport(dayDateStr);
  const reflectSummary = dayReport?.reflect;

  async function handleRefresh() {
    if (activeTab === 'day') {
      await refetchDay();
    }
  }

  const formatDateForTab = (date: Date, tab: 'day' | 'week' | 'month') => {
    if (tab === 'day') {
      return format(date, "PPP");
    } else if (tab === 'week') {
      const { startDate, endDate } = getDateRange('week', date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}`;
    } else {
      return format(date, "MMMM yyyy");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Productivity insights and analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={dayFetching}
          >
            <RefreshCw className={`h-4 w-4 ${dayFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedDate(new Date())}
            disabled={isToday(selectedDate)}
          >
            Today
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[280px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? formatDateForTab(selectedDate, activeTab) : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <DateRangeSelector
                mode={activeTab}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Compact summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Habits Card */}
        <Card>
          <CardContent className="py-3 px-4">
            <span className="text-sm">
              {reflectSummary ? (
                reflectSummary.habits.due > 0
                  ? <>Habits: <span className="font-medium">{reflectSummary.habits.done} done</span> · <span className="text-yellow-500">{reflectSummary.habits.skipped} skipped</span> · {reflectSummary.habits.missed} missed</>
                  : <>Habits: <span className="text-muted-foreground">0 due</span></>
              ) : (
                <span className="text-muted-foreground">Habits: —</span>
              )}
            </span>
          </CardContent>
        </Card>

        {/* Tasks Card */}
        <Card>
          <CardContent className="py-3 px-4">
            <span className="text-sm">
              {reflectSummary ? (
                reflectSummary.tasks.planned > 0
                  ? <>Tasks: Planned <span className="font-medium">{reflectSummary.tasks.planned}</span> · Done {reflectSummary.tasks.done} · Rescheduled {reflectSummary.tasks.rescheduled}</>
                  : <>Tasks: <span className="text-muted-foreground">0 planned</span></>
              ) : (
                <span className="text-muted-foreground">Tasks: —</span>
              )}
            </span>
          </CardContent>
        </Card>

        {/* Goals Card */}
        <Card>
          <CardContent className="py-3 px-4">
            <span className="text-sm">
              {reflectSummary ? (
                reflectSummary.goals.perGoal.length > 0
                  ? <>Goals: <span className="font-medium">{reflectSummary.goals.progressed}/{reflectSummary.goals.total} progressed</span> · {reflectSummary.goals.perGoal.map(g => `${g.title} (${TaskHelpers.formatTime(g.minutes)})`).join(' · ')}</>
                  : <>Goals: <span className="text-muted-foreground">no activity</span></>
              ) : (
                <span className="text-muted-foreground">Goals: —</span>
              )}
            </span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="day" className="w-full" onValueChange={(value) => setActiveTab(value as 'day' | 'week' | 'month')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="day" data-testid="tab-day">Day</TabsTrigger>
          <TabsTrigger value="week" data-testid="tab-week" disabled>Week</TabsTrigger>
          <TabsTrigger value="month" data-testid="tab-month" disabled>Month</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="day" className="space-y-6 mt-0">
            <DayReport data={dayReport} isLoading={dayLoading} />
          </TabsContent>

          {/* TODO: Uncomment when week/month endpoints are implemented */}
          {/* <TabsContent value="week" className="space-y-6 mt-0">
            <WeekReport
              aggregateData={aggregateData.week}
              isLoading={weekLoading}
            />
          </TabsContent>

          <TabsContent value="month" className="space-y-6 mt-0">
            <MonthReport
              aggregateData={aggregateData.month}
              isLoading={monthLoading}
            />
          </TabsContent> */}
        </div>
      </Tabs>
    </div>
  );
}