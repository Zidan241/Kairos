import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { storage } from "../services/storage";
import { metricsService } from "../services/metrics";
import { activityWatchService } from "../services/activity/nodeActivityWatch";
import { 
  insertTaskSchema, insertSubtaskSchema
} from "@shared/schema";
import { dateUtils } from "@shared/utils";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create API router to prevent fallthrough to Vite
  const apiRouter = Router();

  // Helper function for error handling
  const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // Healthcheck endpoint
  apiRouter.get("/health", (req: any, res: any) => {
    res.json({ ok: true, timestamp: new Date().toISOString(), message: "API is working" });
  });

  // -------------------------
  // Core Planning Routes
  // -------------------------
  apiRouter.get("/tasks/planning", asyncHandler(async (req: any, res: any) => {
    const { sortBy = 'urgency', sortOrder = 'asc' } = req.query;
    const planningData = await storage.getTasksWithMetrics(sortBy as string, sortOrder as string);
    res.json(planningData);
  }));

  apiRouter.get("/tasks/day-plan", asyncHandler(async (req: any, res: any) => {
    const dayPlanData = await storage.getDayPlanWithMetrics();
    res.json(dayPlanData);
  }));

  // -------------------------
  // Task Management
  // -------------------------
  apiRouter.post("/tasks", asyncHandler(async (req: any, res: any) => {
    const validation = insertTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    
    const task = await storage.createTask(validation.data);
    res.status(201).json(task);
  }));

  apiRouter.put("/tasks/:id", asyncHandler(async (req: any, res: any) => {
    const validation = insertTaskSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    
    const task = await storage.updateTask(parseInt(req.params.id), validation.data);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  }));

  apiRouter.delete("/tasks/:id", asyncHandler(async (req: any, res: any) => {
    const deleted = await storage.deleteTask(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.status(204).send();
  }));

  // -------------------------
  // Subtask Management
  // -------------------------
  apiRouter.post("/subtasks", asyncHandler(async (req: any, res: any) => {
    const validation = insertSubtaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    
    const subtask = await storage.createSubtask(validation.data);
    res.status(201).json(subtask);
  }));

  apiRouter.put("/subtasks/:id", asyncHandler(async (req: any, res: any) => {
    const validation = insertSubtaskSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    
    const subtask = await storage.updateSubtask(parseInt(req.params.id), validation.data);
    if (!subtask) {
      return res.status(404).json({ error: "Subtask not found" });
    }
    res.json(subtask);
  }));

  apiRouter.delete("/subtasks/:id", asyncHandler(async (req: any, res: any) => {
    const deleted = await storage.deleteSubtask(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: "Subtask not found" });
    }
    res.status(204).send();
  }));

  apiRouter.get("/subtasks/active", asyncHandler(async (req: any, res: any) => {
    const activeSubtask = await storage.getActiveSubtask();
    if (!activeSubtask) {
      return res.status(404).json({ error: "No active subtask found" });
    }
    res.json(activeSubtask);
  }));


  apiRouter.get("/subtasks/scheduled/:date", asyncHandler(async (req: any, res: any) => {
    const date = req.params.date;
    const scheduledSubtasks = await storage.getScheduledSubtasks(date);
    res.json(scheduledSubtasks);
  }));

  // -------------------------
  // Metrics
  // -------------------------
  apiRouter.get("/metrics/daily", asyncHandler(async (req: any, res: any) => {
    const date = req.query.date as string;
    const targetDate = date || dateUtils.getTodayDate();
    const metrics = await metricsService.getDailyMetrics(targetDate);
    res.json(metrics);
  }));

  apiRouter.get("/metrics/day-report", asyncHandler(async (req: any, res: any) => {
    const date = (req.query.date as string) || dateUtils.getTodayDate();
    const report = await metricsService.getDayReportMetrics(date);
    res.json(report);
  }));

  apiRouter.get("/activity/status", asyncHandler(async (req: any, res: any) => {
    const running = await activityWatchService.isActivityWatchRunning();
    res.json({ available: running, running, paused: activityWatchService.isPaused() });
  }));

  apiRouter.post("/activity/pause", asyncHandler(async (_req: any, res: any) => {
    activityWatchService.pause();
    res.json({ paused: true });
  }));

  apiRouter.post("/activity/resume", asyncHandler(async (_req: any, res: any) => {
    activityWatchService.resume();
    res.json({ paused: false });
  }));

  apiRouter.get("/activity/task-transition", asyncHandler(async (req: any, res: any) => {
    const isTransition = await metricsService.checkTaskTransition();
    res.json({ isTaskTransition: isTransition });
  }));

  // Mount the API router
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}