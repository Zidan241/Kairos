# Kairo — Feature Plan

> UI layout patterns consistent with TaskCard (accordion, per-day cards, app list style).

## Unified Habit Type
- Remove `goalType` (completion/duration) distinction — single habit type
- Optional time estimate (reference only, not completion criteria)
- All habits can be: checked off (✓) and/or time-tracked (activate/deactivate)
- Streak = consecutive *scheduled occurrences* with check-off (skipped days don't break streak)
  - Weekly habit (Mon/Wed/Fri): missing Wednesday breaks streak, skipping Wednesday does not
  - Daily habit: missing any day breaks streak, skipping does not
  - Cap: >3 consecutive skips reset streak to 0 (prevents gaming)

## Schema Changes
- Remove `goalType` column from schema (app not released, no migration concerns)
- Keep `estimateMinutes` as optional estimate (previously `goalTarget`, now universal)
- Add `isSkipped` boolean to subtasks (default false)
- Skip semantics:
  - Skipping sets `isSkipped=true`, subtask stays in DB with its `scheduledDate` (not hidden, shown as skipped)
  - Skipping an active subtask (mid-work-session) stops the timer first, then marks skipped
  - Un-skip: toggle `isSkipped` back to false (returns to pending state)
- DayPlan: all habit subtasks show checkbox + activate button + **new skip button**
- Make `estimatedMinutes` nullable on subtasks schema (currently `notNull().default(60)`)
- Habit subtasks: use `estimateMinutes` if set, else `null` (no estimate)
- Regular task subtasks: keep defaulting to 60

## Timeline Integration
- Habits can be dragged onto the DayScheduleTimeline (same as regular tasks)
- Currently blocked: `ensureHabitSubtasksForDate` creates subtasks without `scheduledStartTime`
- Fix: no auto-scheduling — user places habits on timeline manually via drag
- `estimatedMinutes` nullable — if null, timeline uses 30m default for rendering height only (not stored)

## Summary Line (always visible)
`Title | Frequency badge | Estimate badge (if set) | 🔥 Streak | 7-day tracker dots`
- Tracker dots: green = done, red = missed, yellow = skipped, gray = no data

## Expanded Section ("View more details")

### Total Summary
- **Stats:** Total done · Total skipped · Total missed · Completion rate · Best streak
- Completion rate = `done / (scheduled - skipped)` — skips excluded from denominator
- **Time stats** (shown when tracking data exists): Total time · Avg/session
- **Productivity** (shown when tracking data exists): Focus · Distraction · Idle · Productivity %

### Per-Day Breakdown
- Latest 3 days: Date | ✓/✗/⏭ | Time worked/estimate | Tracked | Focus · Distraction · Idle | Top apps
- Time/productivity columns appear only when data exists for that day
- **"View all"** → modal with full day-by-day history

## Backend Changes
- New endpoint: `GET /api/habits/:id/details?days=30` — returns:
  - `days` query param: number of days to look back (default 30, max 365)
  - Aggregated `TimeBreakdown` (focus/distraction/idle/productivity%) from `activityBuckets`
  - Per-day `ScheduleBreakdown[]` with apps (same structure as task subtask metrics)
  - Full completion history entries within the range
- Reuse existing `metricsService.getSubtaskMetricsBulk()` to get per-subtask metrics, then aggregate
- Join path for time data: `workSessionsHistory → subtasks (habitId match) → activityBuckets`
- Update streak logic: always based on check-off, skips don't break streak, remove duration-goal check
- Skip endpoint: `PATCH /api/subtasks/:id/skip` — toggles `isSkipped` (if active, stops timer first)

## View All Modal
- Scrollable list of day cards (same layout as task "View more details")
- Each day: Date | Status | Time worked | Tracked | Focus · Distraction · Idle | Apps
- Time/productivity columns hidden when no tracking data
- Sorted newest first

---

## Reflect Page — Changes

> Date-aware — all components must respect selected date, same as DayReport.

### Remove
- Current `ProductivityDashboard` — redundant with DayReport metrics (same 3 values, no trends, not date-aware)
- Current `HabitsSummary` — replace with date-aware version
- Current `Plan Execution` card — replaced by Tasks Card below

### Habits Card (replaces HabitsSummary)
- **"Habits: X done · Y skipped · Z missed"** for selected date
- Compact single-line summary — no individual habit names
- Shows "Habits: 0 due" when no habits due on selected date

### Tasks Card (replaces Plan Execution)
- **"Tasks: Planned N · Done X · Rescheduled Y"** for selected date
- Uses `taskScheduleHistory` to find all subtasks originally scheduled for that date
- Originally planned = distinct subtasks that had this date in their schedule history
- Done = subset that are `isCompleted = true`
- Rescheduled = subset that currently have a different `scheduledDate`
- Compact single-line summary — same pattern as habits card
- Shows "Tasks: 0 planned" when no tasks were scheduled on selected date

### Goals Card
- **"Goals: X/Y progressed · Goal A (45m) · Goal B (30m)"** for selected date
- X/Y = goals that had at least one task/habit completed or time tracked on this date
- Per-goal time = sum of work session minutes via: `goals → tasks (goalId) → subtasks → workSessionsHistory`
- Compact summary — same pattern as habits/tasks cards
- Shows "Goals: no activity" when no goals had progress on selected date

### DayReport — consistency fixes (never hide sections)
- **Top Apps** — always show, empty state: "No app data recorded"
- **Timeline** — always show, empty state: empty timeline
- **Focus Flow Chart** — always show, empty state: empty chart
- **Remove** the "No activity recorded" catch-all empty card — each section handles its own empty state

---

## Scheduling Fixes

### Issue: taskScheduleHistory is incomplete and unused
- **Fix 1:** Record initial schedule on `createSubtask` — insert row in `taskScheduleHistory`
- **Fix 2:** Use `taskScheduleHistory` in Tasks Card (Reflect page) to find all subtasks ever scheduled for a date

### Scheduling time reset
- When a subtask is rescheduled (added/removed from a day), record in `taskScheduleHistory`
- `estimatedMinutes` stays on the subtask — no reset needed
- The history tells us *when* tasks were planned, actual estimate is always current

---

## Goals

> Goals group habits and tasks under a shared purpose for **time analysis** ("how much time did I spend on learning?") and future gamification. Dedicated page + integrated into existing pages.

### Schema
- New `goals` table: `id, title, description, createdAt, isArchived`
- Optional `goalId` foreign key on `tasks` table (habits are tasks with `isHabit=true`)

### Goals Page (new sidebar entry)
- List of goals with per-goal stats: total time · X tasks (Y completed) · X habits (avg completion rate)
- Create/edit/archive/delete goals
- Click goal → expanded view showing linked tasks + habits

### API Endpoints
- `GET /api/goals` — list all goals (optionally filter `?archived=false`)
- `POST /api/goals` — create goal `{ title, description? }`
- `PATCH /api/goals/:id` — update goal fields
- `DELETE /api/goals/:id` — delete goal (unlinks tasks, doesn't delete them)
- `GET /api/goals/:id/stats` — per-goal time aggregation + task/habit counts
  - Join path: `goals → tasks (goalId) → subtasks → workSessionsHistory → activityBuckets`

### Integration with existing pages
- **Planning page:** tasks show goal as a badge/tag on the task card (no grouping)
- **Habits page:** habits show goal as a badge/tag, same pattern
- **Task/Habit create/edit modal:** optional "Goal" dropdown (select existing goals only)
- **Reflect page:** compact "Goals: X/Y progressed" summary for selected date

---

## App Info Modal

- Info icon (ⓘ) in the top header bar, next to existing controls
- Opens a modal explaining the app in short, clear terms:
  - **Focus** — Plan your day, activate tasks to track time, see your real activity timeline
  - **Plan** — Schedule tasks and subtasks across days, drag to reorder or reschedule
  - **Habits** — Recurring tasks with streaks, skip when needed, track time the same way
  - **Reflect** — Daily productivity breakdown: focus vs distraction, app usage, plan accuracy
  - **Goals** — Group tasks and habits to analyze time spent per goal
  - **Notes** — Markdown notes attached to any subtask
  - **ActivityWatch** — Runs in the background to classify your app usage as focus/distraction/idle
- Tone: concise bullets, no marketing language, explains *what you can do* not *why it's great*

---

## Planning Page — Section Header Counts

- Each collapsible section header shows its item count: e.g. **"Habits (2)"**, **"Tasks (5)"**
- Count = number of items currently in that section for the selected date
- Updates dynamically as items are added/removed/completed

---

## Implementation Checklist

### Phase 1: Schema & Backend Foundation
- [x] Make `estimatedMinutes` nullable in `shared/schema.ts`
- [x] Add `isSkipped` boolean (default false) to subtasks in `shared/schema.ts`
- [x] Create `goals` table schema (`id, title, description, createdAt, isArchived`)
- [x] Add optional `goalId` foreign key on `tasks` table
- [x] Generate & run Drizzle migration
- [x] Fix `createSubtask` in storage.ts — handled by SQLite trigger (`track_schedule_insert`)
- [x] Update `ensureHabitSubtasksForDate` — use `estimateMinutes` if set, else `null` for estimatedMinutes
- [x] Remove `goalType` column from tasks schema
- [x] Update streak logic — consecutive scheduled occurrences, skips don't break, >3 consecutive skips reset

### Phase 2: Backend Endpoints
- [x] `PATCH /api/subtasks/:id/skip` — toggle `isSkipped`, stop timer if active
- [x] `GET /api/habits/:id/details?days=30` — aggregated metrics + per-day breakdown + completion history
- [x] Goals CRUD endpoints: `GET/POST /api/goals`, `PATCH/DELETE /api/goals/:id`
- [x] Update plan execution query — use `taskScheduleHistory` for honest counts
- [x] `GET /api/goals/:id/stats` — per-goal time aggregation + task/habit counts

### Phase 3: Habits Page Redesign
- [x] Summary line: Title | Frequency badge | Estimate badge | Streak | 7-day tracker dots
- [x] Expanded section: Total summary (stats + time + productivity)
- [x] Per-day breakdown (latest 3 days with metrics)
- [x] "View all" modal with full day-by-day history
- [x] Skip action on habit subtasks (DayPlan + Habits page)
- [x] Goal badge/tag on habit cards

### Phase 4: Reflect Page Changes
- [x] Remove `ProductivityDashboard` component
- [x] Remove `HabitsSummary` component
- [x] Add Habits Card: "Habits: X done · Y skipped · Z missed" (date-aware)
- [x] Add Tasks Card: "Tasks: Planned N · Done X · Rescheduled Y" (date-aware, uses taskScheduleHistory)
- [x] Add Goals Card: "Goals: X/Y progressed · Goal A (45m) · Goal B (30m)" (date-aware)
- [x] DayReport: always show Top Apps, Timeline, Focus Flow Chart with empty states
- [x] DayReport: remove "No activity recorded" catch-all card

### Phase 5: Goals Page & Integration
- [x] New Goals page component
- [x] Add Goals entry to sidebar
- [x] Goal create/edit/archive UI
- [x] Expanded goal view — linked tasks + habits
- [x] Goal dropdown in task/habit create/edit modal (select existing only)
- [x] Goal badge/tag on Planning page task cards

### Phase 6: UI Polish
- [x] Section header counts: "Habits (2)", "Tasks (5)"
- [x] Info icon in header → app explanation modal
