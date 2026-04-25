# Notes Redesign

## Goal

Unified, date-aware notes system with daily journal and tagging.

## Schema

### `notes`

| Column    | Type    | Description                                  |
|-----------|---------|----------------------------------------------|
| id        | INTEGER | Primary key                                  |
| subtaskId | INTEGER | Nullable FK → subtasks (null = journal note) |
| date      | TEXT    | Nullable, ISO date for journal (`2026-04-02`)|
| createdAt | TEXT    | Timestamp                                    |
| updatedAt | TEXT    | Timestamp                                    |

- `subtaskId` set → subtask note
- `date` set, `subtaskId` null → daily journal entry
- One `notes` row per subtask, one per journal date

### `note_entries`

| Column    | Type    | Description                              |
|-----------|---------|------------------------------------------|
| id        | INTEGER | Primary key                              |
| noteId    | INTEGER | FK → notes                               |
| content   | TEXT    | Markdown body                            |
| date      | TEXT    | The day this entry belongs to            |
| position  | INTEGER | Ordering within the note                 |
| createdAt | TEXT    | When first written                       |
| updatedAt | TEXT    | Last edit timestamp                      |

Each day you write in a note creates a new entry with that day's date. Previous entries are editable — `updatedAt` tracks changes, `date` stays as the original day.

### `note_tags`

| Column | Type    | Description          |
|--------|---------|----------------------|
| noteId | INTEGER | FK → notes           |
| tag    | TEXT    | e.g. `focus`, `idea` |

`UNIQUE(noteId, tag)`. Tags are parsed from `#hashtags` in entry content on save.

## How It Works

### Subtask Notes
Open notes for a subtask → loads/creates `notes` row with that `subtaskId`. Writing on a new day creates a new `note_entries` row. Entries render grouped by date:

```
── April 2, 2026 ──
Refactored the auth flow to use JWT...

── April 1, 2026 ──
Started looking into token refresh logic...
```

### Daily Journal
A `notes` row with `date` set and no `subtaskId`. Navigate by date. Same entry structure underneath.

### Tags
Type `#focus` or `#blocker` in any entry. On save, tags are extracted and stored in `note_tags`. Notes are filterable/searchable by tag across all dates and subtasks.

### Editing Past Entries
All entries are editable regardless of date. If `updatedAt` differs from `date` by more than a day, show a subtle "edited" indicator:

```
── April 1, 2026 ── (edited Apr 3)
```

No revision history. Simple edit-in-place.

## UI

### Focus Page — Notes Panel

A collapsible notes panel sits at the bottom of the left column (below Day Plan).

**States:**
- **Collapsed** (default): Small header bar — `📓 Journal ▾` or `📓 Task Name ▾`
- **Expanded**: Compact markdown editor (3-5 lines, resizable), auto-saves with 1s debounce

**Context switching:**
- **No active task**: Panel shows today's daily journal
- **Active task selected**: Panel switches to that task's note, with a back link `← Back to Journal`
- **Any task in Day Plan**: Each task in the Day Plan list has a note icon. Clicking it switches the panel to that task's note (and expands it if collapsed)

```
┌──────────────────────┬──────────────────────┐
│  Day Plan            │  Day Schedule        │
│  ☐ Task 1       📝  │  Timeline            │
│  ● Task 2 (active)  │  ████░░░░            │
│  ☐ Task 3       📝  │  ██████░░            │
├──────────────────────┤                      │
│  📓 Task 2 notes     │                      │
│  ← Back to Journal   │                      │
│  [editor]            │                      │
│  Working on the API  │                      │
│  integration...      │                      │
└──────────────────────┴──────────────────────┘
```

**Panel header shows:**
- Current context: "Today's Journal" or task/subtask name
- Switch link: `← Back to Journal` (when viewing a task note)
- Expand link: `Open in Notes →` (navigates to full Notes page)

### Notes Page

Full browsing/editing experience:
- Left sidebar: searchable list of all notes (journal entries + subtask notes), filterable by tag
- Right pane: full-size editor with date-grouped entries
- Date navigation for journal entries

## Migration

Existing subtask `notes` text field → migrated into this system as a single `note_entries` row per subtask, with `date` set to the subtask's `updatedAt` date.
