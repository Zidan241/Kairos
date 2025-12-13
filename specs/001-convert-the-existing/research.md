# Research: Desktop Application Conversion

## Technology Decisions

### Electron Framework Choice
**Decision**: Use Electron for desktop application conversion
**Rationale**: 
- Most mature cross-platform desktop framework for web technologies
- Large ecosystem and community support
- Allows reuse of existing React frontend without modifications
- Well-established patterns for embedding Node.js servers

**Alternatives Considered**:
- Tauri: More performant but requires Rust knowledge, adds complexity
- PWA: Limited desktop integration, no embedded server capability
- Native rewrites: Violates YAGNI principle, massive rework

### Application Architecture
**Decision**: Electron main process hosts Bun server, renderer displays React UI
**Architecture**:
1. **Main Process**: Launches Bun server, manages window lifecycle, handles updates
2. **Renderer Process**: Existing React app communicating with localhost server
3. **Preload Script**: Secure bridge for main↔renderer communication

**Rationale**: Minimal changes to existing codebase, clear separation of concerns

### ActivityWatch Integration
**Decision**: Check for ActivityWatch installation at startup, attempt to start if installed
**Implementation Approach**:
1. Main process checks for ActivityWatch executable in common installation paths
2. If found but not running, attempt to start ActivityWatch service
3. If not found or cannot start, show user-friendly error dialog
4. Python activity monitoring script continues to work unchanged if ActivityWatch available

**Rationale**: Balances user experience with simplicity, no complex bundling required

### Auto-Update System
**Decision**: Use electron-updater for in-app updates
**Rationale**:
- Industry standard for Electron auto-updates
- Supports all major platforms (Windows, macOS, Linux)
- Handles code signing and update verification
- Simple integration with GitHub releases or custom update server

### Database Bundling
**Decision**: Bundle SQLite database in app resources, copy to user data directory on first run
**Rationale**:
- Preserves existing database schema and ORM setup
- Allows for user data persistence and migrations
- Standard pattern for desktop apps with embedded databases

### Development Workflow
**Decision**: Add electron-dev script that builds web app and launches Electron in development mode
**Rationale**:
- Maintains existing development experience
- Allows hot-reload for frontend development
- Separate production build process for distribution

## Technical Requirements

### Build System Integration
- Extend existing Vite build to output to electron-compatible directory structure
- Add electron-builder for packaging desktop installers
- Maintain existing development scripts for web version

### Cross-Platform Considerations
- **Windows**: .exe installer with auto-updater support
- **macOS**: .dmg with code signing for distribution
- **Linux**: AppImage for broad compatibility

### Security Measures
- Enable context isolation and disable node integration in renderer
- Use preload scripts for secure main↔renderer communication
- Implement CSP (Content Security Policy) for renderer security

### Performance Optimization
- Lazy-load Electron dependencies to reduce startup time
- Bundle only necessary Electron modules
- Optimize SQLite database initialization

## Dependencies Analysis

### New Dependencies Required
- `electron`: ^27.0.0 (latest stable)
- `electron-builder`: ^24.0.0 (for packaging)
- `electron-updater`: ^6.0.0 (for auto-updates)

### Existing Dependencies (unchanged)
- All React, Bun, Drizzle ORM dependencies remain unchanged
- Python ActivityWatch client libraries remain unchanged

### Development Dependencies
- `electron-dev`: Development launcher
- `concurrently`: Run multiple dev processes simultaneously

## Risk Assessment

### Low Risk
- React frontend integration (no changes required)
- SQLite database bundling (standard pattern)
- Basic Electron packaging (well-documented)

### Medium Risk
- ActivityWatch process management (platform-specific executable detection)
- Auto-updater configuration (requires proper signing setup)
- First-time packaging workflow (learning curve)

### Mitigation Strategies
- Use established Electron boilerplate patterns
- Implement graceful fallbacks for ActivityWatch integration
- Manual testing on all target platforms
- Start with basic packaging, enhance gradually

## Success Criteria

### Technical Validation
- [ ] Desktop app launches with existing UI unchanged
- [ ] All existing functionality works identically
- [ ] Local server starts automatically with app
- [ ] Database persists across app sessions
- [ ] ActivityWatch integration functions when available
- [ ] Auto-updater mechanism operational

### User Experience Validation
- [ ] App installation process straightforward
- [ ] No breaking changes to existing workflows
- [ ] Error messages clear and actionable
- [ ] Performance matches or exceeds web version
- [ ] Offline functionality verified