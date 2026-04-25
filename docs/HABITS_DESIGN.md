# Habits Feature — Design & Implementation Plan

## Core Idea

Habits are recurring goals/routines that reuse the existing subtask + work session system. No separate tracking mechanism — habits piggyback on what already works.

## Data Model

```
tasks (existing)
├── id, title, description, priority, ...

habits (new)
├── id, taskId → tasks.id   ← auto-created container task
├── title, description
├── frequency: daily | weekly | custom
├── customDays: [0..6]      ← e.g. [0] = Sundays only, [] = anytime
├── goalType: completion | duration
├── goalTarget: minutes     ← for duration goals (e.g. 480 = 8hrs)
├── goalPeriod: day | week
├── isArchived

subtasks (existing, modified)
├── ...all existing columns...
├── habitId → habits.id     ← NEW optional FK, links work to a habit
```

**No `habitEntries` table.** Everything flows through subtasks.

## How Each Habit Type Works

| Habit | Config | Action | Progress |
|-------|--------|--------|----------|
| Daily LeetCode | frequency=daily, goalType=completion | "Done" → creates completed subtask for today | Subtask completed today? ✓ |
| Weekly contest (Sun) | frequency=custom, customDays=[0], goalType=completion | Same — "Done" creates completed subtask | Subtask completed this Sunday? ✓ |
| 8hrs/week learning | frequency=daily, goalType=duration, goalTarget=480, goalPeriod=week | Create/activate subtask, work on it normally | Sum work sessions of linked subtasks this week |
| 1hr/day learning | frequency=daily, goalType=duration, goalTarget=60, goalPeriod=day | Same as above | Sum work sessions today |
| Organize emails | frequency=custom, customDays=[], goalType=completion | "Done" whenever | Count completions (no schedule enforcement) |

## Key Mechanics

### Habit Creation
1. User fills form: title, frequency, goalType, goalTarget
2. Backend auto-creates a parent `task` (title = habit title, priority = medium)
3. `habits.taskId` points to this task
4. This task is **hidden from Planning** page (filtered out)

### Completion Habits — "Mark Done"
1. User clicks "Done" on Habits page
2. Backend creates subtask: `{ parentTaskId: habit.taskId, habitId: habit.id, title: habit.title, scheduledDate: today, isCompleted: true, completedAt: now }`
3. Shows on Focus page's day plan as completed

### Duration Habits — "Start Working"
1. User clicks "Start" or creates a named subtask (e.g. "Study chapter 5")
2. Subtask created with `habitId` set, scheduled for today
3. User activates it — work session starts, ActivityWatch tracks focus
4. Progress = sum of `workSessionsHistory.durationMinutes` for subtasks with this `habitId` in the goal period

### Recurring — What "Due Today" Means
- **daily**: every day
- **weekly**: every week (at least once, any day)
- **custom with days**: only on matching `new Date().getDay()` values
- **custom with empty days `[]`**: "anytime" — always visible, never overdue

Due = no completed subtask with this `habitId` + today's `scheduledDate` (for completion) or below `goalTarget` for the current period (for duration)

## Pages & UI

### Habits Page (`/habits`) — The One Place to Manage Habits

```
┌─────────────────────────────────────────────────────┐
│  Habits                                  [+ New]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─── Today ─────────────────────────────────────┐  │
│  │ ○ Daily LeetCode                    [Done]    │  │
│  │ ◔ Learning (32m / 60m today)        [Start]   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─── Anytime ───────────────────────────────────┐  │
│  │ ○ Organize emails                   [Done]    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─── Weekly Progress ───────────────────────────┐  │
│  │ Learning    ████████░░ 6.5h / 8h              │  │
│  │ LeetCode    ●●●●●○○  5/7 days                │  │
│  │ Contest     ●        1/1 this week            │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─── Streaks ───────────────────────────────────┐  │
│  │ LeetCode: 12 days  │  Learning: 3 weeks       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Actions on this page only:**
- Create/edit/archive habits
- "Done" (completion habits) — one click, creates completed subtask
- "Start" (duration habits) — creates subtask scheduled for today (does NOT activate — user activates on Focus page)

### Focus Page — Read-Only Summary

Small card alongside the productivity metrics:

```
┌─── Habits (2/3) ──────────────────┐
│ ✓ LeetCode   ◔ Learning 32/60m   │
│ ○ Organize emails                 │
└───────────────────────────────────┘
```

- Read-only — no editing actions
- Click navigates to `/habits`
- Only shows today's due + anytime habits

### Planning Page — No Change

Habit-linked tasks are filtered out from the planning query. Planning stays clean for project work only.

### Sidebar

```
Focus    /
Plan     /planning
Habits   /habits     ← new (between Plan and Notes)
Notes    /notes
Reflect  /reports
Settings /settings
```

## API Endpoints

### Habits
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/habits` | List all habits (query: `?includeArchived=true`) |
| POST | `/api/habits` | Create habit (auto-creates parent task) |
| PUT | `/api/habits/:id` | Update habit config |
| DELETE | `/api/habits/:id` | Delete habit + its auto-created task |
| POST | `/api/habits/:id/complete` | Mark done for today (creates completed subtask) |
| POST | `/api/habits/:id/start` | Create subtask scheduled for today (not activated) |
| GET | `/api/habits/:id/progress` | Get progress for current period |
| GET | `/api/habits/summary` | Today's habits summary (for Focus card) |

### Existing Endpoints — Changes
| Endpoint | Change |
|----------|--------|
| `GET /api/tasks/planning` | Filter out tasks that have a linked habit |
| `GET /api/tasks/day-plan` | No change — habit subtasks scheduled today show up naturally |

## Files to Create/Modify

### New Files
- `client/src/pages/Habits.tsx` — page wrapper
- `client/src/components/HabitsView.tsx` — main habits UI
- `client/src/components/HabitCard.tsx` — individual habit row
- `client/src/components/HabitModal.tsx` — create/edit form
- `client/src/components/HabitsSummary.tsx` — Focus page card
- `client/src/hooks/useHabits.ts` — React Query hooks

### Modified Files
- `shared/schema.ts` — ✅ already done (habits table, habitId on subtasks)
- `server/migrations/` — regenerate for final schema
- `server/services/storage.ts` — habit CRUD, progress queries, filter planning
- `server/api/routes.ts` — habit endpoints
- `client/src/lib/api.ts` — habits API client
- `client/src/App.tsx` — add route
- `client/src/components/AppSidebar.tsx` — add nav item
- `client/src/pages/Home.tsx` — add HabitsSummary card

## What's Already Done
- [x] `habits` table in schema (with `taskId` FK)
- [x] `habitId` column added to `subtasks`
- [x] Validation schemas (`insertHabitSchema`, `updateHabitSchema`)
- [x] Type exports

## What's Left (Needs Cleanup First)
- [ ] Remove stale `habitEntries` references from storage.ts, routes.ts, api.ts
- [ ] Regenerate migration (delete old 0003, re-generate)
- [ ] Rewrite storage methods for Option B (no habitEntries, add progress queries)
- [ ] Rewrite API routes (remove habitEntry endpoints, add complete/start/progress)
- [ ] Build frontend (hooks, pages, components)
