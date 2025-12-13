# ActivityWatch Integration Contract

## Purpose
Define the interface for managing ActivityWatch dependency, including detection, startup, and error handling for the desktop application.

## ActivityWatch Detection Contract

### Installation Detection
```javascript
// Platform-specific detection paths
getActivityWatchPaths() -> Array<string>
  Windows: [
    'C:\\Program Files\\ActivityWatch\\aw-server.exe',
    'C:\\Users\\{user}\\AppData\\Local\\ActivityWatch\\aw-server.exe',
    '%USERPROFILE%\\ActivityWatch\\aw-server.exe'
  ]
  
  macOS: [
    '/Applications/ActivityWatch.app/Contents/MacOS/aw-server',
    '~/Applications/ActivityWatch.app/Contents/MacOS/aw-server',
    '/usr/local/bin/aw-server'
  ]
  
  Linux: [
    '~/.local/bin/aw-server',
    '/usr/bin/aw-server',
    '/usr/local/bin/aw-server',
    '~/ActivityWatch/aw-server'
  ]
```

### Service Status Detection
```javascript
// Process detection
isActivityWatchRunning() -> Promise<boolean>
  - Check for running aw-server process
  - Verify aw-watcher-afk is running
  - Test API endpoint http://localhost:5600/api/v1/info
  - Return: true if fully operational

// Installation verification
checkActivityWatchInstallation() -> Promise<InstallationStatus>
  - Scan common installation paths
  - Verify executable permissions
  - Check version compatibility (if possible)
  - Return: { installed: boolean, path?: string, version?: string }
```

## Service Management Contract

### Startup Operations
```javascript
// Attempt to start ActivityWatch service
startActivityWatch() -> Promise<StartupResult>
  - Locate executable path
  - Spawn aw-server process (detached)
  - Wait for service availability (max 10 seconds)
  - Start aw-watcher-afk if needed
  - Return: { success: boolean, error?: string, processes?: Array<number> }

// Startup validation
validateActivityWatchStartup(timeout: 10000) -> Promise<boolean>
  - Poll http://localhost:5600/api/v1/info
  - Check for expected response structure
  - Verify core watchers are active
  - Return success when fully operational
```

### Process Management
```javascript
// Process lifecycle (if started by app)
ActivityWatchProcesses {
  server: ChildProcess,      // aw-server process
  watchers: Array<ChildProcess>, // aw-watcher-* processes
  startTime: Date,
  managedByApp: boolean      // Did we start these processes?
}

// Cleanup on app exit (only if we started them)
cleanupActivityWatch() -> Promise<void>
  - Send SIGTERM to managed processes
  - Wait for graceful shutdown (5 seconds)
  - Force kill if necessary
  - Only cleanup processes started by this app
```

## Error Handling Contract

### Error Categories
```javascript
ActivityWatchErrors {
  NOT_INSTALLED: {
    code: 'AW_NOT_INSTALLED',
    message: 'ActivityWatch is not installed on this system',
    userMessage: 'Please install ActivityWatch to enable activity tracking',
    actions: ['show_install_guide', 'continue_without_tracking']
  },
  
  PERMISSION_DENIED: {
    code: 'AW_PERMISSION_DENIED',
    message: 'Permission denied when starting ActivityWatch',
    userMessage: 'Cannot start ActivityWatch due to permission restrictions',
    actions: ['run_as_admin', 'manual_start_guide', 'continue_without']
  },
  
  SERVICE_START_FAILED: {
    code: 'AW_START_FAILED',
    message: 'ActivityWatch service failed to start',
    userMessage: 'ActivityWatch could not be started automatically',
    actions: ['retry_start', 'manual_start_guide', 'continue_without']
  },
  
  SERVICE_UNAVAILABLE: {
    code: 'AW_UNAVAILABLE',
    message: 'ActivityWatch service is not responding',
    userMessage: 'ActivityWatch appears to be installed but is not responding',
    actions: ['restart_service', 'check_installation', 'continue_without']
  }
}
```

### User Error Dialogs
```javascript
// Error dialog specifications
showActivityWatchError(error: ActivityWatchError) -> Promise<UserAction>
  - Title: 'ActivityWatch Integration'
  - Icon: 'warning'
  - Message: error.userMessage
  - Buttons: error.actions mapped to user-friendly labels
  - Default: 'continue_without' for non-blocking experience
  - Return: Selected action for handling
```

## Integration with Existing Python Script

### Python Script Compatibility
```javascript
// Ensure Python monitoring script continues to work
validatePythonScript() -> Promise<ValidationResult>
  - Verify Python script can import ActivityWatch client
  - Test connection to ActivityWatch API
  - Validate data submission works
  - Return: { working: boolean, error?: string }

// Python script error handling
onPythonScriptError(error: Error) -> void
  - Log error details for debugging
  - Notify user if activity tracking stops working
  - Provide troubleshooting guidance
  - Continue app operation (non-blocking)
```

### Data Flow Preservation
```javascript
// Existing data flow must remain unchanged:
// Python Script → ActivityWatch API → ActivityWatch Database
// Kairos App → ActivityWatch API (read-only for reports)

// No changes to existing Python integration
// Desktop app only manages ActivityWatch service lifecycle
```

## User Experience Contract

### Startup Behavior
```javascript
// On app launch
onApplicationStart() -> void
  1. Check ActivityWatch installation (background)
  2. If not installed: Show non-blocking notification
  3. If installed but not running: Attempt to start
  4. If start fails: Show error dialog with options
  5. Continue app launch regardless of ActivityWatch status
```

### Status Reporting
```javascript
// Activity tracking status in UI
getActivityTrackingStatus() -> Promise<TrackingStatus>
  - Return: {
      available: boolean,     // ActivityWatch installed
      running: boolean,       // Service is active
      tracking: boolean,      // Data is being collected
      lastUpdate: Date,       // Last successful data point
      error?: string          // Current error if any
    }

// Status updates to renderer
'activitywatch-status-changed' -> TrackingStatus
  - Emitted when status changes
  - Allows UI to update tracking indicators
  - Non-disruptive notifications only
```

### Manual Controls
```javascript
// User-initiated actions
manualActivityWatchControl() -> {
  retry: () => Promise<StartupResult>,
  openInstallGuide: () => void,
  openTroubleshooting: () => void,
  disableTracking: () => void,
  enableTracking: () => Promise<StartupResult>
}
```

## Performance Contract

### Background Operations
- Installation check: < 1 second on app start
- Service startup: < 10 seconds maximum wait
- Status polling: Every 30 seconds (when needed)
- Error recovery: Automatic retry with exponential backoff

### Resource Usage
- CPU impact: < 1% for service management
- Memory usage: < 5MB for ActivityWatch integration
- Network: Local API calls only (localhost:5600)
- Disk: Log files < 1MB total

## Testing Contract

### Manual Testing Scenarios
1. **Fresh install**: App with no ActivityWatch installed
2. **ActivityWatch installed but not running**: Normal startup scenario
3. **ActivityWatch already running**: App should detect and use existing service
4. **Permission issues**: Test startup failures and recovery
5. **Service crashes**: Verify app continues without activity tracking
6. **Network port conflicts**: Handle ActivityWatch port unavailability

### Error Recovery Testing
- Service fails to start: User can continue using app
- Service crashes during use: Graceful degradation
- Permission denied: Clear error message and alternatives
- Installation missing: Non-blocking notification

### Cross-Platform Testing
- Windows: Service management with different user privileges
- macOS: App bundle permissions and Gatekeeper compatibility  
- Linux: Various distribution paths and service managers