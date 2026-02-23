# ActivityWatch Algorithm

## What It Does

Kairos polls ActivityWatch for app usage and classifies each interval as **focus**, **prefocus**, **distraction**, or **idle**. These feed the productivity metrics and timeline shown in the app.

## How Classification Works

Each interval goes through:

1. **Fetch** — Query AW for window events during active (non-AFK) time, merged by app.
2. **Idle check** — Too little active time → **idle**.
3. **Productivity check** — If one app dominates usage, the interval is considered productive.
4. **Switching check** — Fingerprints (top apps per interval) are compared across recent intervals. High variety signals context switching → **distraction**.
5. **State machine** — Combines the above with recent history:
   - Productive intervals build toward **focus** (requires a warm-up period).
   - Once in focus, momentum is maintained through brief interruptions.
   - Too many consecutive distractions reset progress.
   - Low app counts without switching get a neutral **prefocus** path.

## Productivity Score

- **Focus** time counts fully.
- **Prefocus** counts fully if it leads to focus, otherwise at half weight.
- **Idle** time is excluded from the denominator (breaks don't penalize the score).
- **Distraction** counts against you.

The ratio is straightforward: `productive / active`. No streak bonuses or multipliers inflate it.

## Focus Streak

Tracked separately as **longest consecutive focus run** (in minutes). This measures deep work capacity without distorting the productivity ratio. Streaks reset on any non-focus bucket (prefocus, distraction, or idle).

## Work Session Tracking

The dominant app across recent focused intervals is tracked with recency weighting. This prevents switching between unrelated work sessions from being flagged as distraction within a single session.

If multiple consecutive intervals are idle, the active subtask is automatically deactivated.

## Limitations

- **App-blind** — No productive/unproductive app categories. Reddit and VS Code are treated equally.
- **Hardcoded thresholds** — Not user-configurable.
- **No cross-day handling** — No session close-out at midnight.
