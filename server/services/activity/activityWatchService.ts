/**
 * ActivityWatch Service — TypeScript port of activity_watch_service.py
 *
 * Analyses a time window via the AW REST API, classifies it as
 * focus / prefocus / distraction / idle, and returns a result
 * that nodeActivityWatch.ts persists to the database.
 */

import { ActivityWatchClient, type AWEvent } from './activityWatchClient';
import type { ActivityBucket } from '../../../shared/schema';

// ─── Configuration ──────────────────────────────────────────────────────────────

const CONFIG = {
  /** Minimum percentage of window time with activity to avoid idle */
  IDLE_THRESHOLD_PERCENTAGE: 0.1,
  /** Minimum percentage of bucket time for meaningful app usage */
  WORK_SESSION_APP_THRESHOLD_PERCENTAGE: 0.05,
  /** Consecutive prefocus buckets needed to reach focus */
  PREFOCUS_BUCKETS_REQUIRED: 2,
  /** Maximum consecutive distraction buckets before focus resets */
  MAX_DISTRACTION_BUCKETS: 2,
  /** Dominance ratio threshold for productive classification */
  PRODUCTIVE_SWITCHING_THRESHOLD: 0.5,
  /** Recent focused-bucket window for switching analysis */
  APP_SWITCHING_WINDOW_SIZE: 4,
  /** Unique-app ratio that triggers distraction */
  APP_SWITCHING_THRESHOLD: 0.75,
} as const;

// ─── Internal types ─────────────────────────────────────────────────────────────

interface AppUsagePattern {
  dominantApp: string;
  dominanceRatio: number;
  appCount: number;
  isProductive: boolean;
  sortedApps: [string, number][];
}

interface SessionWindowStates {
  sequence: string[];
  last: string;
  consecutivePrefocus: number;
  consecutiveUnproductive: number;
}

/** Valid activity classification categories. */
export type ActivityCategory = 'focus' | 'prefocus' | 'distraction' | 'idle';

/** The subset of ActivityBucket fields the service produces (no DB fields). */
export interface AnalysisResult {
  startTime: string;
  endTime: string;
  category: ActivityCategory;
  dominantApp: string | null;
  apps: Record<string, number>;
  workSessionApp: string | null;
}

// ─── Service ────────────────────────────────────────────────────────────────────

export class ActivityWatchService {
  private client: ActivityWatchClient;

  constructor(baseUrl: string) {
    this.client = new ActivityWatchClient(baseUrl);
  }

  async isRunning(): Promise<boolean> {
    return this.client.isRunning();
  }

  /**
   * Main entry point. Analyse a time window and return a result ready for storage.
   */
  async analyzeBucket(
    startTime: Date,
    endTime: Date,
    sessionWindow: ActivityBucket[] = []
  ): Promise<AnalysisResult | null> {
    try {
      const sortedWindow = [...sessionWindow].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      const { category, dominantApp, apps, workSessionApp } =
        await this.analyzeWindowActivity(startTime, endTime, sortedWindow);

      return {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        category,
        dominantApp: category !== 'idle' ? dominantApp : null,
        apps,
        workSessionApp: workSessionApp || null,
      };
    } catch (error) {
      console.error('[AW] analyzeBucket error:', error);
      return null;
    }
  }

  // ─── Core analysis pipeline ─────────────────────────────────────────────────

  private async analyzeWindowActivity(
    startTime: Date,
    endTime: Date,
    sessionWindow: ActivityBucket[]
  ): Promise<{
    category: ActivityCategory;
    dominantApp: string;
    apps: Record<string, number>;
    workSessionApp: string;
  }> {
    const idle: { category: ActivityCategory; dominantApp: string; apps: Record<string, number>; workSessionApp: string } =
      { category: 'idle', dominantApp: '', apps: {}, workSessionApp: '' };

    try {
      console.log(`[AW] Analyzing ${startTime.toISOString()} → ${endTime.toISOString()}`);

      const events = await this.client.getCanonicalEvents(startTime, endTime);
      if (!events.length) return idle;

      const windowSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
      const appUsage = this.calculateAppUsage(events);

      // Detect work session app first (even during idle, session context persists)
      const workSessionApp = this.detectWorkSessionApp(sessionWindow);

      if (this.isIdlePeriod(appUsage.apps, appUsage.totalActivity, windowSeconds)) {
        return { ...idle, apps: appUsage.apps, workSessionApp };
      }

      const patterns = this.analyzeAppPatterns(appUsage.apps, appUsage.totalActivity);
      const category = this.classifyActivityState(patterns, sessionWindow, workSessionApp);

      return { category, dominantApp: patterns.dominantApp, apps: appUsage.apps, workSessionApp };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[AW] analyzeWindowActivity error:', msg);
      return idle;
    }
  }

  // ─── App usage ──────────────────────────────────────────────────────────────

  private calculateAppUsage(events: AWEvent[]): { apps: Record<string, number>; totalActivity: number } {
    const apps: Record<string, number> = {};
    let totalActivity = 0;

    for (const event of events) {
      const app = (event.data?.app ?? '').toLowerCase();
      const dur = event.duration ?? 0;
      totalActivity += dur;
      if (app) apps[app] = (apps[app] ?? 0) + dur;
    }

    return { apps, totalActivity };
  }

  private isIdlePeriod(apps: Record<string, number>, totalActivity: number, windowSeconds: number): boolean {
    if (Object.keys(apps).length === 0 || windowSeconds <= 0) return true;
    return totalActivity / windowSeconds < CONFIG.IDLE_THRESHOLD_PERCENTAGE;
  }

  // ─── Pattern analysis ───────────────────────────────────────────────────────

  private analyzeAppPatterns(apps: Record<string, number>, totalActivity: number): AppUsagePattern {
    const empty: AppUsagePattern = {
      dominantApp: '', dominanceRatio: 0, appCount: 0, isProductive: false, sortedApps: [],
    };
    if (!Object.keys(apps).length || totalActivity <= 0) return empty;

    const sortedApps: [string, number][] = Object.entries(apps).sort((a, b) => b[1] - a[1]);
    const [dominantApp, dominantTime] = sortedApps[0];
    const dominanceRatio = dominantTime / totalActivity;

    return {
      dominantApp,
      dominanceRatio,
      appCount: sortedApps.length,
      isProductive: dominanceRatio >= CONFIG.PRODUCTIVE_SWITCHING_THRESHOLD,
      sortedApps,
    };
  }

  // ─── State classification ───────────────────────────────────────────────────

  private classifyActivityState(
    patterns: AppUsagePattern,
    sessionWindow: ActivityBucket[],
    workSessionApp: string
  ): ActivityCategory {
    const hasSwitching = this.detectAppSwitchingDistraction(sessionWindow, workSessionApp, patterns.dominantApp);

    // No history → first bucket
    if (!sessionWindow.length) {
      return patterns.isProductive && !hasSwitching ? 'prefocus' : 'distraction';
    }

    // With history
    if (patterns.isProductive && !hasSwitching) {
      return this.handleProductiveState(this.extractRecentStates(sessionWindow));
    }
    return 'distraction';
  }

  private handleProductiveState(states: SessionWindowStates): ActivityCategory {
    // Maintain focus momentum
    if (states.last === 'focus') return 'focus';

    // Accumulated enough prefocus
    if (states.consecutivePrefocus >= CONFIG.PREFOCUS_BUCKETS_REQUIRED - 1) return 'focus';

    // Recover focus after brief distractions
    if (
      states.consecutiveUnproductive > 0 &&
      states.consecutiveUnproductive <= CONFIG.MAX_DISTRACTION_BUCKETS &&
      this.hadFocusBeforeDistractions(states.sequence)
    ) {
      return 'focus';
    }

    return 'prefocus';
  }

  // ─── Session window helpers ─────────────────────────────────────────────────

  private extractRecentStates(sessionWindow: ActivityBucket[]): SessionWindowStates {
    const sequence = sessionWindow.map((b) => b.category);
    const last = sequence.at(-1) ?? '';

    return {
      sequence,
      last,
      consecutivePrefocus: this.countConsecutiveFromEnd(sequence, ['prefocus']),
      consecutiveUnproductive: this.countConsecutiveFromEnd(sequence, ['distraction', 'idle']),
    };
  }

  private detectAppSwitchingDistraction(
    sessionWindow: ActivityBucket[],
    workSessionApp: string,
    currentDominantApp: string
  ): boolean {
    if (sessionWindow.length < 2) return false;

    // Collect focused buckets newest → oldest
    const dominantApps: string[] = [];
    for (let i = sessionWindow.length - 1; i >= 0; i--) {
      const b = sessionWindow[i];
      if (!['focus', 'prefocus'].includes(b.category) || !b.dominantApp) continue;
      if (b.workSessionApp && b.workSessionApp !== workSessionApp) break;

      dominantApps.push(b.dominantApp);
      if (dominantApps.length >= CONFIG.APP_SWITCHING_WINDOW_SIZE) break;
    }

    if (currentDominantApp && currentDominantApp !== '') {
      dominantApps.push(currentDominantApp);
    }

    if (dominantApps.length < 2) return false;

    const uniqueRatio = new Set(dominantApps).size / dominantApps.length;
    return uniqueRatio >= CONFIG.APP_SWITCHING_THRESHOLD;
  }

  /**
   * Detect the primary app being used across the current work session.
   * Only considers focus/prefocus buckets so distraction apps don't pollute.
   */
  private detectWorkSessionApp(sessionWindow: ActivityBucket[]): string {
    if (!sessionWindow.length) return '';

    const appTime: Record<string, number> = {};

    for (const bucket of sessionWindow) {
      if (!['focus', 'prefocus'].includes(bucket.category)) continue;

      const startMs = new Date(bucket.startTime).getTime();
      const endMs = new Date(bucket.endTime).getTime();
      const durationSec = (endMs - startMs) / 1000;
      if (durationSec <= 0) continue;

      // `apps` comes from the DB as JSON text → parsed as unknown
      const apps = this.parseAppsField(bucket.apps);
      for (const [appName, usageTime] of Object.entries(apps)) {
        if (usageTime / durationSec >= CONFIG.WORK_SESSION_APP_THRESHOLD_PERCENTAGE) {
          appTime[appName] = (appTime[appName] ?? 0) + usageTime;
        }
      }
    }

    if (!Object.keys(appTime).length) return '';
    return Object.entries(appTime).sort((a, b) => b[1] - a[1])[0][0];
  }

  // ─── Utility ────────────────────────────────────────────────────────────────

  private countConsecutiveFromEnd(states: string[], targets: string[]): number {
    let count = 0;
    for (let i = states.length - 1; i >= 0; i--) {
      if (targets.includes(states[i])) count++;
      else break;
    }
    return count;
  }

  private hadFocusBeforeDistractions(states: string[]): boolean {
    if (!states.length) return false;

    let checkIdx = states.length;
    for (let i = states.length - 1; i >= 0; i--) {
      if (states[i] === 'distraction' || states[i] === 'idle') checkIdx = i;
      else break;
    }

    return checkIdx > 0 && states[checkIdx - 1] === 'focus';
  }

  /**
   * Type-safe parser for the `apps` JSON column.
   * The DB stores it as text (JSON), Drizzle normally returns a parsed object,
   * but guards against double-encoded strings and stringified numeric values.
   */
  private parseAppsField(apps: unknown): Record<string, number> {
    if (!apps) return {};

    // Handle double-encoded JSON string (e.g. the DB text wasn't auto-parsed)
    if (typeof apps === 'string') {
      try {
        apps = JSON.parse(apps);
      } catch {
        return {};
      }
    }

    if (typeof apps !== 'object' || Array.isArray(apps)) return {};

    const result: Record<string, number> = {};
    for (const [key, val] of Object.entries(apps as Record<string, unknown>)) {
      if (typeof val === 'number') {
        result[key] = val;
      } else if (typeof val === 'string') {
        const num = parseFloat(val);
        if (!Number.isNaN(num)) result[key] = num;
      }
    }
    return result;
  }
}
