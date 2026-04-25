# Row Structures — HabitRow, GoalRow, TaskCard

All three row types follow a shared anatomy: chevron + title on line 1, metadata on line 2, actions on the right, and a lazy-loaded expanded section.

---

## HabitRow

### Collapsed (2 lines)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ▸ Morning run                                     🔥 5  ●●○●○●●  ⋯ │
│   Daily • ⏱ 30m • 🎯 Fitness                                       │
└──────────────────────────────────────────────────────────────────────┘
```

| Position | Content |
|----------|---------|
| Left | Chevron expand/collapse |
| Line 1 | **Title** (`font-medium text-sm`) |
| Line 2 | `{frequency} • ⏱ {estimate} • 🎯 {goalName}` (`text-xs text-muted-foreground`) |
| Right | Streak `🔥 N`, 7-day dots (green/red/gray), `⋯` dropdown menu |

**Data source:** `HabitSummary` from `GET /api/habits/summary`

### Expanded

Fetched on expand via `GET /api/habits/:id/details?days=30` → `HabitDetails`

```
┌──────────────────────────────────────────────────────────────────────┐
│  5/30 done   🔥 Best: 5                                              │
│                                                                      │
│  ⏱ 2h 30m worked  2h tracked  1h 40m focus  25m distraction         │
│                                                                      │
│  ─── RECENT ───                                                      │
│  ○ Fri 18/4                                                          │
│  ✓ Thu 17/4    30m                                                   │
│  ✓ Wed 16/4    30m                                                   │
│                                                                      │
│  [View all (30 days)]                                                │
└──────────────────────────────────────────────────────────────────────┘
```

| Section | Content |
|---------|---------|
| Description | Habit description text (if any) |
| Completion stats | `{done}/{total} done`, `🔥 Best: {N}` |
| Time breakdown | worked (from sessions), tracked (from ActivityWatch), focus (emerald), distraction (red) |
| Recent (3 days) | Status icon + date + time |
| View all button | Opens `HabitHistoryModal` — scrollable dialog with full 30-day history |

### HabitHistoryModal

- Dialog title: `{habit.title} — History`
- Scrollable list of all `perDay` entries
- Each row: status icon, day name, date, total time, focus time, distraction

---

## GoalRow

### Collapsed (2 lines)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ▸ Learning                                                        ⋯ │
│   ⏱ 5h 55m • 3/6 tasks • 1 habits                                    │
└──────────────────────────────────────────────────────────────────────┘
```

| Position | Content |
|----------|---------|
| Left | Chevron expand/collapse |
| Line 1 | **Title** (`font-medium text-sm`) |
| Line 2 | `⏱ {time} • {completed}/{total} tasks • {habitCount} habits` (`text-xs text-muted-foreground`) |
| Right | `⋯` dropdown menu |

**Data source:** `GoalSummary` from `GET /api/goals/summary`

### Expanded

Fetched on expand via `GET /api/goals/:id/details` → `GoalDetails`

```
┌──────────────────────────────────────────────────────────────────────┐
│  Courses, tutorials, and skill development                           │
│                                                                      │
│  ⏱ 5h 55m worked  5h tracked  4h 40m focus  10m distraction         │
│                                                                      │
│  ─── 📋 TASKS ───                                                   │
│  ✓ Ch.1 Videos                                       1h 15m         │
│    ↳ React Advanced Patterns                                        │
│  ✓ Ch.2 Exercises                                     1h 10m         │
│    ↳ React Advanced Patterns                                        │
│    Read Monday                                                       │
│    ↳ DDIA ch.5-8                                                    │
│                                                                      │
│  ─── 🔁 HABITS ───                                                  │
│  Read for 30 minutes                                      3h 30m    │
└──────────────────────────────────────────────────────────────────────┘
```

| Section | Content |
|---------|---------|
| Description | Goal description text (if any) |
| Time breakdown | worked (from sessions), tracked (from ActivityWatch), focus (emerald), distraction (red) |
| Linked tasks | Section header `📋 TASKS`. Subtask-level rows: ✓ icon (if done, strike-through), subtask title, time tracked, `↳ {parentTask}` on second line. Capped at 6 inline. |
| Linked habits | Section header `🔁 HABITS`. Bordered rows: title, time tracked. Capped at 6 inline. |
| View all button | Shown when total linked items > 6. Opens `GoalLinkedItemsModal` dialog with full scrollable list. |

All three row types (TaskCard, HabitRow, GoalRow) share:

- **Chevron** expand/collapse on the left
- **Title** on first line (`font-medium text-sm`)
- **Metadata** on second line (`text-xs text-muted-foreground`, separated by `•`)
- **Actions** (dropdown menu) on the right
- **Expanded section**: `border-t`, lazy-loaded details, `Skeleton` while loading

---

## API Types

```typescript
type GoalRef = Pick<Goal, 'id' | 'title'>;
type HabitDayStatus = 'done' | 'missed' | 'skipped' | 'pending';

// HabitRow collapsed
interface HabitSummary extends Habit {
  progress: { completedCount: number; totalMinutes: number };
  streak: number;
  isDueToday: boolean;
  history: Array<{ date: string; completed: boolean; minutes: number }>;
}

// HabitRow expanded
interface HabitDetails {
  habit: Habit;
  totalDone: number;
  totalMissed: number;
  bestStreak: number;
  timeBreakdown: TimeBreakdown; // includes workedMinutes, trackedMinutes, focus, distraction, idle
  perDay: Array<{
    date: string;
    status: HabitDayStatus;
    trackedMinutes: number;
  }>;
}

// GoalRow collapsed
interface GoalSummary extends Goal {
  stats: {
    totalMinutes: number;
    subtaskCount: number;
    completedSubtaskCount: number;
    habitCount: number;
  };
}

// GoalRow expanded
interface GoalDetails {
  goal: Goal;
  subtasks: Array<{ id: number; title: string; isCompleted: boolean; minutes: number; parentTaskTitle: string }>;
  habits: Array<{ id: number; title: string; minutes: number }>;
  timeBreakdown: TimeBreakdown;
}
```

---

## Implementation TODO

### HabitRow expanded — simplify UI

- [x] Completion line: show `{done}/{total} done` + `🔥 Best: {N}` only (drop skipped/missed counts, drop percentage)
- [x] Time line: show worked, tracked, focus, distraction only (drop ~avg/session, drop idle)
- [x] Recent rows: show status icon + date + time only (drop per-day focus/distraction, drop top apps)
- [x] Today's status: render as `pending` (○ circle) not `missed` — already in type + server + UI, verify rendering
- [x] Remove `completionRate` from type + service if no longer displayed
- [x] Remove `totalSkipped` from type + service (`totalMissed` kept for denominator)

### GoalRow expanded — simplify UI

- [x] Remove idle from time line (keep worked, tracked, focus, distraction)
- [x] Verify subtask-level rows render with `↳ parentTask` label

### Time range selector

Add a `Select` at the top of the HabitRow expanded section. Controls the `days` parameter for the details query. Options: **7d / 30d / 90d / All**.

**Frontend:**
- [x] Add `days` state to HabitRow expanded section (default `30`)
- [x] Render `<Select>` with options `[{label: "7 days", value: 7}, {label: "30 days", value: 30}, {label: "90 days", value: 90}, {label: "All time", value: 0}]`
- [x] Pass `days` to `useHabitDetails(id, days)` hook
- [x] All stats (completion, time, recent, streaks) update on change

**Backend:**
- [x] `GET /api/habits/:id/details?days=30` — `days=0` now returns all time (from habit creation date)
- [x] Completion stats (`totalDone`, `totalMissed`, `bestStreak`) scoped to selected window
- [x] Time aggregation scoped to selected window
- [x] `perDay` entries only within the window
