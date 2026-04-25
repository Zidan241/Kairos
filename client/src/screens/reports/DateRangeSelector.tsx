import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { getWeekStart, getLocaleWeekStart } from "@/lib/utils";

interface DateRangeSelectorProps {
  mode: 'day' | 'week' | 'month';
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
const monthNames = Array.from({ length: 12 }, (_, i) => monthFormatter.format(new Date(2000, i)));
const dayFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
const weekStartDay = getLocaleWeekStart(); // 0 = Sunday, 1 = Monday

function getWeeksInMonth(year: number, month: number) {
  const weeks: Date[] = [];
  const first = new Date(year, month, 1);
  let current = getWeekStart(first);

  // Collect week starts that overlap with this month
  while (current.getMonth() <= month && current.getFullYear() === year || current < first) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function WeekPicker({ selectedDate, onDateSelect }: { selectedDate: Date; onDateSelect: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const selectedWeekStart = getWeekStart(selectedDate).getTime();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const weeks = getWeeksInMonth(viewYear, viewMonth);
  const weekEndDay = weekStartDay === 0 ? 'Sat' : 'Sun';

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{monthNames[viewMonth]} {viewYear}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        {weekStartDay === 0 ? 'Sun' : 'Mon'} – {weekEndDay}
      </p>
      <div className="flex flex-col gap-1.5">
        {weeks.map((ws) => {
          const we = new Date(ws);
          we.setDate(ws.getDate() + 6);
          const isSelected = ws.getTime() === selectedWeekStart;
          return (
            <Button
              key={ws.getTime()}
              variant={isSelected ? "default" : "ghost"}
              size="sm"
              className="h-9 justify-center text-xs"
              onClick={() => onDateSelect(ws)}
            >
              {dayFormatter.format(ws)} – {dayFormatter.format(we)}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function MonthPicker({ selectedDate, onDateSelect }: { selectedDate: Date; onDateSelect: (d: Date) => void }) {
  const [year, setYear] = useState(selectedDate.getFullYear());
  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{year}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {monthNames.map((name, i) => {
          const isSelected = i === selectedMonth && year === selectedYear;
          return (
            <Button
              key={i}
              variant={isSelected ? "default" : "ghost"}
              size="sm"
              className="h-9"
              onClick={() => onDateSelect(new Date(year, i, 1))}
            >
              {name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangeSelector({ mode, selectedDate, onDateSelect }: DateRangeSelectorProps) {
  if (mode === 'month') {
    return <MonthPicker selectedDate={selectedDate} onDateSelect={onDateSelect} />;
  }
  if (mode === 'week') {
    return <WeekPicker selectedDate={selectedDate} onDateSelect={onDateSelect} />;
  }

  // Day mode
  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={(date) => {
        if (date) onDateSelect(date);
      }}
      weekStartsOn={weekStartDay}
      initialFocus
    />
  );
}