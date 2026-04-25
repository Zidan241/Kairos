import { activityBuckets } from "@shared/schema";
import { db } from "../core/database";
import { desc } from "drizzle-orm";

// =========================================================================
// Exports
// =========================================================================

// Detects if the user switched to a different app (potential task change).
// Returns true when the last N buckets show a new dominant app.
export async function checkTaskTransition(): Promise<boolean> {
  const TASK_TRANSITION_BUCKETS_REQUIRED = 2;

  const recentBuckets = await db.select().from(activityBuckets)
    .orderBy(desc(activityBuckets.startTime))
    .limit(TASK_TRANSITION_BUCKETS_REQUIRED + 1);

  if (recentBuckets.length < TASK_TRANSITION_BUCKETS_REQUIRED + 1) return false;

  const currentBucket = recentBuckets[0];

  if (!['focus', 'prefocus'].includes(currentBucket.category)) {
    return false;
  }

  const newApp = currentBucket.dominantApp;
  if (!newApp) return false;

  for (let i = 0; i < TASK_TRANSITION_BUCKETS_REQUIRED; i++) {
    const bucket = recentBuckets[i];
    if (bucket.dominantApp !== newApp || !['focus', 'prefocus'].includes(bucket.category)) {
      return false;
    }
  }

  const previousBucket = recentBuckets[TASK_TRANSITION_BUCKETS_REQUIRED];
  return previousBucket.dominantApp !== newApp;
}
