# Native Activity Tracking

## Overview

Replace the external ActivityWatch dependency with built-in window tracking using `get-windows` (active window detection) and Electron's `powerMonitor` (idle detection). ActivityWatch remains available as an alternative backend for users who prefer it.

## Motivation

- **No external install** — Users don't need to download, install, and run ActivityWatch separately.
- **Simpler UX** — Activity tracking works out of the box on first launch.
- **Less overhead** — No HTTP polling to localhost:5600; data stays in-process.
- **More reliable** — No dependency on AW server being up and healthy.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Electron Main Process               │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Window Poller │    │ Idle Detector            │   │
│  │ (get-windows) │    │ (powerMonitor)           │   │
│  │ every ~5s     │    │ getSystemIdleTime()      │   │
│  └──────┬───────┘    └───────────┬──────────────┘   │
│         │                        │                   │
│         ▼                        ▼                   │
│  ┌──────────────────────────────────────────────┐   │
│  │           Raw Window Events Table            │   │
│  │  (timestamp, duration, app, title, is_idle)  │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
└─────────────────────┼────────────────────────────────┘
                      │  IPC / HTTP
                      ▼
┌─────────────────────────────────────────────────────┐
│                   Bun Server                        │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  NativeActivityProvider                      │   │
│  │  (replaces ActivityWatchClient)              │   │
│  │  - getCanonicalEvents(start, end) → AWEvent[]│   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
│                     ▼                                │
│  ┌──────────────────────────────────────────────┐   │
│  │  ActivityWatchService.analyzeBucket()        │   │
│  │  (UNCHANGED — same classification logic)     │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
│                     ▼                                │
│  ┌──────────────────────────────────────────────┐   │
│  │  activityBuckets table (existing)            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Dependencies

| Dependency | Purpose | Type |
|------------|---------|------|
| `get-windows` | Cross-platform active window info (app name, title) | npm (native addon) |
| `powerMonitor` | System idle time detection | Electron built-in |

No other new dependencies.

## What Changes

### New: Window Poller (Electron main process)

A `setInterval` loop in the main process polls the active window every ~5 seconds:

```js
const { activeWindow } = await import('get-windows');
const { powerMonitor } = require('electron');

const POLL_INTERVAL_MS = 5000;
const IDLE_THRESHOLD_SECONDS = 180; // 3 min, matches AW default

setInterval(async () => {
  const now = Date.now();
  const idleSeconds = powerMonitor.getSystemIdleTime();
  const isIdle = idleSeconds > IDLE_THRESHOLD_SECONDS;

  const win = await activeWindow({ screenRecordingPermission: false });

  // Store event: app name, title, timestamp, idle status
  storeRawEvent({
    timestamp: new Date(now).toISOString(),
    duration: POLL_INTERVAL_MS / 1000,
    app: win?.owner.name ?? 'unknown',
    title: win?.title ?? '',
    isIdle,
  });
}, POLL_INTERVAL_MS);
```

### New: Raw Events Table

```sql
CREATE TABLE raw_window_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  duration REAL NOT NULL,        -- seconds (~5)
  app TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  is_idle INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_raw_events_timestamp ON raw_window_events(timestamp);
```

Events older than 48 hours can be pruned — they're only needed until bucket analysis runs.

### New: NativeActivityProvider

Replaces `ActivityWatchClient.getCanonicalEvents()` with a local DB query that returns the **same `AWEvent[]` shape**:

```ts
async getCanonicalEvents(start: Date, end: Date): Promise<AWEvent[]> {
  // Query raw events in time range, excluding idle periods
  // Group by app, sum durations → same output as AW's merged events
  const rows = await db.query(`
    SELECT app, SUM(duration) as total_duration, MIN(timestamp) as first_seen
    FROM raw_window_events
    WHERE timestamp >= ? AND timestamp < ? AND is_idle = 0
    GROUP BY app
  `, [start.toISOString(), end.toISOString()]);

  return rows.map(row => ({
    timestamp: row.first_seen,
    duration: row.total_duration,
    data: { app: row.app },
  }));
}
```

### Modified: ActivityWatchService

Minimal change — accept an event provider interface instead of hardcoding `ActivityWatchClient`:

```ts
interface ActivityEventProvider {
  getCanonicalEvents(start: Date, end: Date): Promise<AWEvent[]>;
  isRunning(): Promise<boolean>;
}
```

Both `ActivityWatchClient` (existing) and `NativeActivityProvider` (new) implement this interface. The rest of the classification logic (`analyzeBucket`, scoring, streaks) remains untouched.

### Modified: NodeActivityWatchService

Switch the provider based on configuration:

```ts
constructor(mode: 'native' | 'activitywatch' = 'native') {
  if (mode === 'activitywatch') {
    this.provider = new ActivityWatchClient(DEFAULT_ACTIVITY_WATCH_URL);
  } else {
    this.provider = new NativeActivityProvider();
  }
}
```

### Unchanged

Everything downstream of `analyzeBucket()` is unchanged:

- `activityBuckets` table and schema
- `calculations.ts` — time breakdown, productivity scores
- `bucketAnalysis.ts` — task transition detection
- `reports.ts` — daily reports
- `subtasks.ts` — tracked time per task
- All frontend components
- All API routes

## macOS Permissions

`get-windows` requires:

| Permission | What For | Without It |
|------------|----------|------------|
| **Accessibility** | Reading window info from other apps | Cannot get active window at all |
| **Screen Recording** | Reading window titles | `title` returns empty string (app name still works) |

Screen Recording permission is **optional** — Kairo only needs `owner.name` (app name) for classification. Set `screenRecordingPermission: false` to avoid the prompt.

Accessibility permission can be checked with:
```js
const { systemPreferences } = require('electron');
systemPreferences.isTrustedAccessibilityClient(true); // true = prompt if not granted
```

## User Configuration

A setting in the app controls which backend to use:

| Setting | Behavior |
|---------|----------|
| `native` (default) | Built-in tracking via `get-windows`. Works immediately. |
| `activitywatch` | Uses ActivityWatch on localhost:5600. User must install AW separately. |

The setting is stored in the existing settings system and can be changed from the Settings page.

## Data Flow Comparison

### Before (ActivityWatch)
```
AW Server ← aw-watcher-window (polls every 5s)
           ← aw-watcher-afk (polls input devices)
     ↓
HTTP query every 5 min (Kairo server → AW REST API)
     ↓
AWEvent[] → analyzeBucket() → activityBuckets table
```

### After (Native)
```
Electron main process
  ├── get-windows (polls every 5s)
  ├── powerMonitor.getSystemIdleTime()
  ↓
raw_window_events table (local SQLite)
  ↓
DB query every 5 min (same cron schedule)
  ↓
AWEvent[] → analyzeBucket() → activityBuckets table
```

The output is identical from `analyzeBucket()` onward.

## Implementation Order

1. Add `get-windows` dependency
2. Create `raw_window_events` table (new migration)
3. Build window poller in Electron main process (write events to DB)
4. Create `NativeActivityProvider` (read events from DB, return `AWEvent[]`)
5. Extract `ActivityEventProvider` interface from `ActivityWatchClient`
6. Wire up provider selection in `NodeActivityWatchService`
7. Add setting toggle for native vs. ActivityWatch
8. Add macOS Accessibility permission prompt on first launch
9. Add raw event cleanup (prune events older than 48h)

## Limitations

Same as current ActivityWatch-based approach (see ACTIVITY_WATCH_ALGORITHM.md):

- **App-blind** — No productive/unproductive app categories
- **Hardcoded thresholds** — Not user-configurable
- **No cross-day handling** — No session close-out at midnight
- **Linux Wayland** — `get-windows` does not support Wayland (same as AW)
