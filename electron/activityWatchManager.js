import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import os from 'os';
import { logger } from './logger.js';
import { settingsManager } from './settingsManager.js';
import { DEFAULT_ACTIVITY_WATCH_URL } from '../shared/constants.js';

class ActivityWatchManager {
  constructor() {
    this.isAvailable = false;
    this.isRunning = false;
    this.lastHealthCheck = null;
    this.healthCheckInterval = null;
    this.apiUrl = settingsManager.get('activityWatchUrl') || DEFAULT_ACTIVITY_WATCH_URL;
    this.statusCheckInterval = 30000; // Check every 30 seconds
    this.executablePath = null;
    this.activityWatchProcess = null;
    this._operationInProgress = false;
    this.serverPort = null;
    
    // Platform-specific paths where ActivityWatch might be installed
    this.platformPaths = {
      win32: [
        path.join(os.homedir(), 'AppData', 'Local','Programs', 'ActivityWatch', 'aw-qt.exe'),
      ],
      darwin: [
        '/Applications/ActivityWatch.app/Contents/MacOS/aw-qt',
        path.join(os.homedir(), 'Applications', 'ActivityWatch.app', 'Contents', 'MacOS', 'aw-qt'),
        '/usr/local/bin/aw-qt',
        path.join(os.homedir(), '.local', 'bin', 'aw-qt')
      ],
      linux: [
        '/usr/bin/aw-qt',
        '/usr/local/bin/aw-qt',
        path.join(os.homedir(), '.local', 'bin', 'aw-qt'),
        path.join(os.homedir(), 'ActivityWatch', 'aw-qt'),
        path.join(os.homedir(), 'activitywatch', 'aw-qt')
      ]
    };
  }
  
  async findExecutable() {
    logger.info('Looking for ActivityWatch executable...');
    
    try {
      // Check user-configured path first
      const customPath = settingsManager.get('activityWatchPath');
      if (customPath) {
        try {
          await fsPromises.access(customPath, fs.constants.F_OK);
          logger.info(`Using user-configured ActivityWatch path: ${customPath}`);
          this.executablePath = customPath;
          return { found: true, path: customPath };
        } catch {
          logger.warn(`User-configured ActivityWatch path not found: ${customPath}`);
        }
      }

      // Fall back to platform-specific auto-detection
      const platform = process.platform;
      const possiblePaths = this.platformPaths[platform] || [];
      
      for (const awPath of possiblePaths) {
        try {
          // Check if file exists
          await fsPromises.access(awPath, fs.constants.F_OK);
          logger.info(`Found ActivityWatch executable at: ${awPath}`);
          this.executablePath = awPath;
          settingsManager.set({ activityWatchPath: awPath });
          return { found: true, path: awPath };
        } catch (error) {
          // File doesn't exist, continue checking
          continue;
        }
      }
      
      // Also check PATH environment variable
      try {
        const pathResult = await this.checkPathForExecutable();
        if (pathResult.found) {
          this.executablePath = pathResult.path;
          settingsManager.set({ activityWatchPath: pathResult.path });
          return pathResult;
        }
      } catch (error) {
        logger.info('aw-qt not found in PATH');
      }
      
      logger.info('ActivityWatch executable not found');
      return { found: false, path: null };
      
    } catch (error) {
      logger.error('Error finding ActivityWatch executable:', error);
      return { found: false, path: null, error: error.message };
    }
  }

  async checkPathForExecutable() {
    return new Promise((resolve) => {
      const command = process.platform === 'win32' ? 'where' : 'which';
      const child = spawn(command, ['aw-qt'], { stdio: 'pipe' });
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const awPath = output.trim().split('\n')[0]; // Take first result
          logger.info(`Found aw-qt in PATH: ${awPath}`);
          resolve({ found: true, path: awPath });
        } else {
          resolve({ found: false, path: null });
        }
      });
      
      child.on('error', () => {
        resolve({ found: false, path: null });
      });
    });
  }

  async detectActivityWatch() {
    logger.info('Detecting ActivityWatch via API...');
    
    try {
      // First check if it's already running via API
      const healthStatus = await this.checkHealth();
      this.isRunning = healthStatus.running;
      this.lastHealthCheck = new Date();
      
      if (healthStatus.running) {
        this.isAvailable = true;
        logger.info('ActivityWatch detected and running');
        this.startHealthMonitoring();
        // Still find the executable path so settings has it
        if (!this.executablePath) {
          await this.findExecutable();
        }
      } else {
        logger.info('ActivityWatch not running, checking for executable...');
        // If not running, check if we can find the executable
        const execResult = await this.findExecutable();
        this.isAvailable = execResult.found;
        
        if (execResult.found) {
            logger.info('ActivityWatch executable found but not running');
        } else {
            logger.warn('ActivityWatch executable not found on system');
        }
      }
      
      return {
        installed: this.isAvailable,
        running: this.isRunning,
        executablePath: this.executablePath,
        apiUrl: this.apiUrl
      };
      
    } catch (error) {
      logger.error('Error detecting ActivityWatch:', error);
      this.isAvailable = false;
      this.isRunning = false;
      return { 
        installed: false, 
        running: false, 
        error: error.message 
      };
    }
  }
  
  async checkHealth() {
    return new Promise((resolve) => {
      const request = http.get(`${this.apiUrl}/api/0/info`, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            if (response.statusCode === 200) {
              const info = JSON.parse(data);
              resolve({
                available: true,
                running: true,
                info: info,
                status: response.statusCode
              });
            } else {
              resolve({
                available: false,
                running: false,
                status: response.statusCode
              });
            }
          } catch (error) {
            resolve({
              available: false,
              running: false,
              error: 'Invalid JSON response',
              status: response.statusCode
            });
          }
        });
      });
      
      request.on('error', (error) => {
        resolve({
          available: false,
          running: false,
          error: error.message,
          status: 0
        });
      });
      
      request.setTimeout(5000, () => {
        request.destroy();
        resolve({
          available: false,
          running: false,
          error: 'Request timeout',
          status: 0
        });
      });
    });
  }
  
  async startActivityWatch() {
    if (this._operationInProgress) {
      logger.warn('ActivityWatch operation already in progress, skipping start');
      return { status: 'busy', message: 'An operation is already in progress' };
    }
    this._operationInProgress = true;
    logger.info('Starting ActivityWatch...');
    
    try {
      // First check if it's already running
      const health = await this.checkHealth();
      
      if (health.running) {
        this.isAvailable = true;
        this.isRunning = true;
        this.startHealthMonitoring();
        return { 
          status: 'already_running', 
          message: 'ActivityWatch is already running' 
        };
      }
      
      // If not running, try to find and start the executable
      if (!this.executablePath) {
        const execResult = await this.findExecutable();
        if (!execResult.found) {
          throw new Error('ActivityWatch executable not found. Please install ActivityWatch from https://activitywatch.net/');
        }
      }
      
      logger.info(`Starting ActivityWatch from: ${this.executablePath}`);
      
      // Start ActivityWatch using aw-qt (tray icon manager)
      this.activityWatchProcess = spawn(this.executablePath, [], {
        detached: true, // Allow process to continue after parent exits
        stdio: ['ignore', 'pipe', 'pipe'] // Capture stderr for debugging
      });
      
      // Add error handling for the process
      this.activityWatchProcess.on('error', (error) => {
        logger.error('ActivityWatch process error:', error);
      });
      
      this.activityWatchProcess.stderr.on('data', (data) => {
        logger.error('ActivityWatch stderr:', data.toString());
      });
      
      this.activityWatchProcess.on('exit', (code, signal) => {
        logger.info(`ActivityWatch process exited with code ${code}, signal ${signal}`);
      });
      
      // Unref so the child process doesn't keep the parent alive
      this.activityWatchProcess.unref();
      
      logger.info(`ActivityWatch process started with PID: ${this.activityWatchProcess.pid}`);
      
      // Wait a moment for ActivityWatch to start
      logger.info('Waiting for ActivityWatch to start...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if it started successfully
      const healthCheck = await this.checkHealth();
      if (healthCheck.running) {
        this.isAvailable = true;
        this.isRunning = true;
        this.startHealthMonitoring();
        await this.notifyServerPolling(true);
        
        logger.info('ActivityWatch started successfully');
        return { 
          status: 'started', 
          message: 'ActivityWatch started successfully',
          pid: this.activityWatchProcess.pid
        };
      } else {
        throw new Error('ActivityWatch failed to start - API not responding');
      }
      
    } catch (error) {
      logger.error('Failed to start ActivityWatch:', error);
      this.activityWatchProcess = null;
      return {
        status: 'error',
        message: error.message || 'Failed to start ActivityWatch'
      };
    } finally {
      this._operationInProgress = false;
    }
  }
  
  startHealthMonitoring() {
    // Clear any existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Check ActivityWatch health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        const wasRunning = this.isRunning;
        
        this.isAvailable = health.available;
        this.isRunning = health.running;
        this.lastHealthCheck = new Date();
        
        // Log status changes
        if (wasRunning && !health.running) {
          logger.info('ActivityWatch stopped running');
        } else if (!wasRunning && health.running) {
          logger.info('ActivityWatch started running');
        }
        
      } catch (error) {
        logger.error('Health check failed:', error);
        this.isRunning = false;
        this.isAvailable = false;
      }
    }, this.statusCheckInterval);
  }
  
  /**
   * Set the server port so we can notify the server to pause/resume polling.
   */
  setServerPort(port) {
    this.serverPort = port;
  }

  /**
   * Tell the server to pause or resume its ActivityWatch polling.
   */
  async notifyServerPolling(shouldPoll) {
    if (!this.serverPort) return;
    const endpoint = shouldPoll ? 'resume' : 'pause';
    return new Promise((resolve) => {
      const req = http.request(
        `http://localhost:${this.serverPort}/api/activity/${endpoint}`,
        { method: 'POST' },
        (res) => {
          res.resume();
          res.on('end', () => resolve());
        }
      );
      req.on('error', (err) => {
        logger.warn(`Failed to ${endpoint} server polling:`, err.message);
        resolve();
      });
      req.end();
    });
  }

  /**
   * Connect to ActivityWatch.
   * If manageActivityWatch is enabled, starts the AW process.
   * Otherwise, just detects and monitors an already-running instance.
   * Also resumes server-side polling.
   */
  async connect() {
    const managed = settingsManager.get('manageActivityWatch');
    logger.info(`Connecting to ActivityWatch (managed: ${managed})...`);

    if (managed) {
      return await this.startActivityWatch();
    }
    const result = await this.detectActivityWatch();
    if (result.running) {
      await this.notifyServerPolling(true);
    }
    return result;
  }

  /**
   * Disconnect from ActivityWatch.
   * If manageActivityWatch is enabled, stops the AW process.
   * Otherwise, stops health monitoring so we no longer read from it.
   * Also pauses server-side polling.
   */
  async disconnect() {
    const managed = settingsManager.get('manageActivityWatch');
    logger.info(`Disconnecting from ActivityWatch (managed: ${managed})...`);

    if (managed) {
      return await this.stopActivityWatch();
    }

    this.stopHealthMonitoring();
    this.isRunning = false;
    await this.notifyServerPolling(false);
    return { status: 'disconnected', message: 'Disconnected from ActivityWatch' };
  }

  async stopActivityWatch() {
    if (this._operationInProgress) {
      logger.warn('ActivityWatch operation already in progress, skipping stop');
      return { status: 'busy', message: 'An operation is already in progress' };
    }
    this._operationInProgress = true;
    logger.info('Stopping ActivityWatch...');
    
    // Stop health monitoring
    this.stopHealthMonitoring();
    await this.notifyServerPolling(false);
    
    try {
      if (this.activityWatchProcess) {
        // Try to kill the process we started
        this.activityWatchProcess.kill('SIGTERM');
        this.activityWatchProcess = null;
        
        // Wait a moment and check if it stopped
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const health = await this.checkHealth();
        if (!health.running) {
          this.isRunning = false;
          return { 
            status: 'stopped', 
            message: 'ActivityWatch stopped successfully' 
          };
        } else {
          // Process didn't respond to SIGTERM — disconnect anyway
          this.isRunning = false;
          return { 
            status: 'still_running', 
            message: 'ActivityWatch may still be running from system tray. Check your system tray icon.' 
          };
        }
      } else {
        // AW wasn't started by us — can't kill it, just disconnect
        this.isRunning = false;
        return { 
          status: 'disconnected', 
          message: 'ActivityWatch was not started by Kairos. Disconnected from monitoring. Stop it manually from your system tray if needed.' 
        };
      }
    } catch (error) {
      logger.error('Error stopping ActivityWatch:', error);
      return { 
        status: 'error', 
        message: 'Failed to stop ActivityWatch. Please stop it manually from system tray.' 
      };
    } finally {
      this._operationInProgress = false;
    }
  }
  
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  
  getStatus() {
    return {
      available: this.isAvailable,
      running: this.isRunning,
      apiUrl: this.apiUrl,
      executablePath: this.executablePath,
      lastHealthCheck: this.lastHealthCheck,
      isMonitoring: this.healthCheckInterval !== null,
      managedByKairos: this.activityWatchProcess !== null,
      pid: this.activityWatchProcess?.pid || null
    };
  }
  
}

export { ActivityWatchManager };