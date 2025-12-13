# Quickstart: Desktop Application Conversion

## Overview
This quickstart guide demonstrates the key user flows for the Kairos desktop application, showing how existing web app functionality translates to the desktop experience.

## User Journey 1: First-Time Installation and Setup

### Scenario
New user downloads and installs Kairos desktop app for the first time.

### Steps
1. **Download & Install**
   - User downloads Kairos installer from releases page
   - Runs installer (.exe/.dmg/.AppImage)
   - App appears in Applications/Start Menu

2. **First Launch**
   - User launches app from desktop shortcut
   - App shows loading screen while initializing
   - Local server starts automatically in background
   - Database initializes with default schema

3. **ActivityWatch Detection**
   - App checks for ActivityWatch installation
   - If not found: Shows friendly notification "Activity tracking unavailable - install ActivityWatch for full functionality"
   - If found but not running: Attempts to start ActivityWatch
   - If start succeeds: "Activity tracking enabled" confirmation
   - If start fails: Shows error with manual start instructions

4. **Main Interface**
   - App opens to familiar Kairos interface
   - All navigation works identically to web version
   - User can immediately start creating tasks and plans

### Expected Outcome
- Desktop app launches successfully within 3 seconds
- User sees familiar interface with all existing functionality
- Activity tracking status is clearly communicated
- App remains fully functional regardless of ActivityWatch status

### Success Criteria
- [ ] App installs without admin privileges (where possible)
- [ ] First launch completes successfully even with no ActivityWatch
- [ ] Database initializes with proper schema
- [ ] UI loads with all existing components functional
- [ ] Error messages are user-friendly and actionable

## User Journey 2: Daily Usage - Existing Kairos User

### Scenario  
Existing Kairos web user switches to desktop app, expecting identical functionality.

### Steps
1. **Launching the App**
   - User clicks desktop icon or Start Menu entry
   - App opens to last used window size and position
   - Server starts automatically, UI appears when ready
   - Previous tasks and data are immediately available

2. **Task Management**
   - Navigate to Planning view - works identically to web version
   - Create new task - same form, same validation, same behavior
   - Edit existing task - same modal dialogs and interactions
   - Mark tasks complete - same animations and state updates

3. **Activity Tracking**
   - ActivityWatch runs in background (if available)
   - Python monitoring script continues collecting data
   - Reports view shows activity data identical to web version
   - No user interaction required for tracking

4. **Reports and Analytics**
   - Navigate to Reports view - same charts and metrics
   - Select date ranges - same date picker behavior
   - Export data - same options and formats
   - View productivity graphs - identical visualization

### Expected Outcome
- Zero learning curve for existing users
- All functionality works exactly as in web version
- Performance meets or exceeds web app experience
- Data persistence across app sessions

### Success Criteria
- [ ] No functional differences from web version
- [ ] UI interactions behave identically
- [ ] Data synchronization works seamlessly
- [ ] Performance is acceptable (< 200ms API responses)
- [ ] Window state persists between sessions

## User Journey 3: App Update Process

### Scenario
User receives notification that new version is available and installs update.

### Steps
1. **Update Detection**
   - App checks for updates in background on startup
   - User receives non-intrusive notification: "Update available - Version 1.2.0"
   - Update includes release notes and changelog
   - User can dismiss notification and update later

2. **Initiating Update**
   - User clicks "Download Update" button
   - Progress indicator shows download status
   - App continues to function normally during download
   - "Update ready - restart to install" notification appears

3. **Installing Update**
   - User clicks "Restart and Install"
   - App saves all pending work and current state
   - Server shuts down gracefully
   - App restarts automatically with new version

4. **Post-Update Verification**
   - App launches with new version number visible
   - All previous data remains intact
   - New features (if any) are highlighted briefly
   - Functionality test passes automatically

### Expected Outcome
- Seamless update experience with minimal user disruption
- Zero data loss during update process
- Clear communication of update status and progress
- Automatic rollback if update fails

### Success Criteria
- [ ] Background update checking doesn't impact performance
- [ ] Download progress is clearly communicated
- [ ] Update installation completes successfully
- [ ] No data loss or corruption during update
- [ ] Rollback works if update fails

## User Journey 4: Error Recovery - ActivityWatch Issues

### Scenario
User launches app but ActivityWatch has issues (not installed, permission problems, service conflicts).

### Steps
1. **ActivityWatch Not Installed**
   - App starts normally with server and UI functional
   - Shows notification: "ActivityWatch not detected - activity tracking disabled"
   - Provides link to ActivityWatch installation guide
   - Reports view shows message about missing activity data
   - User can continue using all other features

2. **ActivityWatch Permission Issues**
   - App detects ActivityWatch but cannot start it
   - Shows error dialog: "Cannot start ActivityWatch - permission denied"
   - Offers solutions: "Run as administrator" or "Start manually"
   - User chooses "Continue without activity tracking"
   - App functions normally with activity tracking disabled

3. **ActivityWatch Service Conflicts**
   - ActivityWatch port is occupied by another service
   - App shows technical error but continues operation
   - Provides troubleshooting steps in error dialog
   - User can retry or continue without tracking
   - All non-tracking features work normally

### Expected Outcome
- App remains fully functional despite ActivityWatch issues
- Clear error messages with actionable solutions
- Graceful degradation of activity tracking features
- User can continue productive work without interruption

### Success Criteria
- [ ] App never crashes due to ActivityWatch issues
- [ ] Error messages are informative and helpful
- [ ] Alternative solutions are provided when possible
- [ ] Core functionality always remains available
- [ ] User can retry ActivityWatch integration later

## Development Workflow Quickstart

### Setting Up Development Environment
```bash
# Clone repository (existing)
git clone <repo-url>
cd kairos

# Install existing dependencies (unchanged)
bun install

# Install new Electron dependencies
bun add -D electron electron-builder electron-dev

# Run in development mode (new)
bun run electron-dev
```

### Development Commands
```bash
# Start web development (existing, unchanged)
bun run dev

# Start desktop development (new)
bun run electron-dev

# Build web app (existing, unchanged) 
bun run build

# Build desktop app (new)
bun run build:electron

# Package for distribution (new)
bun run dist
```

### Testing the Desktop App
1. **Development Testing**
   - Use `electron-dev` for hot-reload development
   - Server and frontend reload automatically
   - DevTools available for debugging

2. **Production Testing**
   - Build with `build:electron`
   - Test packaged app before distribution
   - Verify all features work in production build

3. **Distribution Testing**
   - Create installer with `dist`
   - Test installation process on clean systems
   - Verify auto-updater works with test releases

## Configuration Files

### Main Configuration (package.json)
```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron-dev": "concurrently \"bun run dev\" \"electron .\"",
    "build:electron": "vite build && electron-builder",
    "dist": "bun run build:electron --publish=never"
  }
}
```

### Electron Builder Configuration (electron-builder.json)
```json
{
  "appId": "com.kairos.desktop",
  "productName": "Kairos",
  "directories": {
    "output": "dist-electron"
  },
  "files": [
    "electron/**/*",
    "dist/**/*",
    "server/**/*"
  ]
}
```

This quickstart demonstrates that the desktop conversion maintains complete compatibility with existing functionality while adding desktop-specific benefits like offline access, better system integration, and automatic updates.