/**
 * Hook for accessing Electron-specific APIs from the renderer process.
 * Safely handles running in both Electron and browser environments.
 */

export interface AppSettings {};

export interface ElectronAPI {
  // Application info
  getAppVersion: () => Promise<string>;
  getServerPort: () => Promise<number>;
  getLogPath: () => Promise<string>;
  
  // App settings
  getSettings: () => Promise<AppSettings>;
  setSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * Check if running inside Electron
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

/**
 * Get Electron API if available, otherwise undefined
 */
export function useElectron(): ElectronAPI | undefined {
  if (!isElectron()) {
    return undefined;
  }
  return window.electronAPI;
}

