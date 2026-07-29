import {
  type TimeBreakdown, type AppUsage,
} from "@shared/types";
import type { ActivityBucket } from "@shared/schema";

type ActivityCategory = ActivityBucket['category'];

// =========================================================================
// Time breakdown
// =========================================================================

export function calculateTimeBreakdown(
  buckets: { category: ActivityCategory; startTime: string; endTime: string }[],
  worked: number | { durationMinutes: number | null }[] = 0,
): TimeBreakdown {
  const workedMinutes = typeof worked === 'number'
    ? worked
    : Math.round(worked.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0));
  let focusMinutes = 0;
  let prefocusMinutes = 0;
  let idleMinutes = 0;
  let distractionMinutes = 0;
  let productiveMinutes = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i];
    const startTime = new Date(bucket.startTime);
    const endTime = new Date(bucket.endTime);
    const bucketMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    switch (bucket.category) {
      case 'focus':
        focusMinutes += bucketMinutes;
        productiveMinutes += bucketMinutes;
        currentStreak += bucketMinutes;
        longestStreak = Math.max(longestStreak, currentStreak);
        break;
      case 'prefocus': {
        prefocusMinutes += bucketMinutes;
        currentStreak = 0;
        const next = buckets[i + 1];
        productiveMinutes += next?.category === 'focus' ? bucketMinutes : bucketMinutes * 0.5;
        break;
      }
      case 'distraction':
        distractionMinutes += bucketMinutes;
        currentStreak = 0;
        break;
      case 'idle':
        idleMinutes += bucketMinutes;
        currentStreak = 0;
        break;
    }
  }

  const totalMinutes = focusMinutes + prefocusMinutes + idleMinutes + distractionMinutes;
  const activeMinutes = focusMinutes + prefocusMinutes + distractionMinutes;
  const productivityRatio = activeMinutes > 0 ? productiveMinutes / activeMinutes : 0;

  return {
    workedMinutes,
    trackedMinutes: totalMinutes,
    focusMinutes,
    prefocusMinutes,
    idleMinutes,
    distractionMinutes,
    productivityRatio: Math.round(productivityRatio * 100) / 100,
    longestFocusStreak: Math.round(longestStreak)
  };
}

// =========================================================================
// App usage
// =========================================================================

export function calculateAppUsage(buckets: Array<{ apps: unknown }>): AppUsage[] {
  const appUsageMap = new Map<string, number>();

  for (const bucket of buckets) {
    if (bucket.apps) {
      let appsData: Record<string, unknown>;
      if (typeof bucket.apps === 'string') {
        try {
          appsData = JSON.parse(bucket.apps);
        } catch {
          continue; // Skip buckets with malformed apps JSON rather than failing the request
        }
      } else {
        appsData = bucket.apps as Record<string, unknown>;
      }
      if (!appsData || typeof appsData !== 'object') continue;
      for (const [appName, seconds] of Object.entries(appsData)) {
        const minutes = (seconds as number) / 60;
        const currentMinutes = appUsageMap.get(appName) || 0;
        appUsageMap.set(appName, currentMinutes + minutes);
      }
    }
  }

  const totalAppMinutes = Array.from(appUsageMap.values()).reduce((sum, m) => sum + m, 0);

  const apps: AppUsage[] = [];
  appUsageMap.forEach((minutes, appName) => {
    apps.push({
      app: appName,
      minutes,
      percentage: totalAppMinutes > 0
        ? Math.round((minutes / totalAppMinutes) * 100 * 10) / 10
        : 0
    });
  });

  return apps.sort((a, b) => b.minutes - a.minutes);
}
