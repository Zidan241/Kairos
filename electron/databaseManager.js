import { app, dialog } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseManager {
  constructor() {
    this.sourceDatabasePath = path.join(__dirname, '../kairo.db');
    this.userDatabasePath = path.join(app.getPath('userData'), 'kairo.db');
    this.isInitialized = false;
  }
  
  async initializeDatabase() {
    try {
      console.log('Initializing database...');
      
      // Ensure user data directory exists
      const userDataDir = app.getPath('userData');
      await this.ensureDirectoryExists(userDataDir);
      
      // Check if user database already exists
      const userDbExists = await this.fileExists(this.userDatabasePath);
      
      if (!userDbExists) {
        console.log('User database not found, checking for bundled database...');
        
        // Check if source database exists in app bundle
        const sourceDbExists = await this.fileExists(this.sourceDatabasePath);
        
        if (sourceDbExists) {
          console.log('Copying bundled database to user directory...');
          await this.copyDatabase();
        } else {
          console.log('No bundled database found, will create new database...');
          // Database will be created by the server when it starts
          // This is normal for first-time installation
        }
      } else {
        console.log('User database found, checking if update needed...');
        await this.checkForDatabaseUpdates();
      }
      
      this.isInitialized = true;
      console.log(`Database initialized at: ${this.userDatabasePath}`);
      
      return {
        path: this.userDatabasePath,
        isNew: !userDbExists,
        status: 'ready'
      };
      
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }
  
  async copyDatabase() {
    try {
      console.log(`Copying database from ${this.sourceDatabasePath} to ${this.userDatabasePath}`);
      
      // Read source database
      const sourceData = await fs.readFile(this.sourceDatabasePath);
      
      // Write to user directory
      await fs.writeFile(this.userDatabasePath, sourceData);
      
      console.log('Database copied successfully');
      
    } catch (error) {
      console.error('Failed to copy database:', error);
      throw new Error(`Database copy failed: ${error.message}`);
    }
  }
  
  async checkForDatabaseUpdates() {
    try {
      // Check if bundled database is newer than user database
      const sourceStats = await fs.stat(this.sourceDatabasePath).catch(() => null);
      const userStats = await fs.stat(this.userDatabasePath);
      
      if (sourceStats && sourceStats.mtime > userStats.mtime) {
        console.log('Bundled database is newer, considering update...');
        
        // For now, we don't automatically update user databases
        // This could be enhanced to handle schema migrations
        console.log('Database update skipped (preserving user data)');
      }
      
    } catch (error) {
      console.warn('Could not check for database updates:', error.message);
      // Non-critical error, continue with existing database
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
      const databaseData = await fs.readFile(this.userDatabasePath);
      await fs.writeFile(backupPath, databaseData);
      
      console.log(`Database backed up to: ${backupPath}`);
      return backupPath;
      
    } catch (error) {
      console.error('Database backup failed:', error);
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
  
  getSourceDatabasePath() {
    return this.sourceDatabasePath;
  }
  
  isReady() {
    return this.isInitialized;
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
      console.error('Failed to get database info:', error);
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
        console.log(`Deleted old backup: ${file.name}`);
      }
      
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error.message);
      // Non-critical error, don't throw
    }
  }
}

export { DatabaseManager };