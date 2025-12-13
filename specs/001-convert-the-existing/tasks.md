# Tasks: Desktop Application Conversion

**Input**: Design documents from `/specs/001-convert-the-existing/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: Electron, React, Bun, SQLite tech stack
2. Load optional design documents:
   → data-model.md: Extract ElectronApp, LocalServer, ActivityWatchManager, UpdateManager, DatabaseBundle entities
   → contracts/: electron-main.md, server-integration.md, activitywatch-integration.md contracts
   → research.md: Electron framework choice, ActivityWatch integration decisions
3. Generate tasks by category:
   → Setup: Electron project init, dependencies, build configuration
   → Core: Main process, server integration, database bundling
   → Integration: ActivityWatch management, auto-updater, IPC
   → Polish: Error handling, manual testing scenarios
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → No automated tests (Constitution: manual testing only)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts implemented
   → All entities have corresponding implementations
   → All user scenarios covered
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Desktop app structure**: `electron/` for main process, existing `client/` and `server/` unchanged
- Paths reflect actual project structure from plan.md

## Phase 3.1: Setup
- [x] T001 Create Electron project structure with electron/ directory
- [x] T002 Install Electron dependencies (electron, electron-builder, electron-updater, concurrently)
- [x] T003 [P] Configure package.json scripts for electron-dev, build:electron, dist
- [x] T004 [P] Setup electron-builder configuration in package.json for cross-platform packaging
- [x] T005 [P] Configure development workflow with concurrently for parallel web+electron dev

## Phase 3.2: Core Implementation (Constitution: No automated testing)
- [x] T006 Create Electron main process in electron/main.js with basic app lifecycle
- [x] T007 [P] Create preload script in electron/preload.js for secure IPC communication
- [x] T008 Implement window management functions (createMainWindow, saveWindowState, restoreWindowState) in electron/main.js
- [x] T009 Implement LocalServer integration in electron/main.js (spawn Bun server, port management, health checking)
- [x] T010 [P] Create database bundle management in electron/databaseManager.js for SQLite bundling
- [x] T011 [P] Create ActivityWatch integration in electron/activityWatchManager.js with detection and lifecycle management
- [x] T012 [P] Implement UpdateManager in electron/updater.js (update checking, download, installation)
- [x] T013 Setup IPC message handlers in electron/main.js for renderer communication
- [x] T014 Configure Electron security settings (contextIsolation, nodeIntegration, webSecurity)

## Phase 3.3: Integration
- [x] T015 Integrate server startup with app initialization in electron/main.js
- [x] T016 Add graceful shutdown handling for server and ActivityWatch processes
- [x] T017 Implement error recovery mechanisms (server restart, ActivityWatch retry)
- [x] T018 Add application menu with update checking and ActivityWatch controls (Removed per user request - using React settings page instead)
- [x] T019 Configure auto-updater with GitHub releases integration ✅
- [x] T020 Setup logging system for main process operations and debugging

## Phase 3.4: Build & Packaging
- [ ] T021 [P] Configure Vite build to output for Electron renderer in dist/
- [ ] T022 [P] Setup electron-builder to include server files and database in app bundle
- [ ] T023 [P] Configure code signing for Windows and macOS builds (development certificates)
- [ ] T024 Test build process and verify all assets are correctly bundled
- [ ] T025 Create installer packages for Windows (.exe), macOS (.dmg), and Linux (.AppImage)

## Phase 3.5: Polish
- [ ] T026 [P] Add comprehensive error dialogs for common failure scenarios
- [ ] T027 [P] Implement user-friendly status notifications for server and ActivityWatch states
- [ ] T028 [P] Add logging and crash reporting for production debugging
- [ ] T029 Manual functionality verification using quickstart.md scenarios
- [ ] T030 Cross-platform testing on Windows, macOS, and Linux environments

## Dependencies
- Setup complete (T001-T005) before core implementation (T006+)
- T006 (main process) blocks T008, T009, T013, T015
- T010 (database) blocks T015 (server startup)
- T011 (ActivityWatch) blocks T016 (shutdown handling)
- T012 (updater) blocks T019 (auto-updater integration)
- Core implementation (T006-T014) before integration (T015-T020)
- Integration (T015-T020) before build & packaging (T021-T025)
- All implementation before polish (T026-T030)

## Parallel Example
```
# Launch T003, T004, T005 together (different configurations):
Task: "Configure package.json scripts for electron-dev, build:electron, dist"
Task: "Setup electron-builder configuration in package.json for cross-platform packaging"
Task: "Configure development workflow with concurrently for parallel web+electron dev"

# Launch T007, T010, T011, T012 together (different files):
Task: "Create preload script in electron/preload.js for secure IPC communication"
Task: "Implement DatabaseBundle management in electron/database.js"
Task: "Implement ActivityWatchManager in electron/activitywatch.js"
Task: "Implement UpdateManager in electron/updater.js"
```

## Notes
- [P] tasks = different files, no dependencies
- Keep implementations simple per Constitution (KISS principle)
- No automated testing per Constitution (manual testing in T029)
- Commit after each task for incremental progress
- Use standard Electron patterns, avoid over-engineering
- Preserve all existing web app functionality unchanged

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - electron-main.md → main process lifecycle and IPC tasks
   - server-integration.md → embedded server management tasks
   - activitywatch-integration.md → ActivityWatch service management tasks

2. **From Data Model**:
   - ElectronApp → window management and app lifecycle tasks [T006, T008]
   - LocalServer → server integration tasks [T009, T015]
   - ActivityWatchManager → ActivityWatch integration tasks [T011, T016]
   - UpdateManager → auto-updater tasks [T012, T019]
   - DatabaseBundle → database bundling tasks [T010, T015]

3. **From User Stories (quickstart.md)**:
   - First-time installation → setup and packaging tasks
   - Daily usage → core functionality tasks
   - Update process → auto-updater tasks
   - Error recovery → error handling tasks

4. **Ordering**:
   - Setup → Core → Integration → Build → Polish
   - Dependencies block parallel execution per rules above

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All entities from data-model.md have implementation tasks
- [x] All contracts have corresponding implementation tasks
- [x] All user stories from quickstart.md covered by tasks
- [x] Tasks follow KISS and YAGNI principles (no over-engineering)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] No automated testing tasks (Constitution compliance)
- [x] Manual testing scenario included (T029)