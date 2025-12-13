import { 
  type DailyMetrics, type AppUsage, type TimeBreakdown, type ScheduleBreakdown, type SubtaskMetrics
} from "@shared/metrics";
import {
  activityBuckets
} from "@shared/schema";
import { db } from "../core/database";
import { eq, desc, inArray } from "drizzle-orm";

export interface IMetricsService {
  getSubtaskMetricsBulk(subtaskIds: number[]): Promise<Record<number, SubtaskMetrics>>;
  getDailyMetrics(date: string): Promise<DailyMetrics>;
  getDateRangeMetrics(startDate: string, endDate: string): Promise<DailyMetrics[]>;
  checkTaskTransition(): Promise<boolean>;
}

export class MetricsService implements IMetricsService {
  
  /**
   * Get complete metrics for multiple subtasks efficiently
   */
  async getSubtaskMetricsBulk(subtaskIds: number[]): Promise<Record<number, SubtaskMetrics>> {
    if (subtaskIds.length === 0) return {};

    // Get all activity buckets for the subtasks
    const activityResults = await db.select({
      subtaskId: activityBuckets.subtaskId,
      category: activityBuckets.category,
      startTime: activityBuckets.startTime,
      endTime: activityBuckets.endTime,
      apps: activityBuckets.apps,
      date: activityBuckets.date,
    })
    .from(activityBuckets)
    .where(inArray(activityBuckets.subtaskId, subtaskIds))
    .orderBy(activityBuckets.date, activityBuckets.startTime);

    // Group activity buckets by subtask and date
    const subtaskActivityMap = new Map<number, typeof activityResults>();
    const subtaskDateMap = new Map<number, Map<string, typeof activityResults>>();
    
    for (const row of activityResults) {
      if (row.subtaskId) {
        // For overall time breakdown
        if (!subtaskActivityMap.has(row.subtaskId)) {
          subtaskActivityMap.set(row.subtaskId, []);
        }
        subtaskActivityMap.get(row.subtaskId)!.push(row);
        
        // For schedule breakdown by date
        if (!subtaskDateMap.has(row.subtaskId)) {
          subtaskDateMap.set(row.subtaskId, new Map());
        }
        const dateMap = subtaskDateMap.get(row.subtaskId)!;
        if (!dateMap.has(row.date)) {
          dateMap.set(row.date, []);
        }
        dateMap.get(row.date)!.push(row);
      }
    }

    // Calculate complete metrics for each subtask
    const subtaskMetrics: Record<number, SubtaskMetrics> = {};
    
    subtaskIds.forEach(subtaskId => {
      // Calculate overall time breakdown
      const allActivityBuckets = subtaskActivityMap.get(subtaskId) || [];
      const timeBreakdown = this.calculateTimeBreakdown(allActivityBuckets);
      
      // Calculate schedule breakdown by date (derived from activity buckets)
      const scheduleBreakdown: ScheduleBreakdown[] = [];
      const dateMap = subtaskDateMap.get(subtaskId);
      
      if (dateMap) {
        dateMap.forEach((buckets, date) => {
          const dateTimeBreakdown = this.calculateTimeBreakdown(buckets);
          const apps = this.calculateAppUsageForBuckets(buckets, dateTimeBreakdown.totalMinutes);
          
          scheduleBreakdown.push({
            date,
            timeBreakdown: dateTimeBreakdown,
            apps
          });
        });
      }
      
      subtaskMetrics[subtaskId] = {
        timeBreakdown,
        scheduleBreakdown: scheduleBreakdown.sort((a, b) => a.date.localeCompare(b.date))
      };
    });

    return subtaskMetrics;
  }

  /**
   * Helper method to calculate time breakdown from activity buckets
   */
  private calculateTimeBreakdown(buckets: { category: string; startTime: string; endTime: string }[]): TimeBreakdown {
    let focusMinutes = 0;
    let prefocusMinutes = 0;
    let idleMinutes = 0;
    let distractionMinutes = 0;
    
    for (const bucket of buckets) {
      // Calculate actual bucket duration in minutes
      const startTime = new Date(bucket.startTime);
      const endTime = new Date(bucket.endTime);
      const bucketMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      
      switch (bucket.category) {
        case 'focus':
          focusMinutes += bucketMinutes;
          break;
        case 'prefocus':
          prefocusMinutes += bucketMinutes;
          break;
        case 'distraction':
          distractionMinutes += bucketMinutes;
          break;
        case 'idle':
          idleMinutes += bucketMinutes;
          break;
      }
    }
    
    const totalMinutes = focusMinutes + prefocusMinutes + idleMinutes + distractionMinutes;
    const productiveMinutes = focusMinutes + prefocusMinutes;
    const productivityRatio = totalMinutes > 0 ? productiveMinutes / totalMinutes : 0;
    
    return {
      totalMinutes,
      focusMinutes,
      prefocusMinutes,
      idleMinutes,
      distractionMinutes,
      productivityRatio: Math.round(productivityRatio * 100) / 100
    };
  }

  /**
   * Calculate app usage from activity buckets
   */
  private calculateAppUsageForBuckets(
    buckets: Array<{ apps: unknown }>, 
    totalMinutes: number
  ): AppUsage[] {
    const appUsageMap = new Map<string, number>();
    
    for (const bucket of buckets) {
      if (bucket.apps) {
        const appsData = typeof bucket.apps === 'string' ? JSON.parse(bucket.apps) : bucket.apps;
        for (const [appName, seconds] of Object.entries(appsData)) {
          const minutes = (seconds as number) / 60;
          const currentMinutes = appUsageMap.get(appName) || 0;
          appUsageMap.set(appName, currentMinutes + minutes);
        }
      }
    }

    const apps: AppUsage[] = [];
    appUsageMap.forEach((minutes, appName) => {
      apps.push({
        app: appName,
        minutes,
        percentage: totalMinutes > 0 
          ? Math.round((minutes / totalMinutes) * 100 * 10) / 10 
          : 0
      });
    });

    return apps.sort((a, b) => b.minutes - a.minutes);
  }

  /**
   * Get daily metrics for a date range
   */
  async getDateRangeMetrics(startDate: string, endDate: string): Promise<DailyMetrics[]> {
    const metrics: DailyMetrics[] = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dailyMetrics = await this.getDailyMetrics(dateStr);
      metrics.push(dailyMetrics);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return metrics;
  }

  /**
   * Calculate daily productivity metrics for a specific date
   */
  async getDailyMetrics(date: string): Promise<DailyMetrics> {
    // Get all activity buckets for the date
    const buckets = await db.select().from(activityBuckets)
      .where(eq(activityBuckets.date, date))
      .orderBy(activityBuckets.startTime);

    if (buckets.length === 0) {
      return {
        date,
        timeBreakdown: {
          totalMinutes: 0,
          focusMinutes: 0,
          distractionMinutes: 0,
          prefocusMinutes: 0,
          idleMinutes: 0,
          productivityRatio: 0
        }
      };
    }

    const timeBreakdown = this.calculateTimeBreakdown(buckets);
    
    return {
      date,
      timeBreakdown
    };
  }

  /**
   * Detect if there's a task transition based on recent activity patterns
   */
  async checkTaskTransition(): Promise<boolean> {
    // Configuration matching Python script
    const TASK_TRANSITION_BUCKETS_REQUIRED = 2;
    
    // Get recent buckets (session window)
    const recentBuckets = await db.select().from(activityBuckets)
      .orderBy(desc(activityBuckets.startTime))
      .limit(TASK_TRANSITION_BUCKETS_REQUIRED);

    // Get the current (most recent) bucket
    const currentBucket = recentBuckets[0];
    
    // Only focused/prefocused activity can be a task transition
    if (!['focus', 'prefocus'].includes(currentBucket.category)) {
      return false;
    }

    // Count recent consecutive buckets with the new app
    const newApp = currentBucket.dominantApp;
    let consecutiveNewApp = 0;
    
    // Check from the end (most recent) backwards - reversed order since we got desc
    for (const bucket of recentBuckets) {
      if (bucket.dominantApp === newApp && 
          ['focus', 'prefocus'].includes(bucket.category)) {
        consecutiveNewApp += 1;
      } else {
        break;
      }
    }

    // Task transition confirmed if sustained focus on new app
    return consecutiveNewApp >= TASK_TRANSITION_BUCKETS_REQUIRED;
  }
}

export const metricsService = new MetricsService();