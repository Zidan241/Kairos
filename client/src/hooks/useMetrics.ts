import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { type DailyMetrics, type DayReportMetrics } from "@shared/types";
import { ACTIVITY_CONFIG } from "@shared/constants.js";
import { dateUtils } from "@shared/utils";

// ------------------------------------------------
// METRICS QUERY HOOKS - For reading metrics data
// ------------------------------------------------

export function useDailyMetrics(date?: string) {
  const targetDate = date || dateUtils.getTodayDate();
  
  return useQuery<DailyMetrics>({
    queryKey: ['metrics', 'daily', targetDate],
    queryFn: () => analyticsApi.getDailyMetrics(date),
    staleTime: ACTIVITY_CONFIG.METRICS_CACHE_TIME_MS,
  });
}

export function useDayReport(date?: string) {
  const targetDate = date || dateUtils.getTodayDate();

  return useQuery<DayReportMetrics>({
    queryKey: ['metrics', 'day-report', targetDate],
    queryFn: () => analyticsApi.getDayReport(targetDate),
    staleTime: ACTIVITY_CONFIG.METRICS_CACHE_TIME_MS,
  });
}