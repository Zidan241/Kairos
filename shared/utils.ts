export const dateUtils = {
  // Get today's date in YYYY-MM-DD format (local timezone)
  getTodayDate: (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  },
  
  // Format a Date to YYYY-MM-DD in local timezone
  formatDate: (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },
  
  // Get date range for week/month
  getWeekRange: (weeksAgo: number = 0): { start: string; end: string } => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (weeksAgo * 7) - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return {
      start: dateUtils.formatDate(start),
      end: dateUtils.formatDate(end)
    };
  },
  
  getMonthRange: (monthsAgo: number = 0): { start: string; end: string } => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
    
    return {
      start: dateUtils.formatDate(start),
      end: dateUtils.formatDate(end)
    };
  },

  // ISO string to decimal hour in local timezone (e.g. 9:30 AM → 9.5)
  toDecimalHour: (iso: string): number => {
    const d = new Date(iso);
    return d.getHours() + d.getMinutes() / 60;
  },

  // Format hour number to 12h label (e.g. 14 → '2PM')
  formatHour: (h: number): string => {
    if (h === 0) return '12AM';
    if (h < 12) return `${h}AM`;
    if (h === 12) return '12PM';
    return `${h - 12}PM`;
  },

  // Get a Date N days before the given date (defaults to today)
  daysAgo: (n: number, from: Date = new Date()): Date => {
    const d = new Date(from);
    d.setDate(d.getDate() - n);
    return d;
  },
};