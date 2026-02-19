import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Database } from "bun:sqlite";
import * as schema from "@shared/schema";
import path from "path";

// Database path: use DATABASE_PATH env var (set by Electron) or default to server directory
export const dbPath = process.env.DATABASE_PATH || path.resolve(import.meta.dirname, "..", "kairo.db");
export const sqlite = new Database(dbPath);

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Run migrations on startup
// In production (compiled binary), MIGRATIONS_PATH env var points to Resources/migrations/
// In development, resolve relative to source
const migrationsFolder = process.env.MIGRATIONS_PATH || path.resolve(import.meta.dirname, "..", "migrations");
try {
  migrate(db, { migrationsFolder });
  console.log("✅ Database migrations applied");
} catch (error) {
  console.error("❌ Migration failed:", error);
  // Don't crash - the app may still work with an existing schema
}

// Export for cleanup
export const closeDatabase = () => sqlite.close();