import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { app, dialog, ipcMain } from 'electron';

class UpdateManager {
  constructor(windowManager) {
    this.windowManager = windowManager;
    this.isUpdateAvailable = false;
    this.isUpdateDownloaded = false;
    this.isChecking = false;
    this.updateInfo = null;
    
    this.setupAutoUpdater();
    // IPC handlers are setup in main.js, not here
  }
  
  setupAutoUpdater() {
    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download, ask user first
    autoUpdater.autoInstallOnAppQuit = true;
    
    // Event listeners
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.isChecking = true;
      this.sendStatusToRenderer('checking');
    });
    
    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      this.isUpdateAvailable = true;
      this.isChecking = false;
      this.updateInfo = info;
      this.sendStatusToRenderer('available', info);
      this.showUpdateAvailableDialog(info);
    });
    
    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
      this.isUpdateAvailable = false;
      this.isChecking = false;
      this.sendStatusToRenderer('not-available', info);
    });
    
    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
      this.isChecking = false;
      this.sendStatusToRenderer('error', { message: err.message });
      this.showUpdateErrorDialog(err);
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
      const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      console.log(logMessage);
      this.sendStatusToRenderer('downloading', progressObj);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      this.isUpdateDownloaded = true;
      this.sendStatusToRenderer('downloaded', info);
      this.showUpdateDownloadedDialog(info);
    });
  }
  
  // IPC handlers are setup in main.js to avoid duplicate registrations
  
  async checkForUpdates(showNoUpdateDialog = false) {
    try {
      if (this.isChecking) {
        return { status: 'already-checking' };
      }
      
      console.log('Manually checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      
      if (showNoUpdateDialog && !this.isUpdateAvailable) {
        // Show dialog only if explicitly requested and no update available
        setTimeout(() => {
          if (!this.isUpdateAvailable) {
            dialog.showMessageBox({
              type: 'info',
              title: 'No Updates',
              message: 'You are running the latest version of Kairos.',
              buttons: ['OK']
            });
          }
        }, 2000);
      }
      
      return { status: 'checking', result };
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw error;
    }
  }
  
  async downloadUpdate() {
    try {
      if (!this.isUpdateAvailable) {
        throw new Error('No update available to download');
      }
      
      if (this.isUpdateDownloaded) {
        return { status: 'already-downloaded' };
      }
      
      console.log('Starting update download...');
      await autoUpdater.downloadUpdate();
      return { status: 'downloading' };
    } catch (error) {
      console.error('Error downloading update:', error);
      throw error;
    }
  }
  
  installUpdate() {
    if (!this.isUpdateDownloaded) {
      throw new Error('No update downloaded to install');
    }
    
    console.log('Installing update...');
    autoUpdater.quitAndInstall();
    return { status: 'installing' };
  }
  
  getUpdateStatus() {
    return {
      isChecking: this.isChecking,
      isUpdateAvailable: this.isUpdateAvailable,
      isUpdateDownloaded: this.isUpdateDownloaded,
      updateInfo: this.updateInfo
    };
  }
  
  sendStatusToRenderer(status, data = null) {
    const mainWindow = this.windowManager?.getWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status, data });
    }
  }
  
  showUpdateAvailableDialog(info) {
    const mainWindow = this.windowManager?.getWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version of Kairos is available (${info.version})`,
      detail: `Current version: ${app.getVersion()}\nNew version: ${info.version}\n\nWould you like to download it now?`,
      buttons: ['Download Now', 'Download Later', 'Skip This Version'],
      defaultId: 0,
      cancelId: 1
    });
    
    switch (response) {
      case 0: // Download Now
        this.downloadUpdate().catch(err => {
          console.error('Failed to download update:', err);
        });
        break;
      case 1: // Download Later
        console.log('User chose to download later');
        break;
      case 2: // Skip This Version
        console.log('User chose to skip this version');
        // TODO: Implement version skipping logic
        break;
    }
  }
  
  showUpdateDownloadedDialog(info) {
    const mainWindow = this.windowManager?.getWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Update Downloaded',
      message: `Update to version ${info.version} has been downloaded.`,
      detail: 'The update will be installed when you restart the application.\n\nWould you like to restart now?',
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0,
      cancelId: 1
    });
    
    if (response === 0) {
      this.installUpdate();
    }
  }
  
  showUpdateErrorDialog(error) {
    const mainWindow = this.windowManager?.getWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: 'Failed to check for updates',
      detail: `Error: ${error.message}\n\nPlease check your internet connection and try again later.`,
      buttons: ['OK']
    });
  }
  
  // Enable auto-check on startup (call this after app is ready)
  enableAutoCheck(intervalHours = 24) {
    // Check for updates on startup (after a delay)
    setTimeout(() => {
      this.checkForUpdates(false);
    }, 30000); // Wait 30 seconds after startup
    
    // Set up periodic checks
    if (intervalHours > 0) {
      setInterval(() => {
        this.checkForUpdates(false);
      }, intervalHours * 60 * 60 * 1000);
    }
  }
  
  // Manual update check (typically triggered from menu)
  async manualUpdateCheck() {
    return await this.checkForUpdates(true);
  }
}

export { UpdateManager };