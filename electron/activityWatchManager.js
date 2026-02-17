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
  // Private fields
  #lastHealthCheck = null;
  #healthCheckInterval = null;
  #apiUrl;
  #statusCheckInterval = 60000;
  #executablePath = null;
  #activityWatchProcess = null;
  #operationInProgress = false;
  #serverPort = null;
  #platformPaths;

  // Public fields
  isRunning = false;
  isAvailable = false; // In managed mode: executable found; in unmanaged: same as isRunning

  constructor() {
    this.#apiUrl = settingsManager.get('activityWatchUrl') || DEFAULT_ACTIVITY_WATCH_URL;
    
    this.#platformPaths = {
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
  
  async #findExecutable() {
    logger.info('Looking for ActivityWatch executable...');
    
    try {
      // Check user-configured path first
      const customPath = settingsManager.get('activityWatchPath');
      if (customPath) {
        try {
          await fsPromises.access(customPath, fs.constants.F_OK);
          logger.info(`Using user-configured ActivityWatch path: ${customPath}`);
          this.#executablePath = customPath;
          return { found: true, path: customPath };
        } catch {
          logger.warn(`User-configured ActivityWatch path not found: ${customPath}`);
        }
      }

      // Fall back to platform-specific auto-detection
      const platform = process.platform;
      const possiblePaths = this.#platformPaths[platform] || [];
      
      for (const awPath of possiblePaths) {
        try {
          await fsPromises.access(awPath, fs.constants.F_OK);
          logger.info(`Found ActivityWatch executable at: ${awPath}`);
          this.#executablePath = awPath;
          settingsManager.set({ activityWatchPath: awPath });
          return { found: true, path: awPath };
        } catch (error) {
          continue;
        }
      }
      
      // Also check PATH environment variable
      try {
        const pathResult = await this.#checkPathForExecutable();
        if (pathResult.found) {
          this.#executablePath = pathResult.path;
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

  async #checkPathForExecutable() {
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
      const healthStatus = await this.#checkHealth();
      this.isRunning = healthStatus.running;
      this.#lastHealthCheck = new Date();
      
      if (healthStatus.running) {
        logger.info('ActivityWatch detected and running');
        this.#startHealthMonitoring();
      } else {
        logger.info('ActivityWatch not running');
        const managed = settingsManager.get('manageActivityWatch');
        if (managed) {
          const execResult = await this.#findExecutable();
          this.isAvailable = execResult.found;
        }
      }
    } catch (error) {
      logger.error('Error detecting ActivityWatch:', error);
      this.isRunning = false;
      this.isAvailable = false;
    }
  }
  
  async #checkHealth() {
    return new Promise((resolve) => {
      const request = http.get(`${this.#apiUrl}/api/0/info`, (response) => {
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
  
  async #startActivityWatch() {
    if (this.#operationInProgress) {
      logger.warn('ActivityWatch operation already in progress, skipping start');
      return;
    }
    this.#operationInProgress = true;
    logger.info('Starting ActivityWatch...');
    
    try {
      const health = await this.#checkHealth();
      
      if (health.running) {
        this.isRunning = true;
        this.#startHealthMonitoring();
        await this.#notifyServerPolling(true);
        return;
      }
      
      if (!this.#executablePath) {
        const execResult = await this.#findExecutable();
        if (!execResult.found) {
          throw new Error('ActivityWatch executable not found. Please install ActivityWatch from https://activitywatch.net/');
        }
      }
      
      logger.info(`Starting ActivityWatch from: ${this.#executablePath}`);
      
      this.#activityWatchProcess = spawn(this.#executablePath, [], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      this.#activityWatchProcess.on('error', (error) => {
        logger.error('ActivityWatch process error:', error);
      });
      
      this.#activityWatchProcess.stderr.on('data', (data) => {
        logger.error('ActivityWatch stderr:', data.toString());
      });
      
      this.#activityWatchProcess.on('exit', (code, signal) => {
        logger.info(`ActivityWatch process exited with code ${code}, signal ${signal}`);
      });
      
      this.#activityWatchProcess.unref();
      
      logger.info(`ActivityWatch process started with PID: ${this.#activityWatchProcess.pid}`);
      
      logger.info('Waiting for ActivityWatch to start...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const healthCheck = await this.#checkHealth();
      if (healthCheck.running) {
        this.isRunning = true;
        this.#startHealthMonitoring();
        await this.#notifyServerPolling(true);
        
        logger.info('ActivityWatch started successfully');
      } else {
        throw new Error('ActivityWatch failed to start - API not responding');
      }
      
    } catch (error) {
      logger.error('Failed to start ActivityWatch:', error);
      this.#activityWatchProcess = null;
    } finally {
      this.#operationInProgress = false;
    }
  }
  
  #startHealthMonitoring() {
    if (this.#healthCheckInterval) {
      clearInterval(this.#healthCheckInterval);
    }
    
    this.#healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.#checkHealth();
        const wasRunning = this.isRunning;
        
        this.isRunning = health.running;
        this.#lastHealthCheck = new Date();
        
        if (wasRunning && !health.running) {
          logger.info('ActivityWatch stopped running');
        } else if (!wasRunning && health.running) {
          logger.info('ActivityWatch started running');
        }
        
      } catch (error) {
        logger.error('Health check failed:', error);
        this.isRunning = false;
      }
    }, this.#statusCheckInterval);
  }
  
  setServerPort(port) {
    this.#serverPort = port;
  }

  async #notifyServerPolling(shouldPoll) {
    if (!this.#serverPort) return;
    const endpoint = shouldPoll ? 'resume' : 'pause';
    return new Promise((resolve) => {
      const req = http.request(
        `http://localhost:${this.#serverPort}/api/activity/${endpoint}`,
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

    settingsManager.set({ activityWatchDisconnectedByUser: false });

    if (managed) {
      await this.#startActivityWatch();
      return;
    }
    await this.detectActivityWatch();
    if (this.isRunning) {
      await this.#notifyServerPolling(true);
    }
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

    settingsManager.set({ activityWatchDisconnectedByUser: true });

    if (managed) {
      await this.#stopActivityWatch();
      return;
    }

    this.#stopHealthMonitoring();
    this.isRunning = false;
    await this.#notifyServerPolling(false);
  }

  async #stopActivityWatch() {
    if (this.#operationInProgress) {
      logger.warn('ActivityWatch operation already in progress, skipping stop');
      return;
    }
    this.#operationInProgress = true;
    logger.info('Stopping ActivityWatch...');
    
    this.#stopHealthMonitoring();
    await this.#notifyServerPolling(false);
    
    try {
      if (this.#activityWatchProcess) {
        this.#activityWatchProcess.kill('SIGTERM');
        this.#activityWatchProcess = null;
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const health = await this.#checkHealth();
        this.isRunning = health.running;
        if (health.running) {
          logger.warn('ActivityWatch may still be running from system tray');
        }
      } else {
        this.isRunning = false;
      }
    } catch (error) {
      logger.error('Error stopping ActivityWatch:', error);
    } finally {
      this.#operationInProgress = false;
    }
  }
  
  #stopHealthMonitoring() {
    if (this.#healthCheckInterval) {
      clearInterval(this.#healthCheckInterval);
      this.#healthCheckInterval = null;
    }
  }
  
  /**
   * Cleanup for app quit — stops AW if we started it, without persisting disconnect flag.
   */
  async cleanup() {
    const managed = settingsManager.get('manageActivityWatch');
    if (managed) {
      await this.#stopActivityWatch();
    } else {
      this.#stopHealthMonitoring();
      await this.#notifyServerPolling(false);
    }
  }
  
}

export { ActivityWatchManager };