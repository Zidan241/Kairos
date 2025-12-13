import { BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.windowState = {
      width: 1200,
      height: 800,
      x: undefined,
      y: undefined,
      isMaximized: false,
      isMinimized: false
    };
    
    this.setupIpcHandlers();
  }
  
  createWindow() {
    // Get display dimensions for centering
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Calculate centered position if not saved
    if (this.windowState.x === undefined) {
      this.windowState.x = Math.round((screenWidth - this.windowState.width) / 2);
    }
    if (this.windowState.y === undefined) {
      this.windowState.y = Math.round((screenHeight - this.windowState.height) / 2);
    }
    
    this.mainWindow = new BrowserWindow({
      width: this.windowState.width,
      height: this.windowState.height,
      x: this.windowState.x,
      y: this.windowState.y,
      minWidth: 800,
      minHeight: 600,
      show: false, // Don't show until ready-to-show
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        // Security settings
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false
      },
      // macOS specific settings
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      // Window styling
      frame: true,
      transparent: false,
      backgroundColor: '#ffffff',
      // Icon
      icon: path.join(__dirname, '../assets/icon.png') // TODO: Add app icon
    });
    
    // Restore maximized state
    if (this.windowState.isMaximized) {
      this.mainWindow.maximize();
    }
    
    // Setup window event handlers
    this.setupWindowEventHandlers();
    
    return this.mainWindow;
  }
  
  setupWindowEventHandlers() {
    if (!this.mainWindow) return;
    
    // Save window state on resize/move
    this.mainWindow.on('resize', () => {
      if (!this.mainWindow.isMaximized()) {
        const bounds = this.mainWindow.getBounds();
        this.windowState.width = bounds.width;
        this.windowState.height = bounds.height;
      }
    });
    
    this.mainWindow.on('move', () => {
      if (!this.mainWindow.isMaximized()) {
        const bounds = this.mainWindow.getBounds();
        this.windowState.x = bounds.x;
        this.windowState.y = bounds.y;
      }
    });
    
    this.mainWindow.on('maximize', () => {
      this.windowState.isMaximized = true;
    });
    
    this.mainWindow.on('unmaximize', () => {
      this.windowState.isMaximized = false;
    });
    
    this.mainWindow.on('minimize', () => {
      this.windowState.isMinimized = true;
    });
    
    this.mainWindow.on('restore', () => {
      this.windowState.isMinimized = false;
    });
    
    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // Focus on the window (useful on Windows/Linux)
      if (process.platform !== 'darwin') {
        this.mainWindow.focus();
      }
    });
    
    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
    
    // Prevent navigation to external URLs
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      // Allow navigation within the app
      if (!url.startsWith('http://localhost:') && !url.startsWith('file://')) {
        event.preventDefault();
      }
    });
    
    // Prevent new window creation
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      // Open external links in default browser
      if (url.startsWith('http://') || url.startsWith('https://')) {
        import('electron').then(({ shell }) => shell.openExternal(url));
      }
      return { action: 'deny' };
    });
  }
  
  setupIpcHandlers() {
    // Window control handlers
    ipcMain.handle('window-minimize', () => {
      if (this.mainWindow) {
        this.mainWindow.minimize();
      }
    });
    
    ipcMain.handle('window-maximize', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMaximized()) {
          this.mainWindow.unmaximize();
        } else {
          this.mainWindow.maximize();
        }
      }
    });
    
    ipcMain.handle('window-close', () => {
      if (this.mainWindow) {
        this.mainWindow.close();
      }
    });
    
    // Window state handlers
    ipcMain.handle('window-get-state', () => {
      return {
        ...this.windowState,
        isMaximized: this.mainWindow?.isMaximized() || false,
        isMinimized: this.mainWindow?.isMinimized() || false,
        isFocused: this.mainWindow?.isFocused() || false
      };
    });
  }
  
  loadContent(isDevelopment = false) {
    if (!this.mainWindow) return;
    
    if (isDevelopment) {
      // Development: load from Vite dev server
      // Wait a moment for Vite dev server to be ready
      setTimeout(() => {
        this.mainWindow.loadURL('http://localhost:5173').catch(err => {
          console.error('Failed to load Vite dev server:', err);
          // Fallback: try to load a simple HTML page
          this.loadFallbackContent();
        });
        // Open DevTools in development
        this.mainWindow.webContents.openDevTools();
      }, 2000);
    } else {
      // Production: load built files
      this.mainWindow.loadFile(path.join(__dirname, '../client/dist/index.html')).catch(err => {
        console.error('Failed to load built files:', err);
        this.loadFallbackContent();
      });
    }
  }
  
  loadFallbackContent() {
    if (!this.mainWindow) return;
    
    // Simple fallback content
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kairos Desktop</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .container { max-width: 600px; margin: 0 auto; }
          .error { color: #d32f2f; margin: 20px 0; }
          .info { color: #1976d2; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Kairos Desktop</h1>
          <div class="info">Server is running on port 3000</div>
          <div class="error">Frontend not available</div>
          <p>Please check that the Vite development server is running on port 5173</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      </body>
      </html>
    `;
    
    this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
  }
  
  getWindow() {
    return this.mainWindow;
  }
  
  isWindowCreated() {
    return this.mainWindow !== null;
  }
  
  focus() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
    }
  }
  
  // Save window state (called before app quit)
  saveWindowState() {
    // TODO: Implement persistent storage of window state
    // This could save to a config file or electron-store
    console.log('Saving window state:', this.windowState);
  }
  
  // Load window state (called during initialization)
  loadWindowState() {
    // TODO: Implement loading of saved window state
    // This could load from a config file or electron-store
    console.log('Loading window state...');
  }
}

export { WindowManager };