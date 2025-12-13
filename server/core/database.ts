import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "@shared/schema";
import path from "path";

// Initialize SQLite database - now located in server directory
const dbPath = path.resolve(import.meta.dirname, "..", "kairo.db");
const sqlite = new Database(dbPath);

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Export for cleanup
export const closeDatabase = () => sqlite.close();