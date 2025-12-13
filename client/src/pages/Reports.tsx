import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";

// Import separated components
import DayReport from "@/components/reports/DayReport";
import WeekReport from "@/components/reports/WeekReport";
import MonthReport from "@/components/reports/MonthReport";
import DateRangeSelector from "@/components/DateRangeSelector";

// Mock ProductivitySession type for Reports page
interface ProductivitySession {
  date: string; // YYYY-MM-DD
  focusedMinutes: number; // focus + prefocus time
  distractedMinutes: number; // distraction time
  idleMinutes: number; // idle time
  totalActiveMinutes: number; // focus + prefocus + distraction (excluding idle)
  productivityRatio: number; // (focus + prefocus) / totalActive
}

// Mock productivity range function
const getProductivityRange = async (startDate: string, endDate: string): Promise<ProductivitySession[]> => {
  // Mock data - replace with real API call later
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sessions: ProductivitySession[] = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    sessions.push({
      date: dateStr,
      focusedMinutes: Math.floor(Math.random() * 200) + 100, // 100-300 minutes
      distractedMinutes: Math.floor(Math.random() * 60) + 20, // 20-80 minutes  
      idleMinutes: Math.floor(Math.random() * 40) + 10, // 10-50 minutes
      totalActiveMinutes: 0, // Will be calculated
      productivityRatio: 0 // Will be calculated
    });
    
    // Calculate derived fields
    const session = sessions[sessions.length - 1];
    session.totalActiveMinutes = session.focusedMinutes + session.distractedMinutes;
    session.productivityRatio = session.totalActiveMinutes > 0 
      ? session.focusedMinutes / session.totalActiveMinutes 
      : 0;
  }
  
  return sessions;
};

export default function Reports() {
  // State for selected date and active tab
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');

  // Helper functions for date calculations
  const getDateRange = (type: 'day' | 'week' | 'month', baseDate: Date = selectedDate) => {
    if (type === 'day') {
      const dateStr = baseDate.toISOString().split('T')[0];
      return { startDate: dateStr, endDate: dateStr };
    } else if (type === 'week') {
      // Get the week containing the selected date (Monday to Sunday)
      const date = new Date(baseDate);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const mondayOffset = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1); // Adjust for Monday start
      
      const monday = new Date(date);
      monday.setDate(date.getDate() + mondayOffset);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      return {
        startDate: monday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0]
      };
    } else { // month
      // Get the month containing the selected date (1st to last day)
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0); // 0th day of next month = last day of current month
      
      return {
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0]
      };
    }
  };

  // Fetch productivity data for different time ranges
  const dayRange = getDateRange('day');
  const weekRange = getDateRange('week');
  const monthRange = getDateRange('month');

  const { data: dayData = [], isLoading: dayLoading } = useQuery<ProductivitySession[]>({
    queryKey: ['productivity-range', dayRange.startDate, dayRange.endDate, selectedDate.toISOString()],
    queryFn: () => getProductivityRange(dayRange.startDate, dayRange.endDate),
  });

  const { data: weekData = [], isLoading: weekLoading } = useQuery<ProductivitySession[]>({
    queryKey: ['productivity-range', weekRange.startDate, weekRange.endDate, selectedDate.toISOString()],
    queryFn: () => getProductivityRange(weekRange.startDate, weekRange.endDate),
  });

  const { data: monthData = [], isLoading: monthLoading } = useQuery<ProductivitySession[]>({
    queryKey: ['productivity-range', monthRange.startDate, monthRange.endDate, selectedDate.toISOString()],
    queryFn: () => getProductivityRange(monthRange.startDate, monthRange.endDate),
  });

  // Aggregate data for metrics
  const aggregateData = useMemo(() => {
    const aggregateSessionData = (sessions: ProductivitySession[]) => {
      const totalFocused = sessions.reduce((sum, s) => sum + s.focusedMinutes, 0);
      const totalDistracted = sessions.reduce((sum, s) => sum + s.distractedMinutes, 0);
      const totalActive = sessions.reduce((sum, s) => sum + s.totalActiveMinutes, 0);
      
      return {
        focusedHours: Math.round((totalFocused / 60) * 10) / 10,
        distractedHours: Math.round((totalDistracted / 60) * 10) / 10,
        totalHours: Math.round((totalActive / 60) * 10) / 10,
        focusPercentage: totalActive > 0 ? Math.round((totalFocused / totalActive) * 100) : 0,
      };
    };

    return {
      day: aggregateSessionData(dayData),
      week: aggregateSessionData(weekData),
      month: aggregateSessionData(monthData),
    };
  }, [dayData, weekData, monthData]);

  // Mock data for daily charts to pass to DayReport
  const dailyTimelineData = {
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

  const dailyProductivityData = [
    { time: '9AM', timestamp: 9, efficiency: 85 },
    { time: '10AM', timestamp: 10, efficiency: 92 },
    { time: '11AM', timestamp: 11, efficiency: 78 },
    { time: '12PM', timestamp: 12, efficiency: 45 },
    { time: '1PM', timestamp: 13, efficiency: 20 },
    { time: '2PM', timestamp: 14, efficiency: 88 },
    { time: '3PM', timestamp: 15, efficiency: 75 },
    { time: '4PM', timestamp: 16, efficiency: 82 },
  ];

  const formatDateForTab = (date: Date, tab: 'day' | 'week' | 'month') => {
    if (tab === 'day') {
      return format(date, "PPP"); // Full date format
    } else if (tab === 'week') {
      const { startDate, endDate } = getDateRange('week', date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}`;
    } else { // month
      return format(date, "MMMM yyyy"); // Month and year
    }
  };

  const timeRange = { start: 9, end: 16 };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Productivity insights and analytics</p>
        </div>
        <div className="flex items-center gap-4">
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
          <TabsTrigger value="week" data-testid="tab-week">Week</TabsTrigger>
          <TabsTrigger value="month" data-testid="tab-month">Month</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="day" className="space-y-6 mt-0">
            <DayReport
              aggregateData={aggregateData.day}
              isLoading={dayLoading}
              timelineData={dailyTimelineData}
              productivityData={dailyProductivityData}
              timeRange={timeRange}
            />
          </TabsContent>

        <TabsContent value="week" className="space-y-6 mt-0">
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
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}