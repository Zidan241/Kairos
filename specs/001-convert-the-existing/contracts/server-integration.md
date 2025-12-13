# Server Integration Contract

## Purpose
Define how the existing Bun server integrates with the Electron desktop application, ensuring seamless embedded operation.

## Server Lifecycle Contract

### Startup Sequence
```javascript
// Server initialization within Electron main process
startServer() -> Promise<ServerConfig>
  - Port discovery: Find available port (default: 3000)
  - Database initialization: Verify/migrate SQLite database
  - Service startup: Launch Bun server as child process
  - Health check: Verify server responds within 5 seconds
  - Return: { port, host: 'localhost', status: 'ready' }
```

### Runtime Operations
```javascript
// Health monitoring
getServerHealth() -> Promise<HealthStatus>
  - Endpoint: GET /health
  - Response: { status: 'ok' | 'error', database: 'connected' | 'error', uptime: number }
  - Timeout: 2 seconds

// Graceful shutdown
stopServer() -> Promise<void>
  - Send SIGTERM to server process
  - Wait for graceful shutdown (max 10 seconds)
  - Force kill if necessary (SIGKILL)
  - Cleanup: Close database connections, remove temp files
```

## API Contract Preservation

### Existing Endpoints (Unchanged)
All existing REST API endpoints must work identically:

```javascript
// Task Management
GET    /api/tasks          -> Array<Task>
POST   /api/tasks          -> Task
PUT    /api/tasks/:id      -> Task
DELETE /api/tasks/:id      -> void

GET    /api/tasks/:id/subtasks -> Array<Subtask>
POST   /api/tasks/:id/subtasks -> Subtask

// Planning
GET    /api/plans          -> Array<Plan>
POST   /api/plans          -> Plan
PUT    /api/plans/:id      -> Plan

// Reports & Metrics
GET    /api/metrics/dashboard   -> DashboardMetrics
GET    /api/metrics/productivity -> ProductivityData
GET    /api/reports/day/:date   -> DayReport
GET    /api/reports/week/:date  -> WeekReport
GET    /api/reports/month/:date -> MonthReport

// Settings
GET    /api/settings       -> UserSettings
PUT    /api/settings       -> UserSettings
```

### Database Connection Contract
```javascript
// Database configuration (embedded SQLite)
DatabaseConfig {
  type: 'sqlite',
  database: path.join(app.getPath('userData'), 'kairo.db'),
  synchronize: false, // Use existing migration system
  logging: false,     // Disable in production
  entities: [...],    // Existing entity definitions
}
```

## Process Management Contract

### Child Process Management
```javascript
// Server process spawning
spawnServer() -> ChildProcess
  - Command: 'bun run server/index.ts'
  - Cwd: app.getAppPath()
  - Env: { NODE_ENV: 'production', PORT: assignedPort }
  - Stdio: 'pipe' for logging capture

// Process monitoring  
monitorServer(process: ChildProcess) -> void
  - Monitor stderr/stdout for errors
  - Auto-restart on unexpected exit (max 3 attempts)
  - Emit 'server-error' events to renderer
```

### Port Management
```javascript
// Port assignment strategy
findAvailablePort(startPort: 3000) -> Promise<number>
  - Try ports 3000-3010 sequentially
  - Skip ports already in use
  - Store assigned port for renderer communication

// Port validation
validatePort(port: number) -> Promise<boolean>
  - Check if port is available
  - Verify no conflicts with system services
```

## Error Handling Contract

### Server Startup Failures
```javascript
// Startup error types and handling
ServerStartupError {
  PORT_IN_USE: {
    code: 'PORT_IN_USE',
    message: 'Server port already in use',
    action: 'try_different_port'
  },
  
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR', 
    message: 'Database connection failed',
    action: 'check_database_file'
  },
  
  PERMISSION_ERROR: {
    code: 'PERMISSION_ERROR',
    message: 'Insufficient permissions',
    action: 'run_as_administrator'
  }
}
```

### Runtime Error Recovery
```javascript
// Auto-recovery mechanisms
onServerCrash(process: ChildProcess) -> void
  - Log crash details
  - Attempt restart (max 3 times)
  - Show user notification if restart fails
  - Provide manual restart option

onDatabaseError(error: DatabaseError) -> void
  - Check database file integrity
  - Attempt database repair if possible
  - Backup corrupted database
  - Show user recovery options
```

## Communication Protocol

### Frontend-Server Communication
```javascript
// All existing frontend requests work unchanged
// Base URL changes from remote server to localhost

// Development mode
const API_BASE_URL = 'http://localhost:${serverPort}'

// Frontend code remains identical
fetch(`${API_BASE_URL}/api/tasks`)
  .then(response => response.json())
  .then(tasks => updateUI(tasks))
```

### Main Process-Server Communication  
```javascript
// Health check endpoint
GET /internal/health -> {
  status: 'ok' | 'error',
  database: 'connected' | 'error', 
  uptime: number,
  memory: number,
  activeConnections: number
}

// Graceful shutdown endpoint
POST /internal/shutdown -> {
  status: 'shutting_down',
  timeRemaining: number
}
```

## Performance Contract

### Startup Performance
- Server ready: < 2 seconds after process spawn
- Database connection: < 1 second
- First API response: < 500ms after server ready

### Runtime Performance  
- API response time: < 200ms for typical requests
- Memory usage: < 100MB for server process
- CPU usage: < 10% idle, < 30% under load

### Resource Management
- Connection pooling: Max 10 concurrent database connections
- Request timeout: 30 seconds maximum
- Memory cleanup: Garbage collection every 5 minutes

## Logging Contract

### Log Levels and Destinations
```javascript
// Log configuration for embedded server
LogConfig {
  level: 'info',           // info, warn, error only
  destination: path.join(app.getPath('logs'), 'server.log'),
  maxFileSize: '10MB',
  maxFiles: 5,
  format: 'json'          // For structured parsing
}
```

### Log Categories
- `server.startup`: Server initialization events
- `server.api`: API request/response logging
- `server.database`: Database operation logging  
- `server.error`: Error conditions and recovery
- `server.shutdown`: Graceful shutdown process