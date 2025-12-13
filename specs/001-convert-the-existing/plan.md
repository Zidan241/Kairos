
# Implementation Plan: Desktop Application Conversion

**Branch**: `001-convert-the-existing` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-convert-the-existing/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Convert the existing Kairos web application (React frontend + Bun server + SQLite database) to a standalone desktop application using Electron. The conversion must preserve all existing functionality exactly while adding desktop-specific features: embedded local server, bundled database, ActivityWatch integration management, and in-app auto-updates. The approach prioritizes simplicity using standard Electron patterns without over-engineering.

## Technical Context
**Language/Version**: TypeScript/JavaScript (Node.js), Python 3.x (for ActivityWatch integration)  
**Primary Dependencies**: Electron, React, Bun runtime, Drizzle ORM, SQLite, ActivityWatch Python client  
**Storage**: SQLite database (bundled with desktop app)  
**Target Platform**: Windows, macOS, Linux desktop environments  
**Project Type**: web → desktop conversion (frontend+backend bundled)  
**Performance Goals**: Maintain existing web app performance, fast app startup (<3s), minimal memory footprint  
**Constraints**: Must preserve exact UI/UX, maintain ActivityWatch compatibility, support auto-updates, offline capable  
**Scale/Scope**: Single-user productivity app, existing codebase conversion, 4 main views (Home, Planning, Reports, Settings)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity First (KISS)**: Is this the simplest approach? Can we reduce complexity?
- [x] Solution avoids unnecessary cleverness - Using standard Electron main/renderer pattern
- [x] Architecture is immediately understandable - Web app → desktop app with embedded server
- [x] Complex solutions documented with simpler alternatives considered - ActivityWatch integration only as required

**YAGNI Compliance**: Are we implementing only what's needed now?
- [x] No speculative features or future-proofing - Only desktop conversion, no new features
- [x] Each feature has clear, immediate business value - Desktop access, offline capability, ActivityWatch integration
- [x] No "just in case" code - Minimal viable desktop conversion

**Code Readability**: Will this be readable and maintainable?
- [x] Self-documenting through clear naming and structure - Standard Electron project structure
- [x] Minimal complexity in implementation approach - Reuse existing React frontend and Bun server
- [x] Clear separation of concerns - Main process (server), renderer (UI), preload (security bridge)

**Selective Dependencies**: Are third-party choices justified?
- [x] Dependencies are polished, stable, and actively maintained - Electron (mature), electron-updater (standard)
- [x] Each dependency solves a real problem vs custom implementation - Avoid reinventing desktop packaging/updates
- [x] Dependency choices documented with rationale - Electron for cross-platform, electron-builder for packaging

**No Over-Engineering**: Is the architecture appropriate to the problem scale?
- [x] No premature optimization or unnecessary abstractions - Direct conversion, minimal architectural changes
- [x] Patterns match current requirements, not imagined future ones - Single-window app, basic auto-update
- [x] Starting simple with evolution path identified - Basic desktop app first, enhancements later if needed

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Desktop App Structure (Electron integration with existing web app)
client/                  # Existing React frontend (unchanged)
├── src/
├── index.html
└── ...

server/                  # Existing Bun server (unchanged)
├── index.ts
├── api/
└── ...

electron/                # New Electron desktop app files
├── main.js             # Electron main process
├── preload.js          # Preload script for security
└── package.json        # Desktop app package config

dist-electron/           # Built desktop app (gitignored)
└── ...

shared/                  # Existing shared code (unchanged)
└── ...

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Electron main process setup based on electron-main.md contract
- Server integration tasks from server-integration.md contract
- ActivityWatch integration from activitywatch-integration.md contract
- Database bundling tasks from data-model.md entities
- Build and packaging tasks from quickstart.md workflows

**Ordering Strategy**:  
- Setup first: Project structure, dependencies, configuration
- Core implementation: Electron main process, server integration
- Integration: ActivityWatch, database bundling, auto-updater
- Polish: Error handling, logging, manual testing scenarios
- Mark [P] for parallel execution (different files, no dependencies)

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**Constitution Compliance in Task Generation**:
- No testing tasks (manual testing only per constitution)
- Simple implementations prioritized over complex patterns
- Standard Electron patterns, no custom abstractions
- Each task focused on immediate business value (YAGNI)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Initial Constitution Check**: ✅ PASSED - All principles satisfied, no violations  
**Post-Design Constitution Check**: ✅ PASSED - Design maintains constitutional compliance

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - contracts/, data-model.md, quickstart.md, .github/copilot-instructions.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Artifacts Generated**:
- ✅ specs/001-convert-the-existing/research.md
- ✅ specs/001-convert-the-existing/data-model.md
- ✅ specs/001-convert-the-existing/quickstart.md
- ✅ specs/001-convert-the-existing/contracts/electron-main.md
- ✅ specs/001-convert-the-existing/contracts/server-integration.md
- ✅ specs/001-convert-the-existing/contracts/activitywatch-integration.md
- ✅ .github/copilot-instructions.md

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
