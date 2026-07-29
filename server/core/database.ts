import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Database } from "bun:sqlite";
import * as schema from "@shared/schema";
import path from "path";
import { getArg } from "../utils/args";


export const dbPath = getArg('--db') || path.resolve(import.meta.dirname, "..", "kairo.db");

export const sqlite = new Database(dbPath);
sqlite.run("PRAGMA foreign_keys = ON");

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Run migrations on startup
const migrationsFolder = getArg('--migrations') || path.resolve(import.meta.dirname, "..", "migrations");
try {
  migrate(db, { migrationsFolder });
  console.log("✅ Database migrations applied");
} catch (error) {
  // A failed migration can leave the app running against an incompatible schema,
  // silently corrupting data. Fail loudly so the process exits and the Electron
  // server manager surfaces the error to the user instead of continuing blindly.
  console.error("❌ Migration failed:", error);
  throw new Error(`Database migration failed: ${error instanceof Error ? error.message : String(error)}`);
}
// Export for cleanup
export const closeDatabase = () => sqlite.close();