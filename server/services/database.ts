import { type DatabaseInfo } from "@shared/types";
import { dbPath, sqlite } from "../core/database";
import fs from "fs";
import path from "path";

// Returns database file stats and last backup timestamp.
export function getDatabaseInfo(): DatabaseInfo {
  const backupDir = path.join(path.dirname(dbPath), "backups");
  let lastBackup: string | null = null;

  try {
    const files = fs.readdirSync(backupDir)
      .filter((f: string) => f.startsWith("kairo-backup-") && f.endsWith(".db"));
    if (files.length > 0) {
      files.sort().reverse();
      const stat = fs.statSync(path.join(backupDir, files[0]));
      lastBackup = stat.mtime.toISOString();
    }
  } catch { /* No backups directory yet */ }

  try {
    const stats = fs.statSync(dbPath);
    return { path: dbPath, exists: true, size: stats.size, lastModified: stats.mtime.toISOString(), lastBackup };
  } catch {
    return { path: dbPath, exists: false, size: 0, lastModified: null, lastBackup };
  }
}

// Serializes a full database snapshot to the backups/ directory.
export function createBackup(): { path: string } {
  const backupDir = path.join(path.dirname(dbPath), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `kairo-backup-${timestamp}.db`);
  const snapshot = sqlite.serialize();
  fs.writeFileSync(backupPath, snapshot);
  return { path: backupPath };
}
