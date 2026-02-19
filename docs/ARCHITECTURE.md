# Kairos Architecture

## Overview

Kairo is a desktop productivity app. It runs as an Electron app wrapping a Bun/Express server and a React frontend. The server also works standalone for browser-based development.

```bash
┌──────────────────────┐
│   Electron Main      │──── IPC ────► Renderer (React + Vite)
│   Process            │                    │
│                      │                    │ HTTP
│   • Window mgmt      │                    ▼
│                      │              ┌──────────┐
│   • Settings (JSON)  │              │   Bun    │
│   • DB path          │              │  Server  │
│                      │── spawns ───►│  (child) │
└──────────────────────┘              │          │
                                      │ • REST API
                                      │ • SQLite (Drizzle)
                                      │ • AW data collection
                                      └──────────┘
```

## Three Processes, Two Channels

| Process | Role | Talks to |
|---------|------|----------|

| **Electron main** | Window, native menus, settings, DB path resolution | Renderer (IPC) |
| **Bun server** | REST API, SQLite queries, activity data collection from ActivityWatch | AW API (HTTP), DB (SQLite) |
| **Renderer** | React UI, user interactions | Server (HTTP for data/AW control), Electron (IPC for settings) |

The renderer has two communication channels:

- **HTTP → Server**: tasks, subtasks, metrics, activity data, reports
- **IPC → Electron**: settings, DB info, app version

## Why a Separate Server Process

This started as a web app. The Electron conversion wraps it rather than replacing it. Trade-offs:

**Benefits:**

- `bun dev:server` + `bun dev:client` works without Electron for fast iteration
- Server can be restarted independently if it crashes
- Same API serves both browser and Electron modes
- Clean process isolation

**Costs:**

- Extra memory for the Bun process
- Port management and health checking on startup
- CORS configuration needed for Electron renderer
- Dual communication channels (HTTP + IPC) in the frontend

## ActivityWatch Integration

ActivityWatch knowledge is split across the server:

| File | Responsibility |
| ---- | -------------- |
| `nodeActivityWatch.ts` | Cron-based polling, bucket processing, pause/resume |
| `activityWatchService.ts` | Analyze time windows, classify activity (focus/prefocus/distraction/idle) |
| `activityWatchClient.ts` | HTTP client for AW's REST API |

The client controls polling via `POST /api/activity/{pause,resume}` from the Settings page.
