import { app } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import { logger } from './logger.js';


class DatabaseManager {
  constructor() {
    this.userDatabasePath = path.join(app.getPath('userData'), 'kairo.db');
  }
  
  async initializeDatabase() {
    try {
      logger.info('Initializing database...');
      
      // Ensure user data directory exists
      const userDataDir = app.getPath('userData');
      await fs.mkdir(userDataDir, { recursive: true });
      
      try {
        await fs.access(this.userDatabasePath);
        logger.info('User database found');
      } catch {
        logger.info('New database will be created by server');
      }
      
      logger.info(`Database path: ${this.userDatabasePath}`);
      return { path: this.userDatabasePath, status: 'ready' };
      
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }
  
  getDatabasePath() {
    return this.userDatabasePath;
  }
}

export { DatabaseManager };