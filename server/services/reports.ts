import {
  type DailyMetrics, type DayReportMetrics, type TimelineSegment,
} from "@shared/types";
import {
  activityBuckets, workSessionsHistory, subtasks, taskScheduleHistory,
  type ActivityBucket,
} from "@shared/schema";
import { db } from "../core/database";
import { eq, and, inArray } from "drizzle-orm";
import { dateUtils } from "@shared/utils";
import { ACTIVITY_CONFIG } from "@shared/constants";
import { calculateTimeBreakdown, calculateAppUsage } from "./calculations";

type ActivityCategory = ActivityBucket['category'];

// =========================================================================
// Exports
// =========================================================================

export async function getDailyMetrics(date: string): Promise<DailyMetrics> {
  const buckets = await db.select().from(activityBuckets)
    .where(eq(activityBuckets.date, date))
    .orderBy(activityBuckets.startTime);

  if (buckets.length === 0) {
    return {
      date,
      timeBreakdown: {
        workedMinutes: 0,
        trackedMinutes: 0,
        focusMinutes: 0,
        distractionMinutes: 0,
        prefocusMinutes: 0,
        idleMinutes: 0,
        productivityRatio: 0,
        longestFocusStreak: 0
      }
    };
  }

  const timeBreakdown = calculateTimeBreakdown(buckets);
  return { date, timeBreakdown };
}

export async function getDayReportMetrics(date: string): Promise<DayReportMetrics> {
  const buckets = await db.select().from(activityBuckets)
    .where(eq(activityBuckets.date, date))
    .orderBy(activityBuckets.startTime);

  const timeBreakdown = calculateTimeBreakdown(buckets);

  const prevDate = new Date(date + 'T00:00:00');
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = dateUtils.formatDate(prevDate);
  const previousDayMetrics = await getDailyMetrics(prevDateStr);
  const previousDayBreakdown = previousDayMetrics.timeBreakdown.trackedMinutes > 0
    ? previousDayMetrics.timeBreakdown
    : null;

  const timeline = calculateTimelineSegments(buckets, date);
  const hourlyEfficiency = calculateHourlyEfficiency(buckets);
  const planExecution = await buildPlanExecution(date, buckets);
  const topApps = calculateAppUsage(buckets).slice(0, 3);

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

// =========================================================================
// Internal
// =========================================================================

async function buildPlanExecution(
  date: string,
  buckets: Array<{ subtaskId: number | null; startTime: string; endTime: string }>,
): Promise<DayReportMetrics['planExecution']> {
  const historyRows = await db.selectDistinct({ subtaskId: taskScheduleHistory.subtaskId })
    .from(taskScheduleHistory)
    .where(eq(taskScheduleHistory.scheduledDate, date));

  const subtaskIds = historyRows.map(r => r.subtaskId);

  if (subtaskIds.length === 0) {
    return { completedCount: 0, totalCount: 0, completionPercentage: 0, estimatedMinutes: 0, workedMinutes: 0, trackedMinutes: 0, estimationAccuracy: 0 };
  }

  const scheduled = await db.select().from(subtasks)
    .where(inArray(subtasks.id, subtaskIds));

  const totalCount = scheduled.length;
  const completedCount = scheduled.filter(s => s.status === 'completed').length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const estimatedMinutes = scheduled.reduce((sum, s) => sum + (s.estimatedMinutes ?? 0), 0);

  const sessions = await db.select().from(workSessionsHistory)
    .where(and(
      inArray(workSessionsHistory.subtaskId, subtaskIds),
      eq(workSessionsHistory.date, date)
    ));
  const workedMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);

  const scheduledIds = new Set(scheduled.map(s => s.id));
  const trackedMinutes = buckets
    .filter(b => b.subtaskId !== null && scheduledIds.has(b.subtaskId))
    .reduce((sum, b) => {
      const dur = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / (1000 * 60);
      return sum + dur;
    }, 0);

  const estimationAccuracy = estimatedMinutes > 0
    ? Math.max(0, Math.round((1 - Math.abs(estimatedMinutes - workedMinutes) / estimatedMinutes) * 100))
    : 0;

  return {
    completedCount,
    totalCount,
    completionPercentage,
    estimatedMinutes: Math.round(estimatedMinutes),
    workedMinutes: Math.round(workedMinutes),
    trackedMinutes: Math.round(trackedMinutes),
    estimationAccuracy,
  };
}

// =========================================================================
// Internal — Calculations (pure math, no DB)
// =========================================================================

function calculateTimelineSegments(
  buckets: Array<{ startTime: string; endTime: string; category: ActivityCategory }>,
  date: string
): DayReportMetrics['timeline'] {
  if (buckets.length === 0) return [];

  const segments: DayReportMetrics['timeline'] = [];

  const firstStart = dateUtils.toDecimalHour(buckets[0].startTime);
  const hourFloor = Math.floor(firstStart);
  if (firstStart - hourFloor > 1 / 60) {
    segments.push({ start: hourFloor, end: firstStart, status: 'untracked' });
  }

  let currentSegment = {
    start: firstStart,
    end: dateUtils.toDecimalHour(buckets[0].endTime),
    status: buckets[0].category as TimelineSegment['status'],
  };

  for (let i = 1; i < buckets.length; i++) {
    const bucketStart = dateUtils.toDecimalHour(buckets[i].startTime);
    const bucketEnd = dateUtils.toDecimalHour(buckets[i].endTime);
    const bucketStatus = buckets[i].category as TimelineSegment['status'];

    const gapMinutes = (bucketStart - currentSegment.end) * 60;
    if (gapMinutes > 1) {
      segments.push({ ...currentSegment });
      segments.push({ start: currentSegment.end, end: bucketStart, status: 'untracked' });
      currentSegment = { start: bucketStart, end: bucketEnd, status: bucketStatus };
    } else if (bucketStatus === currentSegment.status) {
      currentSegment.end = bucketEnd;
    } else {
      segments.push({ ...currentSegment });
      currentSegment = { start: bucketStart, end: bucketEnd, status: bucketStatus };
    }
  }
  segments.push({ ...currentSegment });

  const isToday = date === dateUtils.formatDate(new Date());
  const lastEnd = currentSegment.end;
  if (isToday) {
    const now = new Date();
    const nowDecimal = now.getHours() + now.getMinutes() / 60;
    if ((nowDecimal - lastEnd) * 60 > ACTIVITY_CONFIG.BUCKET_SIZE_MINUTES) {
      segments.push({ start: lastEnd, end: nowDecimal, status: 'untracked' });
    }
  } else {
    const hourCeil = Math.ceil(lastEnd);
    if (hourCeil - lastEnd > 1 / 60) {
      segments.push({ start: lastEnd, end: hourCeil, status: 'untracked' });
    }
  }

  return segments;
}

function calculateHourlyEfficiency(
  buckets: Array<{ startTime: string; endTime: string; category: ActivityCategory }>
): DayReportMetrics['hourlyEfficiency'] {
  if (buckets.length === 0) return [];

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

  return Array.from(hourlyData.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, data]) => ({
      time: dateUtils.formatHour(hour),
      timestamp: hour,
      efficiency: data.active > 0 ? Math.round((data.productive / data.active) * 100) : 0,
    }));
}
