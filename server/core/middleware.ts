import { type Request, Response, NextFunction } from "express";
import { log } from "./static";

export function setupLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        const contentType = res.get("Content-Type") || "";
        
        if (capturedJsonResponse && contentType.includes("application/json")) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } else if (contentType.includes("text/html")) {
          logLine += " :: [HTML RESPONSE - possible SPA fallback]";
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  };
}

export function setupErrorHandler() {
  return (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server Error:", err);
    res.status(status).json({ message });
    // Fixed: Don't throw after responding - this can crash the process
  };
}