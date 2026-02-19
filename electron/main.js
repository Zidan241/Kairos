import { app, dialog, ipcMain, shell } from 'electron';
import { WindowManager } from './windowManager.js';
import { ServerManager } from './serverManager.js';
import { DatabaseManager } from './databaseManager.js';
import { MenuManager } from './menuManager.js';
import { settingsManager } from './settingsManager.js';
import { logger } from './logger.js';

// Keep references to main components
let windowManager;
let serverManager;
let databaseManager;
let menuManager;

// App event handlers
app.whenReady().then(async () => {
  try {
    logger.info('App startup initiated');
    
    // Initialize managers
    windowManager = new WindowManager();
    databaseManager = new DatabaseManager();
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
    
    // Expose server port to renderer
    ipcMain.handle('get-server-port', () => serverInfo.port);
    
    // Create main window
    windowManager.createWindow();
    logger.info('Main window created');
    
    // Load built frontend
    windowManager.loadContent();
    
    // Check for updates (non-blocking)
    checkForUpdates().catch(err => logger.warn('Update check failed:', err.message));
    
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
    windowManager.loadContent();
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
    
    // Gracefully shutdown local server
    if (serverManager) {
      await serverManager.stopServer();
      logger.info('Server stopped');
    }
    
    // All cleanup done — quit for real
    app.quit();
  };
  
  doCleanup().catch((err) => {
    logger.error('Cleanup error, forcing quit:', err);
    app.exit(1);
  });
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

// Manual update checker — works without code signing
async function checkForUpdates() {
  const response = await fetch('https://api.github.com/repos/Zidan241/Kairos/releases/latest');
  if (!response.ok) return;

  const release = await response.json();
  const latest = release.tag_name.replace(/^v/, '');
  const current = app.getVersion();

  if (latest === current) return;

  const { response: button } = await dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `Kairos v${latest} is available (you have v${current}).`,
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1,
  });

  if (button === 0) {
    shell.openExternal(release.html_url);
  }
}