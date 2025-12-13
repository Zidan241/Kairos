# GitHub Copilot Instructions: Desktop Application Conversion

## Project Context
Converting existing Kairos web application (React + Bun + SQLite) to desktop app using Electron while preserving all functionality exactly.

## Development Principles (Constitution Compliance)
- **Simplicity First**: Use standard Electron patterns, avoid custom abstractions
- **YAGNI**: Only implement desktop conversion requirements, no new features
- **Code Readability**: Clear naming, logical structure, minimal complexity
- **Selective Dependencies**: Use established Electron ecosystem tools only
- **No Over-Engineering**: Basic desktop packaging, standard auto-updater patterns

## Architecture Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Electron      │    │  Existing React  │    │  Existing Bun   │
│   Main Process  │◄──►│     Frontend     │◄──►│     Server      │
│                 │    │   (unchanged)    │    │   (unchanged)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                              ┌─────────────────┐
│  ActivityWatch  │                              │  SQLite Database│
│  Integration    │                              │    (bundled)    │
└─────────────────┘                              └─────────────────┘
```

## File Structure Expectations
```
electron/
├── main.js              # Main process entry point
├── preload.js           # Renderer security bridge  
└── package.json         # Desktop app configuration

client/                  # Existing React app (NO CHANGES)
server/                  # Existing Bun server (NO CHANGES)
```

## Key Implementation Guidelines

### Electron Main Process (electron/main.js)
```javascript
// Priority order for implementation:
1. Basic window creation and lifecycle
2. Embed Bun server as child process
3. Database bundle management
4. ActivityWatch integration
5. Auto-updater setup

// Code style expectations:
- Use modern async/await patterns
- Clear error handling with user-friendly messages
- Minimal dependencies (electron, electron-updater only)
- Standard Electron security practices (contextIsolation: true)
```

### Server Integration Patterns
```javascript
// Server startup in main process:
const serverProcess = spawn('bun', ['run', 'server/index.ts'], {
  cwd: app.getAppPath(),
  env: { ...process.env, PORT: availablePort }
});

// Health checking pattern:
async function waitForServer(port, timeout = 5000) {
  // Implementation should poll localhost:port/health endpoint
}
```

### ActivityWatch Integration
```javascript
// Detection pattern (cross-platform):
const awPaths = {
  win32: ['C:\\Program Files\\ActivityWatch\\aw-server.exe'],
  darwin: ['/Applications/ActivityWatch.app/Contents/MacOS/aw-server'],
  linux: ['~/.local/bin/aw-server', '/usr/bin/aw-server']
};

// Error handling priority: non-blocking, user-friendly messages
```

### Database Bundle Strategy
```javascript
// First run: copy database from app resources to userData
// Runtime: use database in userData directory for persistence
const dbPath = path.join(app.getPath('userData'), 'kairo.db');
```

## Code Generation Preferences

### When suggesting Electron main process code:
- Always include proper error handling
- Use child_process.spawn for server, not exec
- Include graceful shutdown logic
- Add logging for debugging
- Follow standard Electron security practices

### When suggesting package.json changes:
- Add scripts for electron-dev, build:electron, dist
- Include electron-builder configuration
- Maintain existing scripts unchanged
- Use concurrently for parallel dev processes

### When suggesting build configuration:
- Use electron-builder (not electron-packager)
- Target Windows, macOS, Linux
- Include server files in app bundle
- Set up proper app metadata (name, version, etc.)

## What NOT to suggest:
- Changes to existing React components
- Modifications to existing server routes
- New features beyond desktop conversion
- Complex build optimizations
- Custom Electron frameworks
- Testing frameworks (manual testing only per constitution)

## Error Handling Expectations
```javascript
// All errors should be handled gracefully:
try {
  await startServer();
} catch (error) {
  dialog.showErrorBox('Server Error', 
    'Could not start local server. Please check logs.');
  // App should continue running when possible
}
```

## Development Workflow Integration
- New scripts should integrate with existing bun/vite workflow
- Development mode should support hot reload for frontend
- Build process should work with existing CI/CD (if any)
- Distribution should create standard installers (.exe, .dmg, .AppImage)

## Performance Expectations
- App startup: < 3 seconds
- Server ready: < 2 seconds  
- Memory usage: < 200MB total
- Network: localhost only communication

## Security Requirements
- Context isolation enabled
- Node integration disabled in renderer
- Secure preload script for main↔renderer communication
- CSP headers for renderer content
- Update signature verification

When generating code, prioritize simplicity and standard patterns over optimization or cleverness. The goal is a working desktop app that exactly replicates the web experience with minimal complexity.