# Data Model: Desktop Application Conversion

## Overview
This feature involves converting an existing web application to desktop format. The data model focuses on the new desktop-specific entities and how they interact with existing data structures.

## New Desktop-Specific Entities

### ElectronApp
- **Purpose**: Main application container managing desktop lifecycle
- **Responsibilities**: Window management, server lifecycle, update coordination
- **State**: window dimensions, server status, update availability

### LocalServer
- **Purpose**: Embedded Bun server instance running within Electron main process
- **Responsibilities**: Start/stop server, port management, health monitoring
- **State**: running status, port number, startup errors

### ActivityWatchManager
- **Purpose**: Manages integration with external ActivityWatch service
- **Responsibilities**: Service detection, startup attempts, error reporting
- **State**: installation status, service status, connection health

### UpdateManager
- **Purpose**: Handles in-app update checking and installation
- **Responsibilities**: Update detection, download coordination, installation triggers
- **State**: current version, available version, download progress, install readiness

### DatabaseBundle
- **Purpose**: Manages SQLite database lifecycle for desktop app
- **Responsibilities**: Database initialization, migrations, backup management
- **State**: database location, schema version, initialization status

## Existing Data Preservation

### Task Management Data
- **Status**: Unchanged - existing Task, Project, Activity entities remain identical
- **Storage**: Same SQLite schema, migrated to desktop app user data directory
- **Access**: Same Drizzle ORM queries through embedded server

### User Preferences
- **Status**: Unchanged - existing Settings, Configuration entities remain identical
- **Storage**: Preserved in SQLite database, desktop app adds window state persistence
- **Access**: Same API endpoints through embedded server

### Activity Tracking Data
- **Status**: Unchanged - existing ActivityWatch integration and data structures
- **Storage**: ActivityWatch continues to manage its own data stores
- **Access**: Same Python script integration, no API changes required

## Data Flow Architecture

### Application Startup Flow
1. **ElectronApp** initializes and checks for existing database
2. **DatabaseBundle** copies initial database if first run, applies migrations
3. **LocalServer** starts Bun server with existing database connection
4. **ActivityWatchManager** attempts to detect and start ActivityWatch service
5. **UpdateManager** checks for available updates in background
6. Renderer loads React app, connects to localhost server

### Runtime Data Flow
1. User interactions in React UI send requests to embedded server (unchanged)
2. Server processes requests using existing business logic (unchanged)
3. Database operations use existing Drizzle ORM patterns (unchanged)
4. Activity tracking continues through existing Python→ActivityWatch integration
5. Update checks occur periodically in background without disrupting user workflow

### Application Shutdown Flow
1. **ElectronApp** triggers graceful shutdown sequence
2. **LocalServer** completes pending requests and closes cleanly  
3. **ActivityWatchManager** leaves ActivityWatch service running (if started by app)
4. **DatabaseBundle** ensures all transactions committed
5. Window state and preferences saved for next startup

## Migration Strategy

### Database Migration
- Copy production SQLite database to desktop app user data directory
- Apply any pending schema migrations using existing migration system
- Preserve all existing data relationships and constraints

### Configuration Migration
- Existing web app configurations remain valid
- Add desktop-specific preferences (window size, update preferences)
- Maintain backward compatibility with web version configurations

### Data Integrity
- No changes to existing data validation rules
- Same business logic for data processing
- Identical API contracts between frontend and backend

## Storage Locations

### User Data Directory
- **Windows**: `%APPDATA%/Kairos/`
- **macOS**: `~/Library/Application Support/Kairos/`
- **Linux**: `~/.config/Kairos/`

### Database File
- Location: `{UserDataDir}/kairo.db`
- Same schema as existing web application
- Automatic backup on major version updates

### Configuration Files
- Application preferences: `{UserDataDir}/config.json`
- Window state: `{UserDataDir}/window-state.json`
- Update settings: `{UserDataDir}/update-preferences.json`

## Data Security

### Database Security
- Same security model as existing web application
- Local-only access (no network exposure)
- File system permissions restrict access to user account

### Update Security
- Code signature verification for all updates
- Cryptographic hash verification of downloaded packages
- Rollback capability if update validation fails

### Privacy Considerations
- All existing privacy protections maintained
- Desktop app data remains local to user machine
- No additional data collection beyond existing ActivityWatch integration