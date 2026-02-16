import * as cron from 'node-cron';
import { storage } from '../storage';
import type { ActivityBucket } from '../../../shared/schema';
import { ACTIVITY_CONFIG, DEFAULT_ACTIVITY_WATCH_URL } from '../../../shared/constants.js';
import { ActivityWatchService, type AnalysisResult } from './activityWatchService';

export class NodeActivityWatchService {
  private static readonly BUCKET_SIZE_MINUTES = ACTIVITY_CONFIG.BUCKET_SIZE_MINUTES;
  private static readonly SESSION_WINDOW_SIZE = ACTIVITY_CONFIG.SESSION_WINDOW_SIZE;
  
  private awService: ActivityWatchService;

  constructor(baseUrl: string = DEFAULT_ACTIVITY_WATCH_URL) {
    this.awService = new ActivityWatchService(baseUrl);
    this.startCronJobs();
  }

  private startCronJobs() {
    if (NodeActivityWatchService.BUCKET_SIZE_MINUTES < 1) {
      const intervalMs = NodeActivityWatchService.BUCKET_SIZE_MINUTES * 60 * 1000;
      setInterval(() => this.processRecentActivity(), intervalMs);
      console.log(`📊 Bucket processing every ${NodeActivityWatchService.BUCKET_SIZE_MINUTES} minutes (testing interval)`);
    } else {
      cron.schedule(`*/${NodeActivityWatchService.BUCKET_SIZE_MINUTES} * * * *`, () => this.processRecentActivity());
      console.log(`📊 Bucket processing every ${NodeActivityWatchService.BUCKET_SIZE_MINUTES} minutes`);
    }
  }

  async analyzeBuckets(start: Date, end: Date, sessionWindow?: ActivityBucket[]): Promise<AnalysisResult | null> { 
    return this.awService.analyzeBucket(start, end, sessionWindow ?? []);
  }

  async isActivityWatchRunning(): Promise<boolean> {
    return this.awService.isAvailable();
  }

  async processRecentActivity(): Promise<void> {
    // Skip if AW isn't responding — avoids unnecessary work
    if (!await this.awService.isAvailable()) return;
    try {
      const now = new Date();
      const bucketSizeMs = NodeActivityWatchService.BUCKET_SIZE_MINUTES * 60 * 1000;
      
      // Calculate the previous completed bucket using full timestamps
      const currentBucketStart = new Date(Math.floor(now.getTime() / bucketSizeMs) * bucketSizeMs);
      const previousBucketStart = new Date(currentBucketStart.getTime() - bucketSizeMs);
      const previousBucketEnd = new Date(currentBucketStart.getTime());
  
      
      const dateStr = previousBucketStart.toISOString().split('T')[0];
      
      // Get latest buckets globally for session window context
      const sessionWindow = await storage.getLatestBuckets(NodeActivityWatchService.SESSION_WINDOW_SIZE);

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
      
      await storage.createActivityBucket({
        date: dateStr,
        startTime: analysis.startTime,
        endTime: analysis.endTime,
        category: analysis.category,
        dominantApp: analysis.dominantApp || null,
        apps: analysis.apps || {},
        workSessionApp: analysis.workSessionApp || null
      });
      console.log(`✅ Stored bucket ${analysis.startTime} (${analysis.category}) - Completed ${NodeActivityWatchService.BUCKET_SIZE_MINUTES}-min interval`);
    } catch (e) {
      console.error('❌ Bucket processing error:', e);
    }
  }
}

// Singleton instance
export const activityWatchService = new NodeActivityWatchService();