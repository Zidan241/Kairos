import { 
  type DailyMetrics, type DayReportMetrics, type AppUsage, type TimeBreakdown,
  type ScheduleBreakdown, type SubtaskMetrics
} from "@shared/metrics";
import {
  activityBuckets, subtasks, type ActivityBucket
} from "@shared/schema";

import { db } from "../core/database";
import { eq, desc, inArray } from "drizzle-orm";

type ActivityCategory = ActivityBucket['category'];

export interface IMetricsService {
  getSubtaskMetricsBulk(subtaskIds: number[]): Promise<Record<number, SubtaskMetrics>>;
  getDailyMetrics(date: string): Promise<DailyMetrics>;
  getDayReportMetrics(date: string): Promise<DayReportMetrics>;
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
  private calculateTimeBreakdown(buckets: { category: ActivityCategory; startTime: string; endTime: string }[]): TimeBreakdown {
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
   * Get all data needed for the Day Report page in a single call.
   */
  async getDayReportMetrics(date: string): Promise<DayReportMetrics> {
    // Fetch today's buckets (used for breakdown, timeline, hourly, apps)
    const buckets = await db.select().from(activityBuckets)
      .where(eq(activityBuckets.date, date))
      .orderBy(activityBuckets.startTime);

    const timeBreakdown = this.calculateTimeBreakdown(buckets);

    // Previous day for trend comparison
    const prevDate = new Date(date + 'T00:00:00');
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const previousDayMetrics = await this.getDailyMetrics(prevDateStr);
    const previousDayBreakdown = previousDayMetrics.timeBreakdown.totalMinutes > 0
      ? previousDayMetrics.timeBreakdown
      : null;

    // Timeline segments
    const timeline = this.buildTimelineSegments(buckets);

    // Hourly efficiency
    const hourlyEfficiency = this.buildHourlyEfficiency(buckets);

    // Plan execution
    const planExecution = await this.buildPlanExecution(date, buckets);

    // Top apps
    const topApps = this.calculateAppUsageForBuckets(buckets, timeBreakdown.totalMinutes);

    return {
      date,
      timeBreakdown,
      previousDayBreakdown,
      timeline,
      hourlyEfficiency,
      planExecution,
      topApps,
    };
  }

  /**
   * Merge adjacent activity buckets into contiguous timeline segments.
   * Maps: focus+prefocus → focus, distraction → distracted, idle → idle.
   * Gaps between buckets become "untracked".
   */
  private buildTimelineSegments(
    buckets: Array<{ startTime: string; endTime: string; category: ActivityCategory }>
  ): DayReportMetrics['timeline'] {
    if (buckets.length === 0) return [];

    const mapStatus = (category: ActivityCategory): 'focus' | 'distracted' | 'idle' | 'untracked' => {
      switch (category) {
        case 'focus':
        case 'prefocus':
          return 'focus';
        case 'distraction':
          return 'distracted';
        case 'idle':
          return 'idle';
        default:
          return 'untracked';
      }
    };

    const toDecimalHour = (iso: string): number => {
      const d = new Date(iso);
      return d.getHours() + d.getMinutes() / 60;
    };

    const segments: DayReportMetrics['timeline'] = [];
    let currentSegment = {
      start: toDecimalHour(buckets[0].startTime),
      end: toDecimalHour(buckets[0].endTime),
      status: mapStatus(buckets[0].category),
    };

    for (let i = 1; i < buckets.length; i++) {
      const bucketStart = toDecimalHour(buckets[i].startTime);
      const bucketEnd = toDecimalHour(buckets[i].endTime);
      const bucketStatus = mapStatus(buckets[i].category);

      // Gap > 1 minute → insert untracked segment
      const gapMinutes = (bucketStart - currentSegment.end) * 60;
      if (gapMinutes > 1) {
        segments.push({ ...currentSegment });
        segments.push({ start: currentSegment.end, end: bucketStart, status: 'untracked' });
        currentSegment = { start: bucketStart, end: bucketEnd, status: bucketStatus };
      } else if (bucketStatus === currentSegment.status) {
        // Same status → extend
        currentSegment.end = bucketEnd;
      } else {
        // Different status → push current, start new
        segments.push({ ...currentSegment });
        currentSegment = { start: bucketStart, end: bucketEnd, status: bucketStatus };
      }
    }
    segments.push({ ...currentSegment });

    return segments;
  }

  /**
   * Calculate per-hour efficiency = (focus + prefocus) / total tracked time.
   * Only includes hours that have at least some tracked activity.
   */
  private buildHourlyEfficiency(
    buckets: Array<{ startTime: string; endTime: string; category: ActivityCategory }>
  ): DayReportMetrics['hourlyEfficiency'] {
    if (buckets.length === 0) return [];

    // Accumulate minutes per clock hour, splitting buckets that cross hour boundaries
    const hourlyData = new Map<number, { productive: number; total: number }>();
    const isProductive = (cat: ActivityCategory) => cat === 'focus' || cat === 'prefocus';

    for (const bucket of buckets) {
      const start = new Date(bucket.startTime);
      const end = new Date(bucket.endTime);
      let cursor = start;

      while (cursor < end) {
        const hour = cursor.getHours();
        const nextHourBoundary = new Date(cursor);
        nextHourBoundary.setHours(hour + 1, 0, 0, 0);

        const segmentEnd = nextHourBoundary < end ? nextHourBoundary : end;
        const minutes = (segmentEnd.getTime() - cursor.getTime()) / (1000 * 60);

        const entry = hourlyData.get(hour) || { productive: 0, total: 0 };
        entry.total += minutes;
        if (isProductive(bucket.category)) {
          entry.productive += minutes;
        }
        hourlyData.set(hour, entry);

        cursor = segmentEnd;
      }
    }

    // Convert to sorted array
    const formatHour = (h: number): string => {
      if (h === 0) return '12AM';
      if (h < 12) return `${h}AM`;
      if (h === 12) return '12PM';
      return `${h - 12}PM`;
    };

    return Array.from(hourlyData.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, data]) => ({
        time: formatHour(hour),
        timestamp: hour,
        efficiency: data.total > 0 ? Math.round((data.productive / data.total) * 100) : 0,
      }));
  }

  /**
   * Build plan execution stats: how many scheduled subtasks were completed,
   * and how accurate the time estimates were vs actual tracked time.
   */
  private async buildPlanExecution(
    date: string,
    buckets: Array<{ subtaskId: number | null; startTime: string; endTime: string }>
  ): Promise<DayReportMetrics['planExecution']> {
    // Get subtasks scheduled for this date
    const scheduled = await db.select().from(subtasks)
      .where(eq(subtasks.scheduledDate, date));

    const totalCount = scheduled.length;
    const completedCount = scheduled.filter(s => s.isCompleted).length;
    const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const estimatedMinutes = scheduled.reduce((sum, s) => sum + (s.estimatedMinutes ?? 0), 0);

    // Actual minutes from activity buckets linked to these subtasks
    const scheduledIds = new Set(scheduled.map(s => s.id));
    const actualMinutes = buckets
      .filter(b => b.subtaskId !== null && scheduledIds.has(b.subtaskId))
      .reduce((sum, b) => {
        const dur = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / (1000 * 60);
        return sum + dur;
      }, 0);

    const estimationAccuracy = estimatedMinutes > 0
      ? Math.max(0, Math.round((1 - Math.abs(estimatedMinutes - actualMinutes) / estimatedMinutes) * 100))
      : 0;

    return {
      completedCount,
      totalCount,
      completionPercentage,
      estimatedMinutes: Math.round(estimatedMinutes),
      actualMinutes: Math.round(actualMinutes),
      estimationAccuracy,
    };
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