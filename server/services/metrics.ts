import {
  type DailyMetrics, type DayReportMetrics, type AppUsage, type TimeBreakdown,
  type ScheduleBreakdown, type SubtaskMetrics
} from "@shared/metrics";
import {
  activityBuckets, workSessionsHistory, subtasks, type ActivityBucket
} from "@shared/schema";
import { db } from "../core/database";
import { eq, desc, asc, inArray } from "drizzle-orm";
import { dateUtils } from "@shared/utils";

type ActivityCategory = ActivityBucket['category'];

export class MetricsService {

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
          const apps = this.calculateAppUsageForBuckets(buckets);

          scheduleBreakdown.push({
            date,
            timeBreakdown: dateTimeBreakdown,
            apps
          });
        });
      }

      subtaskMetrics[subtaskId] = {
        timeBreakdown,
        scheduleBreakdown: scheduleBreakdown.sort((a, b) => a.date.localeCompare(b.date)),
        workSessions: [],
      };
    });

    // Populate work sessions
    if (subtaskIds.length > 0) {
      const sessions = await db.select().from(workSessionsHistory)
        .where(inArray(workSessionsHistory.subtaskId, subtaskIds))
        .orderBy(asc(workSessionsHistory.startedAt));

      for (const session of sessions) {
        if (subtaskMetrics[session.subtaskId]) {
          subtaskMetrics[session.subtaskId].workSessions.push(session);
        }
      }
    }

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
    let productiveMinutes = 0;
    let currentStreak = 0;
    let longestStreak = 0;

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      // Calculate actual bucket duration in minutes
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
          // Prefocus that leads to focus counts fully; otherwise weighted at 0.5x
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
    // Idle excluded from the denominator: productivity measures "when you were
    // at the keyboard, how focused were you?" Breaks shouldn't penalise the score.
    const activeMinutes = focusMinutes + prefocusMinutes + distractionMinutes;
    const productivityRatio = activeMinutes > 0 ? productiveMinutes / activeMinutes : 0;

    return {
      totalMinutes,
      focusMinutes,
      prefocusMinutes,
      idleMinutes,
      distractionMinutes,
      productivityRatio: Math.round(productivityRatio * 100) / 100,
      longestFocusStreak: Math.round(longestStreak)
    };
  }

  /**
   * Calculate app usage from activity buckets
   */
  private calculateAppUsageForBuckets(
    buckets: Array<{ apps: unknown }>
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

    // Percentage is relative to total app time, not all tracked time
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
    const prevDateStr = dateUtils.formatDate(prevDate);
    const previousDayMetrics = await this.getDailyMetrics(prevDateStr);
    const previousDayBreakdown = previousDayMetrics.timeBreakdown.totalMinutes > 0
      ? previousDayMetrics.timeBreakdown
      : null;

    // Timeline segments
    const timeline = this.buildTimelineSegments(buckets, date);

    // Hourly efficiency
    const hourlyEfficiency = this.buildHourlyEfficiency(buckets);

    // Plan execution
    const planExecution = await this.buildPlanExecution(date, buckets);

    // Top apps — only return top 3 for the report
    const topApps = this.calculateAppUsageForBuckets(buckets).slice(0, 3);

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
   * Each category maps to its own status so prefocus is visually distinct.
   * Gaps between buckets become "untracked". For today, a trailing untracked
   * segment is appended from the last bucket to the current time so users
   * can see time elapsed since their last tracked activity.
   */
  private buildTimelineSegments(
    buckets: Array<{ startTime: string; endTime: string; category: ActivityCategory }>,
    date: string
  ): DayReportMetrics['timeline'] {
    if (buckets.length === 0) return [];

    const mapStatus = (category: ActivityCategory): 'focus' | 'prefocus' | 'distracted' | 'idle' | 'untracked' => {
      switch (category) {
        case 'focus':
          return 'focus';
        case 'prefocus':
          return 'prefocus';
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

    // Lead-in: untracked from top of the first hour to the first bucket
    const firstStart = toDecimalHour(buckets[0].startTime);
    const hourFloor = Math.floor(firstStart);
    if (firstStart - hourFloor > 1 / 60) { // > 1 minute into the hour
      segments.push({ start: hourFloor, end: firstStart, status: 'untracked' });
    }

    let currentSegment = {
      start: firstStart,
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

    // Trailing untracked segment after last activity.
    // Today: from last bucket to now (skip if gap < one bucket size — likely in-progress).
    // Past days: from last bucket to the end of that hour.
    const isToday = date === dateUtils.formatDate(new Date());
    const lastEnd = currentSegment.end;
    if (isToday) {
      const now = new Date();
      const nowDecimal = now.getHours() + now.getMinutes() / 60;
      const BUCKET_MINUTES = 5;
      if ((nowDecimal - lastEnd) * 60 > BUCKET_MINUTES) {
        segments.push({ start: lastEnd, end: nowDecimal, status: 'untracked' });
      }
    } else {
      const hourCeil = Math.ceil(lastEnd);
      if (hourCeil - lastEnd > 1 / 60) { // > 1 minute remaining in the hour
        segments.push({ start: lastEnd, end: hourCeil, status: 'untracked' });
      }
    }

    return segments;
  }

  /**
   * Calculate per-hour efficiency = (focus + prefocus) / active time (idle excluded).
   * Only includes hours that have at least some tracked activity.
   */
  private buildHourlyEfficiency(
    buckets: Array<{ startTime: string; endTime: string; category: ActivityCategory }>
  ): DayReportMetrics['hourlyEfficiency'] {
    if (buckets.length === 0) return [];

    // Accumulate minutes per clock hour, splitting buckets that cross hour boundaries
    const hourlyData = new Map<number, { productive: number; active: number }>();
    const isProductive = (cat: ActivityCategory) => cat === 'focus' || cat === 'prefocus';
    const isActive = (cat: ActivityCategory) => cat !== 'idle';

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

        const entry = hourlyData.get(hour) || { productive: 0, active: 0 };
        if (isActive(bucket.category)) {
          entry.active += minutes;
        }
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
        efficiency: data.active > 0 ? Math.round((data.productive / data.active) * 100) : 0,
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
          productivityRatio: 0,
          longestFocusStreak: 0
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
    const TASK_TRANSITION_BUCKETS_REQUIRED = 2;

    // Fetch one extra bucket so we can confirm the app actually *changed*
    const recentBuckets = await db.select().from(activityBuckets)
      .orderBy(desc(activityBuckets.startTime))
      .limit(TASK_TRANSITION_BUCKETS_REQUIRED + 1);

    if (recentBuckets.length < TASK_TRANSITION_BUCKETS_REQUIRED + 1) return false;

    const currentBucket = recentBuckets[0];

    // Only focused/prefocused activity can be a task transition
    if (!['focus', 'prefocus'].includes(currentBucket.category)) {
      return false;
    }

    const newApp = currentBucket.dominantApp;
    if (!newApp) return false; // no dominant app = can't detect transition

    // Check that the N most recent buckets all share the new dominant app
    for (let i = 0; i < TASK_TRANSITION_BUCKETS_REQUIRED; i++) {
      const bucket = recentBuckets[i];
      if (bucket.dominantApp !== newApp || !['focus', 'prefocus'].includes(bucket.category)) {
        return false;
      }
    }

    // Confirm the bucket before them had a *different* app (actual transition)
    const previousBucket = recentBuckets[TASK_TRANSITION_BUCKETS_REQUIRED];
    return previousBucket.dominantApp !== newApp;
  }
}

export const metricsService = new MetricsService();