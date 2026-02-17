import { app, BrowserWindow, screen, session, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from './logger.js';
import { DEV_VITE_URL } from '../shared/constants.js';

const __dirname = import.meta.dirname;

const STATE_FILE = 'window-state.json';

class WindowManager {
  constructor() {
    this.mainWindow = null;
  }
  
  createWindow() {
    // Get display dimensions for centering
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    const savedState = this.loadWindowState();
    
    // Calculate centered position if not saved
    if (savedState.x === undefined) {
      savedState.x = Math.round((screenWidth - savedState.width) / 2);
    }
    if (savedState.y === undefined) {
      savedState.y = Math.round((screenHeight - savedState.height) / 2);
    }
    
    this.mainWindow = new BrowserWindow({
      width: savedState.width,
      height: savedState.height,
      x: savedState.x,
      y: savedState.y,
      minWidth: 800,
      minHeight: 600,
      show: false, // Don't show until ready-to-show
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
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
      icon: path.join(__dirname, '../assets/icon.png')
    });
    
    // Restore maximized state
    if (savedState.isMaximized) {
      this.mainWindow.maximize();
    }
    
    // Setup CSP headers for security
    this.setupContentSecurityPolicy();
    
    // Setup window event handlers
    this.setupWindowEventHandlers();
    
    return this.mainWindow;
  }
  
  setupWindowEventHandlers() {
    if (!this.mainWindow) return;
    
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
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  }
  
  setupContentSecurityPolicy() {
    const isDev = process.env.NODE_ENV === 'development';

    // Apply CSP headers to all responses
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const csp = [
        "default-src 'self'",
        // unsafe-inline required only for Vite HMR in dev; omit in production
        isDev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "connect-src 'self' http://localhost:* ws://localhost:*", // API and HMR websocket
      ].join('; ');
      
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [csp]
        }
      });
    });
  }
  
  loadContent(isDevelopment = false) {
    if (!this.mainWindow) return;
    
    if (isDevelopment) {
      // Development: load from Vite dev server with retry
      const viteUrl = DEV_VITE_URL;
      const loadWithRetry = (attemptsLeft = 10) => {
        this.mainWindow.loadURL(viteUrl).catch(err => {
          if (attemptsLeft > 0) {
            logger.info(`Waiting for Vite dev server... (${attemptsLeft} retries left)`);
            setTimeout(() => loadWithRetry(attemptsLeft - 1), 1000);
          } else {
            logger.error('Failed to connect to Vite dev server:', err);
            this.loadFallbackContent();
          }
        });
      };
      loadWithRetry();
      // Open DevTools in development
      this.mainWindow.webContents.openDevTools();
    } else {
      // Production: load built files
      this.mainWindow.loadFile(path.join(__dirname, '../dist/public/index.html')).catch(err => {
        logger.error('Failed to load built files:', err);
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
          <div class="info">Server could not be reached</div>
          <div class="error">Frontend not available</div>
          <p>Please check that the Vite development server is running</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      </body>
      </html>
    `;
    
    this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
  }
  
  isWindowCreated() {
    return this.mainWindow !== null;
  }
  
  // Save window state to disk
  saveWindowState() {
    if (!this.mainWindow) return;
    
    try {
      const bounds = this.mainWindow.getNormalBounds();
      const state = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: this.mainWindow.isMaximized(),
      };
      const statePath = path.join(app.getPath('userData'), STATE_FILE);
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
      logger.info('Window state saved');
    } catch (error) {
      logger.error('Failed to save window state:', error);
    }
  }
  
  // Load window state from disk (or return defaults)
  loadWindowState() {
    const defaults = {
      width: 1200,
      height: 800,
      x: undefined,
      y: undefined,
      isMaximized: false
    };
    
    try {
      const statePath = path.join(app.getPath('userData'), STATE_FILE);
      if (fs.existsSync(statePath)) {
        const saved = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        return { ...defaults, ...saved };
      }
    } catch (error) {
      logger.error('Failed to load window state:', error);
    }
    
    return defaults;
  }
}

export { WindowManager };