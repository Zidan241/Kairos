import * as cron from 'node-cron';
import { getActiveSubtask, updateSubtask } from '../subtasks';
import type { ActivityBucket, InsertActivityBucket } from '../../../shared/schema';
import { activityBuckets } from '../../../shared/schema';
import { ACTIVITY_CONFIG, DEFAULT_ACTIVITY_WATCH_URL } from '../../../shared/constants.js';
import { dateUtils } from '../../../shared/utils';
import { ActivityWatchService, type AnalysisResult } from './activityWatchService';
import { db } from '../../core/database';
import { desc } from 'drizzle-orm';

export class NodeActivityWatchService {
  private static readonly BUCKET_SIZE_MINUTES = ACTIVITY_CONFIG.BUCKET_SIZE_MINUTES;
  private static readonly SESSION_WINDOW_SIZE = ACTIVITY_CONFIG.SESSION_WINDOW_SIZE;
  
  private awService: ActivityWatchService;
  private paused = false;
  private cronTask: cron.ScheduledTask | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(baseUrl: string = DEFAULT_ACTIVITY_WATCH_URL) {
    this.awService = new ActivityWatchService(baseUrl);
    this.startCronJobs();
  }

  private startCronJobs() {
    if (NodeActivityWatchService.BUCKET_SIZE_MINUTES < 1) {
      const intervalMs = NodeActivityWatchService.BUCKET_SIZE_MINUTES * 60 * 1000;
      this.intervalId = setInterval(() => this.processRecentActivity(), intervalMs);
      console.log(`📊 Bucket processing every ${NodeActivityWatchService.BUCKET_SIZE_MINUTES} minutes (testing interval)`);
    } else {
      this.cronTask = cron.schedule(`*/${NodeActivityWatchService.BUCKET_SIZE_MINUTES} * * * *`, () => this.processRecentActivity());
      console.log(`📊 Bucket processing every ${NodeActivityWatchService.BUCKET_SIZE_MINUTES} minutes`);
    }
  }

  /** Pause polling — server stops reading from ActivityWatch */
  pause() {
    if (this.paused) return;
    this.paused = true;
    if (this.cronTask) this.cronTask.stop();
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⏸️  ActivityWatch polling paused');
  }

  /** Resume polling — server starts reading from ActivityWatch again */
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.startCronJobs();
    console.log('▶️  ActivityWatch polling resumed');
  }

  isPaused(): boolean {
    return this.paused;
  }

  async analyzeBuckets(start: Date, end: Date, sessionWindow?: ActivityBucket[]): Promise<AnalysisResult | null> { 
    return this.awService.analyzeBucket(start, end, sessionWindow ?? []);
  }

  async isActivityWatchRunning(): Promise<boolean> {
    return this.awService.isRunning();
  }

  private async checkIdleAutoStop(): Promise<void> {
    const threshold = ACTIVITY_CONFIG.IDLE_AUTO_STOP_BUCKETS;
    if (!threshold || threshold <= 0) return;

    const activeSubtask = await getActiveSubtask();
    if (!activeSubtask) return;

    const recentBuckets = await getLatestBuckets(threshold);
    if (recentBuckets.length < threshold) return;

    const allIdle = recentBuckets
      .slice(0, threshold)
      .every(b => b.category === 'idle');

    if (allIdle) {
      await updateSubtask(activeSubtask.id, { status: 'pending' });
      console.log(`⏹️  Auto-stopped task "${activeSubtask.title}" after ${threshold} consecutive idle buckets (${threshold * NodeActivityWatchService.BUCKET_SIZE_MINUTES} min idle)`);
    }
  }

  async processRecentActivity(): Promise<void> {
    // Skip if AW isn't responding — avoids unnecessary work
    if (!await this.awService.isRunning()) return;
    try {
      const now = new Date();
      const bucketSizeMs = NodeActivityWatchService.BUCKET_SIZE_MINUTES * 60 * 1000;
      
      // Calculate the previous completed bucket using full timestamps
      const currentBucketStart = new Date(Math.floor(now.getTime() / bucketSizeMs) * bucketSizeMs);
      const previousBucketStart = new Date(currentBucketStart.getTime() - bucketSizeMs);
      const previousBucketEnd = new Date(currentBucketStart.getTime());
  
      
      const dateStr = dateUtils.formatDate(previousBucketStart);
      
      // Get latest buckets globally for session window context
      const sessionWindow = await getLatestBuckets(NodeActivityWatchService.SESSION_WINDOW_SIZE);

      // Check if we should process this bucket - don't reprocess if the most recent bucket has the same start time
      if (sessionWindow.length > 0) {
        const mostRecentBucket = sessionWindow[0];
        if (mostRecentBucket.startTime === previousBucketStart.toISOString()) {
          return; 
        }
      }
      
      const analysis = await this.analyzeBuckets(previousBucketStart, previousBucketEnd, sessionWindow);
      if (!analysis) return;

      console.log('Analysis result:', analysis);
      
      await createActivityBucket({
        date: dateStr,
        startTime: analysis.startTime,
        endTime: analysis.endTime,
        category: analysis.category,
        dominantApp: analysis.dominantApp || null,
        apps: analysis.apps || {},
        workSessionApp: analysis.workSessionApp || null
      });
      console.log(`✅ Stored bucket ${analysis.startTime} (${analysis.category}) - Completed ${NodeActivityWatchService.BUCKET_SIZE_MINUTES}-min interval`);

      // Auto-deactivate active task after N consecutive idle buckets
      await this.checkIdleAutoStop();
    } catch (e) {
      console.error('❌ Bucket processing error:', e);
    }
  }
}

// =========================================================================
// Bucket persistence
// =========================================================================

async function getLatestBuckets(limit: number = 100): Promise<ActivityBucket[]> {
  return await db.select()
    .from(activityBuckets)
    .orderBy(desc(activityBuckets.startTime))
    .limit(limit);
}

// Auto-links to the active subtask if no subtaskId is provided.
async function createActivityBucket(bucket: InsertActivityBucket): Promise<ActivityBucket> {
  const activeSubtask = bucket.subtaskId ? null : await getActiveSubtask();

  const bucketToInsert = {
    ...bucket,
    subtaskId: bucket.subtaskId || activeSubtask?.id || null
  };

  const result = await db.insert(activityBuckets).values(bucketToInsert).returning() as ActivityBucket[];
  if (!result[0]) throw new Error("Failed to create activity bucket");
  return result[0];
}

// Singleton instance
export const activityWatchService = new NodeActivityWatchService();