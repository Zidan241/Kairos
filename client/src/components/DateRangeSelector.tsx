import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DateRangeSelectorProps {
  mode: 'day' | 'week' | 'month';
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function DateRangeSelector({ mode, selectedDate, onDateSelect }: DateRangeSelectorProps) {
  const handleDateChange = (date: Date | null) => {
    if (date) onDateSelect(date);
  };

  const handleRangeChange = (dates: [Date | null, Date | null]) => {
    const [start] = dates;
    if (start) onDateSelect(start);
  };

  if (mode === 'month') {
    return (
      <div className="date-picker-container p-2 rounded-md">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          showMonthYearPicker
          dateFormat="MM/yyyy"
          inline
          className="border-0 shadow-none bg-transparent"
        />
      </div>
    );
  }

  if (mode === 'week') {
    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
      return new Date(d.setDate(diff));
    };

    const getWeekEnd = (date: Date) => {
      const start = getWeekStart(date);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return end;
    };

    return (
      <div className="date-picker-container p-2 rounded-md">
        <DatePicker
          selected={selectedDate}
          onChange={handleRangeChange}
          startDate={getWeekStart(selectedDate)}
          endDate={getWeekEnd(selectedDate)}
          selectsRange
          inline
          showWeekNumbers
          className="border-0 shadow-none bg-transparent"
        />
      </div>
    );
  }

  // Day mode (default)
  return (
    <div className="date-picker-container p-2 rounded-md">
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        inline
        className="border-0 shadow-none bg-transparent"
      />
    </div>
  );
}