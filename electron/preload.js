// Preload scripts run in Electron's renderer sandbox which provides its own
// require() polyfill — use CJS here, not ESM import statements.
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Application info
  getAppVersion: () => ipcRenderer.invoke('app-get-version'),
  getServerPort: () => ipcRenderer.invoke('get-server-port'),

  // Database operations
  getDatabaseInfo: () => ipcRenderer.invoke('db-get-info'),
  backupDatabase: () => ipcRenderer.invoke('db-backup'),

  // ActivityWatch integration
  getActivityWatchStatus: () => ipcRenderer.invoke('aw-get-status'),
  startActivityWatch: () => ipcRenderer.invoke('aw-start'),
  stopActivityWatch: () => ipcRenderer.invoke('aw-stop'),

  // App settings
  getSettings: () => ipcRenderer.invoke('settings-get'),
  setSettings: (partial) => ipcRenderer.invoke('settings-set', partial),
});

// Version information
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
});
