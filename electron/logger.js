import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Logger {
  constructor() {
    this.logDir = app.getPath('logs');
    this.logFile = path.join(this.logDir, 'kairos.log');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
    
    this.ensureLogDirectory();
  }
  
  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }
  
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    return JSON.stringify(logEntry) + '\n';
  }
  
  writeToFile(formattedMessage) {
    try {
      // Check if log rotation is needed
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.maxLogSize) {
          this.rotateLog();
        }
      }
      
      fs.appendFileSync(this.logFile, formattedMessage);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
  
  rotateLog() {
    try {
      // Rotate existing log files
      for (let i = this.maxLogFiles - 1; i > 0; i--) {
        const oldFile = `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxLogFiles - 1) {
            // Delete the oldest log file
            fs.unlinkSync(oldFile);
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // Move current log to .1
      if (fs.existsSync(this.logFile)) {
        fs.renameSync(this.logFile, `${this.logFile}.1`);
      }
    } catch (error) {
      console.error('Failed to rotate log files:', error);
    }
  }
  
  log(level, message, data = null) {
    const formattedMessage = this.formatMessage(level, message, data);
    
    // Always output to console
    console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    
    // Write to file
    this.writeToFile(formattedMessage);
  }
  
  info(message, data = null) {
    this.log('info', message, data);
  }
  
  warn(message, data = null) {
    this.log('warn', message, data);
  }
  
  error(message, data = null) {
    this.log('error', message, data);
  }
  
  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data);
    }
  }
  
  getLogPath() {
    return this.logFile;
  }
  
  getLogDirectory() {
    return this.logDir;
  }
}

// Create a singleton instance
const logger = new Logger();

export { Logger, logger };