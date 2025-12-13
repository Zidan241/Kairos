import * as cron from 'node-cron';
import { storage } from '../storage';
import { spawn } from 'child_process';
import * as path from 'path';
import type { ActivityBucket } from '../../../shared/schema';
import { ACTIVITY_CONFIG } from '../../../shared/constants';

export class NodeActivityWatchService {
  private static readonly BUCKET_SIZE_MINUTES = ACTIVITY_CONFIG.BUCKET_SIZE_MINUTES;
  private static readonly SESSION_WINDOW_SIZE = ACTIVITY_CONFIG.SESSION_WINDOW_SIZE;
  
  private pythonScriptPath: string;
  private testing: boolean;

  constructor(testing = false) {
    this.testing = testing;
    this.pythonScriptPath = path.join(__dirname, 'activity_watch_service.py');
    this.startCronJobs();
  }

  private startCronJobs() {
    // For testing with fractional minutes, use setInterval instead of cron
    if (NodeActivityWatchService.BUCKET_SIZE_MINUTES < 1) {
      const intervalMs = NodeActivityWatchService.BUCKET_SIZE_MINUTES * 60 * 1000;
      setInterval(() => this.processRecentActivity(), intervalMs);
      console.log(`📊 Bucket processing every ${NodeActivityWatchService.BUCKET_SIZE_MINUTES} minutes (${intervalMs}ms intervals for testing)`);
    } else {
      // Use cron for whole minute intervals
      cron.schedule(`*/${NodeActivityWatchService.BUCKET_SIZE_MINUTES} * * * *`, () => this.processRecentActivity());
      console.log(`📊 Bucket processing every ${NodeActivityWatchService.BUCKET_SIZE_MINUTES} minutes (checking for completed ${NodeActivityWatchService.BUCKET_SIZE_MINUTES}-min intervals)`);
    }
  }

  private async runPythonProcessor(start: Date, end: Date, sessionWindow?: ActivityBucket[]): Promise<ActivityBucket | null> {
    return new Promise((resolve, reject) => {
      const args = [
        this.pythonScriptPath,
        '--start', start.toISOString(),
        '--end', end.toISOString()
      ];
      
      // Add session window data if provided
      if (sessionWindow && sessionWindow.length > 0) {
        args.push('--session-window', JSON.stringify(sessionWindow));
      }
      
      if (this.testing) {
        args.push('--testing');
      }

      // Use the virtual environment Python executable
      const pythonExecutable = path.join(__dirname, '..', '..', '..', '.venv', 'Scripts', 'python.exe');
      const pythonProcess = spawn(pythonExecutable, args);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        // Always show stderr (contains logging output)
        if (stderr.trim()) {
          console.log('Python stderr:', stderr);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            if (result.error) resolve(null); else resolve(result);
          } catch (parseError) {
            console.error('Failed to parse Python output:', parseError); resolve(null);
          }
        } else {
          console.error('Python processor failed:', code, stderr); resolve(null);
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python processor:', error); resolve(null);
      });
    });
  }
  async analyzeBuckets(start: Date, end: Date, sessionWindow?: ActivityBucket[]): Promise<ActivityBucket | null> { 
    return this.runPythonProcessor(start, end, sessionWindow); 
  }

  async processRecentActivity(): Promise<void> {
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