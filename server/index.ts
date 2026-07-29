import express, { type Request, Response } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./core/static";
import { setupLoggingMiddleware, setupErrorHandler } from "./core/middleware";
import "./services/activity/nodeActivityWatch"; // Start ActivityWatch service
import { DEFAULT_SERVER_PORT } from "../shared/constants.js";
import { getArg } from "./utils/args";
import { getActiveSubtask, updateSubtask } from "./services/subtasks";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Restrict cross-origin requests to the Electron renderer (file:// -> Origin "null")
// and local dev servers. Requests with no Origin (same-origin, health checks) are
// allowed. Any real remote website origin (http(s)://...) is rejected so arbitrary
// pages a user visits cannot reach this local API.
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin || origin === "null") return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    callback(null, isAllowedOrigin(origin));
  },
}));

// Setup request logging middleware
app.use(setupLoggingMiddleware());

(async () => {
  const server = await registerRoutes(app);

  // Setup error handling middleware
  app.use(setupErrorHandler());

  // App-level guard to prevent any unhandled /api/* requests from falling through to Vite
  app.all("/api/*", (_req: Request, res: Response) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Static file serving / dev server setup
  // - Compiled binary (Electron): skip — Electron loads the UI directly
  // - Development: setup Vite dev server for HMR
  // - Production from source: serve built client files
  // Bun compiled binaries report virtual paths:
  // - Unix:     /$bunfs/root/...
  // - Windows:  B/~BUN/root/...
  const dir = import.meta.dirname ?? '';
  const isCompiled = dir.startsWith('/$bunfs') || dir.includes('~BUN');
  if (isCompiled) {
    // No-op: Electron's BrowserWindow loads the client
  } else if (app.get("env") === "development") {
    const devModule = "./dev/vite-dev";
    const { setupVite } = await import(devModule);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(getArg('--port') || String(DEFAULT_SERVER_PORT), 10);
  server.listen({
    port,
    host: "127.0.0.1",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  const shutdown = async () => {
    try {
      const active = await getActiveSubtask();
      if (active) {
        await updateSubtask(active.id, { status: 'pending' });
        log(`Stopped active task (subtask ${active.id}) on shutdown`);
      }
    } catch (err) {
      console.error('Failed to stop active task on shutdown:', err);
    }
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();