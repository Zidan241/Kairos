export const dateUtils = {
  // Get today's date in YYYY-MM-DD format
  getTodayDate: (): string => {
    return new Date().toISOString().split('T')[0];
  },
  
  // Get date range for week/month
  getWeekRange: (weeksAgo: number = 0): { start: string; end: string } => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (weeksAgo * 7) - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  },
  
  getMonthRange: (monthsAgo: number = 0): { start: string; end: string } => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }
};