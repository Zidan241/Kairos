import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window management
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  getWindowState: () => ipcRenderer.invoke('window-get-state'),
  
  // Application info
  getAppVersion: () => ipcRenderer.invoke('app-get-version'),
  getServerPort: () => ipcRenderer.invoke('app-get-server-port'),
  getServerInfo: () => ipcRenderer.invoke('app-get-server-info'),
  restartServer: () => ipcRenderer.invoke('app-restart-server'),
  
  // Database operations
  getDatabasePath: () => ipcRenderer.invoke('db-get-path'),
  getDatabaseInfo: () => ipcRenderer.invoke('db-get-info'),
  backupDatabase: () => ipcRenderer.invoke('db-backup'),
  
  // ActivityWatch integration
  getActivityWatchStatus: () => ipcRenderer.invoke('aw-get-status'),
  startActivityWatch: () => ipcRenderer.invoke('aw-start'),
  stopActivityWatch: () => ipcRenderer.invoke('aw-stop'),
  restartActivityWatch: () => ipcRenderer.invoke('aw-restart'),
  showActivityWatchInfo: () => ipcRenderer.invoke('aw-show-info'),
  
  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('updater-check'),
  downloadUpdate: () => ipcRenderer.invoke('updater-download'),
  installUpdate: () => ipcRenderer.invoke('updater-install'),
  getUpdateStatus: () => ipcRenderer.invoke('updater-get-status'),
  
  // Event listeners
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', callback),
  onActivityWatchStatus: (callback) => ipcRenderer.on('aw-status-changed', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Version information
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
});