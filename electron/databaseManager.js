import { app } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import { logger } from './logger.js';


class DatabaseManager {
  constructor() {
    this.userDatabasePath = path.join(app.getPath('userData'), 'kairo.db');
    this.isInitialized = false;
  }
  
  async initializeDatabase() {
    try {
      logger.info('Initializing database...');
      
      // Ensure user data directory exists
      const userDataDir = app.getPath('userData');
      await this.ensureDirectoryExists(userDataDir);
      
      const userDbExists = await this.fileExists(this.userDatabasePath);
      logger.info(userDbExists ? 'User database found' : 'New database will be created by server');
      
      // Migrations are handled by Drizzle ORM when the server starts
      this.isInitialized = true;
      logger.info(`Database path: ${this.userDatabasePath}`);
      
      return {
        path: this.userDatabasePath,
        isNew: !userDbExists,
        status: 'ready'
      };
      
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }
  
  async backupDatabase() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        app.getPath('userData'),
        'backups',
        `kairo-backup-${timestamp}.db`
      );
      
      // Ensure backup directory exists
      await this.ensureDirectoryExists(path.dirname(backupPath));
      
      // Copy current database to backup location
      await fs.copyFile(this.userDatabasePath, backupPath);
      
      logger.info(`Database backed up to: ${backupPath}`);
      return backupPath;
      
    } catch (error) {
      logger.error('Database backup failed:', error);
      throw error;
    }
  }
  
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
  
  getDatabasePath() {
    return this.userDatabasePath;
  }
  
  async getDatabaseInfo() {
    try {
      const exists = await this.fileExists(this.userDatabasePath);
      if (!exists) {
        return {
          path: this.userDatabasePath,
          exists: false,
          size: 0,
          lastModified: null
        };
      }
      
      const stats = await fs.stat(this.userDatabasePath);
      return {
        path: this.userDatabasePath,
        exists: true,
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      };
      
    } catch (error) {
      logger.error('Failed to get database info:', error);
      return {
        path: this.userDatabasePath,
        exists: false,
        error: error.message
      };
    }
  }
  
  async cleanupOldBackups(maxBackups = 10) {
    try {
      const backupDir = path.join(app.getPath('userData'), 'backups');
      const backupDirExists = await this.fileExists(backupDir);
      
      if (!backupDirExists) {
        return;
      }
      
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('kairo-backup-') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file)
        }));
      
      if (backupFiles.length <= maxBackups) {
        return;
      }
      
      // Sort by creation time (newest first)
      const filesWithStats = await Promise.all(
        backupFiles.map(async file => {
          const stats = await fs.stat(file.path);
          return { ...file, mtime: stats.mtime };
        })
      );
      
      filesWithStats.sort((a, b) => b.mtime - a.mtime);
      
      // Remove old backups
      const filesToDelete = filesWithStats.slice(maxBackups);
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        logger.info(`Deleted old backup: ${file.name}`);
      }
      
    } catch (error) {
      logger.warn('Failed to cleanup old backups:', error.message);
      // Non-critical error, don't throw
    }
  }
}

export { DatabaseManager };