/**
 * Hook for accessing Electron-specific APIs from the renderer process.
 * Safely handles running in both Electron and browser environments.
 */

export interface AppSettings {
  manageActivityWatch: boolean;
  activityWatchPath: string;
  activityWatchUrl: string;
  activityWatchDisconnectedByUser: boolean;
}

export interface ElectronAPI {
  // Application info
  getAppVersion: () => Promise<string>;
  getServerPort: () => Promise<number>;
  
  // Database operations
  getDatabaseInfo: () => Promise<{
    path: string;
    exists: boolean;
    size: number;
    lastModified: string | null;
  }>;
  backupDatabase: () => Promise<string>;
  
  // ActivityWatch integration
  getActivityWatchStatus: () => Promise<{ available: boolean; running: boolean }>;
  startActivityWatch: () => Promise<{ success: boolean }>;
  stopActivityWatch: () => Promise<{ success: boolean }>;
  
  // App settings
  getSettings: () => Promise<AppSettings>;
  setSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    versions?: {
      node: () => string;
      chrome: () => string;
      electron: () => string;
    };
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

/**
 * Get version information (only available in Electron)
 */
export function useVersions() {
  if (typeof window === 'undefined' || !window.versions) {
    return null;
  }
  return {
    node: window.versions.node(),
    chrome: window.versions.chrome(),
    electron: window.versions.electron(),
  };
}
