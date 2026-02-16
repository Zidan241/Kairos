import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

import DayReport from "@/components/reports/DayReport";
import DateRangeSelector from "@/components/DateRangeSelector";
import { useDayReport } from "@/hooks/useMetrics";

export default function Reports() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');

  const getDateRange = (type: 'day' | 'week' | 'month', baseDate: Date = selectedDate) => {
    if (type === 'day') {
      const dateStr = baseDate.toISOString().split('T')[0];
      return { startDate: dateStr, endDate: dateStr };
    } else if (type === 'week') {
      const date = new Date(baseDate);
      const dayOfWeek = date.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
      const monday = new Date(date);
      monday.setDate(date.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        startDate: monday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0]
      };
    } else {
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0]
      };
    }
  };

  // Day tab — real data
  const dayDateStr = selectedDate.toISOString().split('T')[0];
  const { data: dayReport, isLoading: dayLoading, refetch: refetchDay, isFetching: dayFetching } = useDayReport(dayDateStr);

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