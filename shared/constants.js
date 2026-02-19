// ==========================================
// Shared constants for the application
// ==========================================

// Default server port for the Bun/Express backend
export const DEFAULT_SERVER_PORT = 5000;

// Default ActivityWatch server URL
export const DEFAULT_ACTIVITY_WATCH_URL = 'http://localhost:5600';

// Activity tracking configuration
export const ACTIVITY_CONFIG = {
  // How often we process activity buckets (in minutes)
  BUCKET_SIZE_MINUTES: 5,
  
  // How many recent buckets to consider for session context
  SESSION_WINDOW_SIZE: 6,
  
  // How long to cache metrics data in the frontend (in milliseconds)
  // Should be related to bucket processing frequency for optimal data freshness
  get METRICS_CACHE_TIME_MS() {
    // Cache for 2x the bucket interval to balance freshness with performance
    return this.BUCKET_SIZE_MINUTES * 2 * 60 * 1000;
  }
};