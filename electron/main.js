import { app, dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WindowManager } from './windowManager.js';
import { ServerManager } from './serverManager.js';
import { DatabaseManager } from './databaseManager.js';
import { ActivityWatchManager } from './activityWatchManager.js';
import { UpdateManager } from './updateManager.js';
import { logger } from './logger.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep references to main components
let windowManager;
let serverManager;
let databaseManager;
let activityWatchManager;
let updateManager;

// Enable live reload for development (will be loaded after app is ready)
let enableLiveReload = false;
if (process.env.NODE_ENV === 'development') {
  enableLiveReload = true;
}

// Server management is now handled by ServerManager class

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
    
    // Check ActivityWatch availability (non-blocking)
    const awStatus = await activityWatchManager.detectActivityWatch();
    logger.info('ActivityWatch status:', awStatus);
    
    // Create main window
    const mainWindow = windowManager.createWindow();
    logger.info('Main window created');
    
    // Load content based on environment
    const isDev = process.env.NODE_ENV !== 'production';
    logger.info('Loading content in development mode:', isDev);
    windowManager.loadContent(isDev);
    
    // Setup auto-updater (only in production)
    if (!isDev) {
      updateManager = new UpdateManager(windowManager);
      updateManager.enableAutoCheck(24); // Check every 24 hours
      logger.info('Auto-updater enabled with 24-hour check interval');
    }
    
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
    const isDev = process.env.NODE_ENV === 'development';
    windowManager.loadContent(isDev);
  }
});

app.on('before-quit', async () => {
  logger.info('App quit initiated - performing cleanup');
  
  // Save window state
  if (windowManager) {
    windowManager.saveWindowState();
    logger.info('Window state saved');
  }
  
  // Stop ActivityWatch if we started it
  if (activityWatchManager) {
    try {
      await activityWatchManager.stopActivityWatch();
      logger.info('ActivityWatch stopped successfully');
    } catch (error) {
      logger.error('Error stopping ActivityWatch:', error);
    }
  }
  
  // Gracefully shutdown local server
  if (serverManager) {
    await serverManager.stopServer();
  }
  
  // Cleanup old database backups
  if (databaseManager) {
    await databaseManager.cleanupOldBackups();
  }
});

// Setup IPC handlers for server management
ipcMain.handle('app-get-server-port', () => {
  return serverManager?.getServerInfo()?.port || 3000;
});

ipcMain.handle('app-get-server-info', () => {
  return serverManager?.getServerInfo() || { port: 3000, isReady: false, isRunning: false };
});

ipcMain.handle('app-restart-server', async () => {
  if (serverManager) {
    try {
      return await serverManager.restartServer();
    } catch (error) {
      console.error('Server restart failed:', error);
      throw error;
    }
  }
  throw new Error('Server manager not initialized');
});

// Setup IPC handlers for database management
ipcMain.handle('db-get-path', () => {
  return databaseManager?.getDatabasePath();
});

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
      console.error('Database backup failed:', error);
      throw error;
    }
  }
  throw new Error('Database manager not initialized');
});

// Setup IPC handlers for ActivityWatch management
ipcMain.handle('aw-get-status', () => {
  return activityWatchManager?.getStatus() || { available: false, running: false };
});

ipcMain.handle('aw-start', async () => {
  if (activityWatchManager) {
    try {
      return await activityWatchManager.startActivityWatch();
    } catch (error) {
      console.error('Failed to start ActivityWatch:', error);
      throw error;
    }
  }
  throw new Error('ActivityWatch manager not initialized');
});

ipcMain.handle('aw-stop', async () => {
  if (activityWatchManager) {
    try {
      return await activityWatchManager.stopActivityWatch();
    } catch (error) {
      console.error('Failed to stop ActivityWatch:', error);
      throw error;
    }
  }
  throw new Error('ActivityWatch manager not initialized');
});

ipcMain.handle('aw-restart', async () => {
  if (activityWatchManager) {
    try {
      return await activityWatchManager.restartActivityWatch();
    } catch (error) {
      console.error('Failed to restart ActivityWatch:', error);
      throw error;
    }
  }
  throw new Error('ActivityWatch manager not initialized');
});

ipcMain.handle('aw-show-info', () => {
  if (activityWatchManager) {
    activityWatchManager.showActivityWatchInfo();
  }
});

// Setup IPC handlers for auto-updater
ipcMain.handle('app-get-version', () => {
  return app.getVersion();
});

ipcMain.handle('updater-check', async () => {
  if (updateManager) {
    return await updateManager.manualUpdateCheck();
  }
  throw new Error('Update manager not available in development mode');
});

ipcMain.handle('updater-download', async () => {
  if (updateManager) {
    return await updateManager.downloadUpdate();
  }
  throw new Error('Update manager not available in development mode');
});

ipcMain.handle('updater-install', () => {
  if (updateManager) {
    return updateManager.installUpdate();
  }
  throw new Error('Update manager not available in development mode');
});

ipcMain.handle('updater-get-status', () => {
  if (updateManager) {
    return updateManager.getUpdateStatus();
  }
  return { isChecking: false, isUpdateAvailable: false, isUpdateDownloaded: false, updateInfo: null };
});

// Export for use in other modules
export {
  windowManager,
  serverManager,
  databaseManager,
  activityWatchManager,
  updateManager
};

export const getMainWindow = () => windowManager?.getWindow();
export const getServerPort = () => serverManager?.getServerInfo()?.port;
export const getWindowManager = () => windowManager;
export const getServerManager = () => serverManager;
export const getDatabaseManager = () => databaseManager;
export const getActivityWatchManager = () => activityWatchManager;
export const getUpdateManager = () => updateManager;