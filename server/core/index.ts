import express, { type Request, Response } from "express";
import { registerRoutes } from "../api/routes";
import { serveStatic, log } from "../dev/vite";
import { setupLoggingMiddleware, setupErrorHandler } from "./middleware";
import "../services/activity/nodeActivityWatch"; // Start ActivityWatch service

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("../dev/vite-dev");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5001', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();