// Preload scripts run in Electron's renderer sandbox which provides its own
// require() polyfill — use CJS here, not ESM import statements.
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Application info
  getAppVersion: () => ipcRenderer.invoke('app-get-version'),
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  getLogPath: () => ipcRenderer.invoke('get-log-path'),

  // App settings
  getSettings: () => ipcRenderer.invoke('settings-get'),
  setSettings: (partial) => ipcRenderer.invoke('settings-set', partial),
});
