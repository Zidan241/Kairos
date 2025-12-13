# Electron Main Process Contract

## Purpose
Define the interface and responsibilities of the Electron main process for desktop application lifecycle management.

## Interface Definition

### Application Lifecycle
```javascript
// App initialization
app.whenReady() -> Promise<void>
  - Initialize database bundle
  - Start local server
  - Create main window
  - Setup auto-updater
  - Check ActivityWatch status

// App termination
app.before-quit -> Promise<void>
  - Gracefully shutdown local server
  - Save window state
  - Close database connections
```

### Window Management
```javascript
// Main window creation
createMainWindow() -> BrowserWindow
  - Size: 1200x800 (minimum), remember last size
  - Show: false (until ready-to-show)
  - WebSecurity: true
  - ContextIsolation: true
  - NodeIntegration: false

// Window state persistence
saveWindowState() -> void
restoreWindowState() -> WindowState
```

### Server Integration
```javascript
// Local server lifecycle
startLocalServer() -> Promise<ServerInfo>
  - Port: Auto-assign available port
  - Host: localhost only
  - Return: { port, status, pid }

stopLocalServer() -> Promise<void>
  - Graceful shutdown with timeout
  - Force kill if necessary

getServerStatus() -> ServerStatus
  - Return: running | stopped | error
```

### ActivityWatch Integration
```javascript
// ActivityWatch service management
checkActivityWatch() -> Promise<ActivityWatchStatus>
  - Detect installation paths
  - Check if service running
  - Return: { installed, running, executable_path }

startActivityWatch() -> Promise<boolean>
  - Attempt to start if installed
  - Return success/failure
  - Emit error events if failed

// Error handling
onActivityWatchError(callback: (error: Error) => void)
```

### Auto-Update System
```javascript
// Update checking
checkForUpdates() -> Promise<UpdateInfo>
  - Background check on app start
  - Manual check via menu/UI
  - Return: { available, version, releaseNotes }

// Update installation
downloadUpdate() -> Promise<void>
  - Progress events emitted
  - Signature verification

installUpdate() -> void
  - Restart app with new version
  - Rollback on failure
```

## IPC Communication Contract

### Main → Renderer Messages
```javascript
// Server status updates
'server-status-changed' -> { status: 'running' | 'stopped' | 'error', port?: number, error?: string }

// ActivityWatch status updates  
'activitywatch-status' -> { installed: boolean, running: boolean, error?: string }

// Update notifications
'update-available' -> { version: string, releaseNotes: string }
'update-downloaded' -> { version: string }
'update-error' -> { error: string }
```

### Renderer → Main Messages
```javascript
// Server control
'get-server-status' -> Promise<ServerStatus>
'restart-server' -> Promise<void>

// ActivityWatch control
'check-activitywatch' -> Promise<ActivityWatchStatus>
'start-activitywatch' -> Promise<boolean>

// Update control
'check-for-updates' -> Promise<UpdateInfo>
'download-update' -> Promise<void>
'install-update' -> void
```

## Error Handling Contract

### Server Startup Errors
- Port conflict: Try alternative ports (3000-3010 range)
- Permission errors: Show admin rights dialog
- Database errors: Show database repair options

### ActivityWatch Errors
- Not installed: Show installation guide dialog
- Permission denied: Show troubleshooting steps
- Service start failure: Provide manual start instructions

### Update Errors
- Network errors: Retry with exponential backoff
- Signature verification failure: Abort update, show security warning
- Installation failure: Rollback to previous version

## Security Contract

### Process Isolation
- Main process: Full Node.js access, no direct UI rendering
- Renderer process: No Node.js access, sandboxed
- Preload script: Limited APIs via contextBridge

### Network Security
- Local server: Bind to localhost only
- CORS: Allow requests from Electron app only
- Updates: HTTPS only, signature verification required

### File System Access
- User data directory: Full read/write access
- App resources: Read-only access
- External files: No access without user permission

## Performance Contract

### Startup Performance
- App ready: < 3 seconds from launch
- UI responsive: < 1 second after app ready
- Server startup: < 2 seconds background

### Runtime Performance
- Memory usage: < 200MB for main process
- CPU usage: < 5% idle, < 50% during operations
- Network: Localhost communication only

### Shutdown Performance
- Graceful shutdown: < 5 seconds
- Force quit timeout: 10 seconds maximum
- Data persistence: All changes saved before quit