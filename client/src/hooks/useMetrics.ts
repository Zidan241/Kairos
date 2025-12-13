import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "@/lib/api";
import { type DailyMetrics } from "@shared/metrics";
import { ACTIVITY_CONFIG } from "@shared/constants";
import { dateUtils } from "@shared/utils";

// ------------------------------------------------
// METRICS QUERY HOOKS - For reading metrics data
// ------------------------------------------------

export function useDailyMetrics(date?: string) {
  const targetDate = date || dateUtils.getTodayDate();
  
  return useQuery<DailyMetrics>({
    queryKey: ['metrics', 'daily', targetDate],
    queryFn: () => metricsApi.getDailyMetrics(date),
    staleTime: ACTIVITY_CONFIG.METRICS_CACHE_TIME_MS,
  });
}