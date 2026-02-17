import { app, dialog, ipcMain } from 'electron';
import path from 'path';
import { WindowManager } from './windowManager.js';
import { ServerManager } from './serverManager.js';
import { DatabaseManager } from './databaseManager.js';
import { ActivityWatchManager } from './activityWatchManager.js';
import { MenuManager } from './menuManager.js';
import { settingsManager } from './settingsManager.js';
import { logger } from './logger.js';
import updateElectronApp from 'update-electron-app';

const __dirname = import.meta.dirname;

// Keep references to main components
let windowManager;
let serverManager;
let databaseManager;
let activityWatchManager;
let menuManager;

// Enable live reload for development (will be loaded after app is ready)
let enableLiveReload = false;
if (process.env.NODE_ENV === 'development') {
  enableLiveReload = true;
}

// App event handlers
app.whenReady().then(async () => {
  try {
    logger.info('App startup initiated');
    
    // Setup live reload for development
    if (enableLiveReload) {
      try {
        const electronReload = await import('electron-reload');
        electronReload.default(__dirname, {
          electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
          hardResetMethod: 'exit'
        });
        logger.info('Live reload enabled for development');
      } catch (error) {
        logger.warn('Failed to load electron-reload:', error.message);
      }
    }
    
    // Initialize managers
    windowManager = new WindowManager();
    databaseManager = new DatabaseManager();
    activityWatchManager = new ActivityWatchManager();
    logger.info('Core managers initialized');
    
    // Initialize database bundle
    const dbInfo = await databaseManager.initializeDatabase();
    logger.info('Database initialized:', dbInfo);
    
    // Initialize server manager with database path
    serverManager = new ServerManager(databaseManager.getDatabasePath());
    logger.info('Server manager initialized with database path');
    
    // Start local server
    const serverInfo = await serverManager.startServer();
    logger.info('Server started:', serverInfo);
    
    // Give ActivityWatch manager access to server port for pause/resume
    activityWatchManager.setServerPort(serverInfo.port);

    // Expose server port to renderer
    ipcMain.handle('get-server-port', () => serverInfo.port);

    // Check ActivityWatch availability (non-blocking)
    await activityWatchManager.detectActivityWatch();
    
    // If setting is enabled, AW is installed but not running, and user didn't explicitly disconnect — auto-start
    if (
      settingsManager.get('manageActivityWatch') &&
      !settingsManager.get('activityWatchDisconnectedByUser') &&
      activityWatchManager.isAvailable &&
      !activityWatchManager.isRunning
    ) {
      try {
        await activityWatchManager.connect();
        logger.info('ActivityWatch auto-started (managed by Kairos)');
      } catch (error) {
        logger.warn('Failed to auto-start ActivityWatch:', error);
      }
    }
    
    // Create main window
    const mainWindow = windowManager.createWindow();
    logger.info('Main window created');
    
    // Load content based on environment
    const isDev = process.env.NODE_ENV === 'development';
    logger.info('Loading content in development mode:', isDev);
    windowManager.loadContent(isDev);
    
    // Setup auto-updater (only in production)
    if (!isDev) {
      updateElectronApp({ logger });
      logger.info('Auto-updater enabled via update-electron-app');
    }
    
    // Setup application menu
    menuManager = new MenuManager(windowManager);
    menuManager.buildMenu();
    logger.info('Application menu created');
    
    logger.info('App startup completed successfully');
    
  } catch (error) {
    logger.error('App initialization failed:', error);
    dialog.showErrorBox(
      'Startup Error',
      'Failed to initialize the application. Please try again.'
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  logger.info('All windows closed');
  if (process.platform !== 'darwin') {
    logger.info('Quitting app (non-macOS)');
    app.quit();
  }
});

app.on('activate', () => {
  logger.info('App activated');
  if (!windowManager || !windowManager.isWindowCreated()) {
    logger.info('Recreating window after activation');
    if (!windowManager) {
      windowManager = new WindowManager();
    }
    windowManager.createWindow();
    windowManager.loadContent(process.env.NODE_ENV === 'development');
  }
});

let isQuitting = false;

app.on('before-quit', (event) => {
  if (isQuitting) return; // already cleaning up
  isQuitting = true;
  event.preventDefault(); // block quit until cleanup finishes
  
  logger.info('App quit initiated - performing cleanup');
  
  const doCleanup = async () => {
    // Save window state
    if (windowManager) {
      windowManager.saveWindowState();
      logger.info('Window state saved');
    }
    
    // Clean up ActivityWatch (stop process if managed, stop monitoring otherwise)
    if (activityWatchManager) {
      try {
        await activityWatchManager.cleanup();
        logger.info('ActivityWatch cleaned up successfully');
      } catch (error) {
        logger.error('Error cleaning up ActivityWatch:', error);
      }
    }
    
    // Gracefully shutdown local server
    if (serverManager) {
      await serverManager.stopServer();
      logger.info('Server stopped');
    }
    
    // Cleanup old database backups
    if (databaseManager) {
      await databaseManager.cleanupOldBackups();
    }
    
    // All cleanup done — quit for real
    app.quit();
  };
  
  doCleanup().catch((err) => {
    logger.error('Cleanup error, forcing quit:', err);
    app.exit(1);
  });
});

// Setup IPC handlers for database management
ipcMain.handle('db-get-info', async () => {
  if (databaseManager) {
    return await databaseManager.getDatabaseInfo();
  }
  return { error: 'Database manager not initialized' };
});

ipcMain.handle('db-backup', async () => {
  if (databaseManager) {
    try {
      return await databaseManager.backupDatabase();
    } catch (error) {
      logger.error('Database backup failed:', error);
      throw error;
    }
  }
  return { error: 'Database manager not initialized' };
});

// Setup IPC handlers for ActivityWatch management
ipcMain.handle('aw-get-status', () => {
  if (!activityWatchManager) return { available: false, running: false };
  return {
    available: activityWatchManager.isAvailable || activityWatchManager.isRunning,
    running: activityWatchManager.isRunning,
  };
});

ipcMain.handle('aw-start', async () => {
  if (!activityWatchManager) return;
  try {
    await activityWatchManager.connect();
  } catch (error) {
    logger.error('Failed to connect to ActivityWatch:', error);
    throw error;
  }
});

ipcMain.handle('aw-stop', async () => {
  if (!activityWatchManager) return;
  try {
    await activityWatchManager.disconnect();
  } catch (error) {
    logger.error('Failed to disconnect from ActivityWatch:', error);
    throw error;
  }
});

// Setup IPC handlers for app settings
ipcMain.handle('settings-get', () => {
  return settingsManager.getAll();
});

ipcMain.handle('settings-set', (_event, partial) => {
  return settingsManager.set(partial);
});

// Application version
ipcMain.handle('app-get-version', () => {
  return app.getVersion();
});