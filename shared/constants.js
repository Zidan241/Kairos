// ==========================================
// Shared constants for the application
// ==========================================

// Default server port for the Bun/Express backend
export const DEFAULT_SERVER_PORT = 5001;

// Default ActivityWatch server URL
export const DEFAULT_ACTIVITY_WATCH_URL = 'http://localhost:5600';

// Activity tracking configuration
export const ACTIVITY_CONFIG = {
  // How often we process activity buckets (in minutes)
  BUCKET_SIZE_MINUTES: 5,
  
  // How many recent buckets to consider for session context
  SESSION_WINDOW_SIZE: 6,
  
  // Number of consecutive idle buckets before auto-stopping the active task
  // e.g., 3 × 5min = 15 minutes of idle → auto-deactivate
  IDLE_AUTO_STOP_BUCKETS: 3,
  
  // How long to cache metrics data in the frontend (in milliseconds)
  // Should be related to bucket processing frequency for optimal data freshness
  get METRICS_CACHE_TIME_MS() {
    return this.BUCKET_SIZE_MINUTES * 60 * 1000;
  }
};