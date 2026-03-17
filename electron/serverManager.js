import { spawn } from 'child_process';
import { app, dialog } from 'electron';
import path from 'path';
import net from 'net';
import http from 'http';
import fs from 'fs';
import { logger } from './logger.js';
import { DEFAULT_SERVER_PORT } from '../shared/constants.js';

class ServerManager {
  constructor(databasePath = null) {
    this.serverProcess = null;
    this.serverPort = DEFAULT_SERVER_PORT;
    this.isServerReady = false;
    this.startupTimeout = 15000; // 15 seconds
    this.healthCheckInterval = null;
    this.maxRestartAttempts = 3;
    this.restartAttempts = 0;
    this.databasePath = databasePath;
    this.intentionalStop = false; // Prevents auto-restart on deliberate shutdown
  }

  async findAvailablePort(startPort = DEFAULT_SERVER_PORT) {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.listen(startPort, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });

      server.on('error', () => {
        resolve(this.findAvailablePort(startPort + 1));
      });
    });
  }

  async startServer() {
    try {
      // Find available port
      this.serverPort = await this.findAvailablePort(DEFAULT_SERVER_PORT);
      logger.info(`Starting server on port ${this.serverPort}`);

      const isDev = !app.isPackaged;

      // In dev mode the server is already running externally
      if (isDev) {
        this.serverPort = DEFAULT_SERVER_PORT;
        logger.info(`Dev mode: using externally running server on port ${this.serverPort}`);
        this.isServerReady = true;
        return { port: this.serverPort, status: 'ready', pid: null };
      }

      // Production: use compiled server binary
      const command = path.join(process.resourcesPath, 'server' + (process.platform === 'win32' ? '.exe' : ''));
      if (!fs.existsSync(command)) {
        throw new Error(`Server binary not found: ${command}`);
      }
      const args = [
        '--db', this.databasePath || path.join(process.resourcesPath, 'kairo.db'),
        '--migrations', path.join(process.resourcesPath, 'migrations'),
        '--port', this.serverPort.toString(),
      ];
      const cwd = process.resourcesPath;
      const env = { ...process.env, NODE_ENV: 'production' };

      this.serverProcess = spawn(command, args, {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      logger.info('Server process spawned, setting up event handlers');

      // Setup process event handlers
      this.setupProcessHandlers();

      // Wait for server to be ready
      await this.waitForServerReady();

      // Start health monitoring
      this.startHealthMonitoring();

      logger.info(`Server successfully started on port ${this.serverPort}`);
      this.restartAttempts = 0; // Reset restart attempts on successful start

      return {
        port: this.serverPort,
        status: 'ready',
        pid: this.serverProcess.pid
      };

    } catch (error) {
      logger.error('Failed to start server:', error);
      await this.cleanup();
      throw error;
    }
  }

  setupProcessHandlers() {
    if (!this.serverProcess) return;

    this.serverProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      logger.info(`[Server] ${output}`);

      // Check for server ready indicators
      if (output.includes('Server running on') || output.includes('listening on')) {
        this.isServerReady = true;
      }
    });

    this.serverProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      logger.error(`[Server Error] ${error}`);
    });

    this.serverProcess.on('close', async (code) => {
      logger.info(`Server process exited with code ${code}`);
      this.isServerReady = false;

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Attempt restart only if it wasn't intentionally stopped
      if (this.intentionalStop) {
        this.intentionalStop = false;
        return;
      }
      if (code !== 0 && this.restartAttempts < this.maxRestartAttempts) {
        logger.warn(`Attempting to restart server (attempt ${this.restartAttempts + 1}/${this.maxRestartAttempts})`);
        this.restartAttempts++;

        setTimeout(async () => {
          try {
            await this.startServer();
          } catch (error) {
            logger.error('Server restart failed:', error);
          }
        }, 2000); // Wait 2 seconds before restart
      } else if (code !== 0) {
        // Show error to user if max restart attempts reached
        dialog.showErrorBox(
          'Server Error',
          'Local server stopped unexpectedly and could not be restarted. Please restart the application.'
        );
      }
    });

    this.serverProcess.on('error', (error) => {
      logger.error('Server process error:', error);
      this.isServerReady = false;
    });
  }

  async waitForServerReady(timeout = this.startupTimeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkServer = async () => {
        try {
          // Try to connect to health endpoint
          const response = await this.healthCheck();
          if (response.ok) {
            this.isServerReady = true;
            resolve();
            return;
          }
        } catch (error) {
          // Health check failed, continue waiting
        }

        // Check for timeout
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Server startup timeout after ${timeout}ms`));
          return;
        }

        // Try again after a short delay
        setTimeout(checkServer, 500);
      };

      checkServer();
    });
  }

  async healthCheck() {
    return new Promise((resolve, reject) => {
      const request = http.get(`http://localhost:${this.serverPort}/api/health`, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({
              ok: response.statusCode === 200,
              data: result,
              status: response.statusCode
            });
          } catch (error) {
            resolve({
              ok: false,
              error: 'Invalid JSON response',
              status: response.statusCode
            });
          }
        });
      });

      request.on('error', (error) => {
        resolve({
          ok: false,
          error: error.message,
          status: 0
        });
      });

      request.setTimeout(5000, () => {
        request.destroy();
        resolve({
          ok: false,
          error: 'Request timeout',
          status: 0
        });
      });
    });
  }

  startHealthMonitoring() {
    // Check server health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.healthCheck();
      if (!health.ok) {
        logger.warn('Server health check failed:', health.error);
        this.isServerReady = false;
      } else {
        this.isServerReady = true;
      }
    }, 30000);
  }

  async stopServer() {
    logger.info('Stopping server...');

    // Signal that this is a deliberate stop — suppress auto-restart
    this.intentionalStop = true;

    // Clear health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (!this.serverProcess) {
      logger.info('Server process not running');
      return;
    }

    return new Promise((resolve) => {
      const cleanup = () => {
        this.serverProcess = null;
        this.isServerReady = false;
        this.restartAttempts = 0;
        resolve();
      };

      // Try graceful shutdown first
      this.serverProcess.kill('SIGTERM');

      // Force kill after timeout
      const forceKillTimeout = setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          logger.info('Force killing server process');
          this.serverProcess.kill('SIGKILL');
        }
        cleanup();
      }, 5000);

      this.serverProcess.on('close', () => {
        clearTimeout(forceKillTimeout);
        cleanup();
      });
    });
  }

  async cleanup() {
    await this.stopServer();
  }

}

export { ServerManager };