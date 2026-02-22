# ActivityWatch Algorithm

## How It Works

Every 5 minutes, the server queries ActivityWatch's REST API for window events filtered by non-AFK time, merged by app. Each 5-minute bucket is classified into one of four states: `idle`, `prefocus`, `focus`, or `distraction`.

### Classification Pipeline

1. **Fetch canonical events** — AW query intersects `aw-watcher-window` with `aw-watcher-afk` (status=not-afk), then merges by app name.
2. **Idle check** — If active time < 25% of the bucket window (~75s in 5 min), classify as `idle`.
3. **App pattern analysis** — Calculate dominance ratio (top app time / total time). If ≥ 40%, the bucket is considered "productive."
4. **App switching detection** — Build a "fingerprint" per bucket (sorted top-2 app names, e.g. `"terminal,vscode"`). Collect fingerprints from the current bucket + last 4 focused buckets **within the same work session** (stops at session boundary). If the unique-fingerprint ratio ≥ 75%, flag as switching distraction. Same app combo in any order produces the same fingerprint, so IDE↔Terminal alternation is not flagged.
5. **State machine** — Combine productivity + switching + session history:
   - First bucket with no history: `prefocus` (if productive, or if ≤ 3 apps without switching) or `distraction`
   - 1 prefocus in the window + current bucket productive → `focus` (2 total productive buckets needed, only 1 stored as prefocus)
   - Already in focus → stays `focus` (momentum)
   - ≤ 2 distraction/idle buckets after focus → recovers to `focus` (tolerance for brief interruptions)
   - >2 consecutive distractions → resets to `prefocus` (must re-earn focus)
   - Not productive but ≤ 3 apps and no switching → `prefocus` (neutral path, can still progress to focus)
   - Otherwise → `distraction`

### Work Session App

Tracks the primary app across focus/prefocus buckets in the session window (last 6 buckets) with recency weighting (most recent = 1.0, oldest = 0.4). Used to detect when switching is happening *within* the same work session vs. a genuine context change.

### Productivity Metrics

- **Productivity ratio** = `(focus + prefocus × 0.5) / total tracked time`
- **Hourly efficiency** = same ratio per clock hour, splitting buckets at hour boundaries
- **Timeline** = contiguous segments merged by status, with gaps > 1 min shown as "untracked"
- **Cross-day** — buckets straddling midnight are assigned to the start-time date; no session close-out logic

## Key Configuration

| Constant | Value | Effect |
|----------|-------|--------|

| `BUCKET_SIZE_MINUTES` | 5 | Polling/analysis interval |
| `SESSION_WINDOW_SIZE` | 6 | Recent buckets for context (30 min) |
| `IDLE_THRESHOLD_PERCENTAGE` | 0.25 | Min active ratio to avoid idle (~75s in 5 min) |
| `PREFOCUS_BUCKETS_REQUIRED` | 2 | Warm-up buckets before focus |
| `MAX_DISTRACTION_BUCKETS` | 2 | Allowed interruptions before focus resets |
| `PRODUCTIVE_SWITCHING_THRESHOLD` | 0.4 | Dominance ratio for "productive" |
| `APP_SWITCHING_THRESHOLD` | 0.75 | Unique fingerprint ratio that triggers distraction |
| `APP_SWITCHING_WINDOW_SIZE` | 4 | Buckets to check for switching |
| `NEUTRAL_MAX_APP_COUNT` | 3 | Max apps for neutral (prefocus) instead of distraction |
| `SWITCHING_TOP_N_APPS` | 2 | Top apps per bucket used in switching detection |
| `WORK_SESSION_APP_THRESHOLD_PERCENTAGE` | 0.05 | Min app usage ratio (5%) to count toward work session app |

## Known Limitations

1. **App-blind classification** — No productive/unproductive app categories. 100% Reddit = 100% VS Code in terms of dominance ratio. Biggest accuracy gap.
2. **Hardcoded thresholds** — All constants are compile-time; not user-configurable.
3. **No cross-day/timezone handling** — No session close-out at midnight or timezone-aware bucketing.
