import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { fromError } from "zod-validation-error";
import { insertTaskSchema, updateTaskSchema, insertSubtaskSchema, updateSubtaskSchema, insertHabitSchema, updateHabitSchema, insertGoalSchema, updateGoalSchema } from "@shared/schema";
import { dateUtils } from "@shared/utils";
import { createTask, updateTask, deleteTask, getTasksWithMetrics, getDayPlanWithMetrics } from "./services/tasks";
import { createSubtask, updateSubtask, deleteSubtask, getActiveSubtask, getScheduledSubtasks, toggleSkip, getWorkSessionsBySubtask, getWorkSessionsByDate } from "./services/subtasks";
import { getHabits, createHabit, updateHabit, deleteHabit, getHabitsSummary, getHabitDetailsWithMetrics } from "./services/habits";
import { createGoal, updateGoal, deleteGoal, getGoals, getGoalsSummary, getGoalDetailsWithMetrics } from "./services/goals";
import { getNote, saveNote, getSubtasksWithNotes } from "./services/notes";
import { getDailyMetrics, getDayReportMetrics } from "./services/reports";
import { checkTaskTransition } from "./services/bucketAnalysis";
import { getDatabaseInfo, createBackup } from "./services/database";
import { activityWatchService } from "./services/activity/nodeActivityWatch";
import { z } from "zod";

const asyncHandler = (fn: (req: any, res: any, next: any) => unknown) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Sends a readable 400 from a Zod error instead of leaking the raw error tree.
function sendValidationError(res: any, error: z.ZodError): void {
  res.status(400).json({ error: fromError(error).toString() });
}

// Validates a positive-integer route param, rejecting NaN / non-numeric ids.
function validateIdParam(req: any, res: any, next: any, value: string): void {
  const id = parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: `Invalid id parameter: "${value}"` });
    return;
  }
  next();
}

function parseDays(raw: string | undefined, fallback = 30): number {
  const parsed = parseInt(raw as string);
  if (isNaN(parsed)) return fallback;
  if (parsed === 0) return 0;
  return Math.min(Math.max(parsed, 1), 365);
}

export async function registerRoutes(app: Express): Promise<Server> {
  const router = Router();

  // Reject non-numeric / non-positive id params before they reach handlers.
  router.param("id", validateIdParam);
  router.param("subtaskId", validateIdParam);

  // =========================================================================
  // System
  // =========================================================================

  router.get("/health", (req: any, res: any) => {
    res.json({ ok: true, timestamp: new Date().toISOString(), message: "API is working" });
  });

  router.get("/database/info", asyncHandler(async (_req: any, res: any) => {
    res.json(getDatabaseInfo());
  }));

  router.post("/database/backup", asyncHandler(async (_req: any, res: any) => {
    res.json(createBackup());
  }));

  // =========================================================================
  // Tasks
  // =========================================================================

  router.get("/tasks/planning", asyncHandler(async (req: any, res: any) => {
    const { sortBy = 'urgency', sortOrder = 'asc' } = req.query;
    const planningData = await getTasksWithMetrics(sortBy as string, sortOrder as string);
    res.json(planningData);
  }));

  router.get("/tasks/day-plan", asyncHandler(async (req: any, res: any) => {
    const dayPlanData = await getDayPlanWithMetrics();
    res.json(dayPlanData);
  }));

  router.post("/tasks", asyncHandler(async (req: any, res: any) => {
    const validation = insertTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }
    const task = await createTask(validation.data);
    res.status(201).json(task);
  }));

  router.put("/tasks/:id", asyncHandler(async (req: any, res: any) => {
    const validation = updateTaskSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }
    const task = await updateTask(parseInt(req.params.id), validation.data);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  }));

  router.delete("/tasks/:id", asyncHandler(async (req: any, res: any) => {
    const deleted = await deleteTask(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.status(204).send();
  }));

  // =========================================================================
  // Subtasks
  // =========================================================================

  router.post("/subtasks", asyncHandler(async (req: any, res: any) => {
    const validation = insertSubtaskSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }
    const subtask = await createSubtask(validation.data);
    res.status(201).json(subtask);
  }));

  router.put("/subtasks/:id", asyncHandler(async (req: any, res: any) => {
    const validation = updateSubtaskSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }
    const subtask = await updateSubtask(parseInt(req.params.id), validation.data);
    if (!subtask) {
      return res.status(404).json({ error: "Subtask not found" });
    }
    res.json(subtask);
  }));

  router.delete("/subtasks/:id", asyncHandler(async (req: any, res: any) => {
    const deleted = await deleteSubtask(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: "Subtask not found" });
    }
    res.status(204).send();
  }));

  router.get("/subtasks/active", asyncHandler(async (req: any, res: any) => {
    const activeSubtask = await getActiveSubtask();
    if (!activeSubtask) {
      return res.status(404).json({ error: "No active subtask found" });
    }
    res.json(activeSubtask);
  }));

  router.get("/subtasks/scheduled/:date", asyncHandler(async (req: any, res: any) => {
    const date = req.params.date;
    const scheduledSubtasks = await getScheduledSubtasks(date);
    res.json(scheduledSubtasks);
  }));

  router.patch("/subtasks/:id/skip", asyncHandler(async (req: any, res: any) => {
    const subtask = await toggleSkip(parseInt(req.params.id));
    if (!subtask) {
      return res.status(404).json({ error: "Subtask not found" });
    }
    res.json(subtask);
  }));

  router.get("/subtasks/:id/work-sessions", asyncHandler(async (req: any, res: any) => {
    const sessions = await getWorkSessionsBySubtask(parseInt(req.params.id));
    res.json(sessions);
  }));

  // =========================================================================
  // Habits
  // =========================================================================

  router.get("/habits/summary", asyncHandler(async (req: any, res: any) => {
    const includeArchived = req.query.includeArchived === 'true';
    const days = parseDays(req.query.days);
    const summary = await getHabitsSummary(includeArchived, days);
    res.json(summary);
  }));

  router.get("/habits", asyncHandler(async (req: any, res: any) => {
    const includeArchived = req.query.includeArchived === 'true';
    const habitList = await getHabits(includeArchived);
    res.json(habitList);
  }));

  router.post("/habits", asyncHandler(async (req: any, res: any) => {
    const validation = insertHabitSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }
    const habit = await createHabit(validation.data);
    res.status(201).json(habit);
  }));

  router.put("/habits/:id", asyncHandler(async (req: any, res: any) => {
    const validation = updateHabitSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }
    const habit = await updateHabit(parseInt(req.params.id), validation.data);
    if (!habit) {
      return res.status(404).json({ error: "Habit not found" });
    }
    res.json(habit);
  }));

  router.delete("/habits/:id", asyncHandler(async (req: any, res: any) => {
    const deleted = await deleteHabit(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: "Habit not found" });
    }
    res.status(204).send();
  }));

  router.get("/habits/:id/details", asyncHandler(async (req: any, res: any) => {
    const days = parseDays(req.query.days);
    const details = await getHabitDetailsWithMetrics(parseInt(req.params.id), days);
    if (!details) {
      return res.status(404).json({ error: "Habit not found" });
    }
    res.json(details);
  }));

  // =========================================================================
  // Goals
  // =========================================================================

  router.get("/goals", asyncHandler(async (req: any, res: any) => {
    const includeArchived = req.query.archived !== 'false';
    res.json(await getGoals(includeArchived));
  }));

  router.get("/goals/summary", asyncHandler(async (req: any, res: any) => {
    const includeArchived = req.query.archived !== 'false';
    const days = parseDays(req.query.days);
    res.json(await getGoalsSummary(includeArchived, days));
  }));

  router.post("/goals", asyncHandler(async (req: any, res: any) => {
    const validation = insertGoalSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }
    const goal = await createGoal(validation.data);
    res.status(201).json(goal);
  }));

  router.patch("/goals/:id", asyncHandler(async (req: any, res: any) => {
    const validation = updateGoalSchema.safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }
    const goal = await updateGoal(parseInt(req.params.id), validation.data);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }
    res.json(goal);
  }));

  router.get("/goals/:id/details", asyncHandler(async (req: any, res: any) => {
    const days = parseDays(req.query.days);
    const details = await getGoalDetailsWithMetrics(parseInt(req.params.id), days);
    if (!details) {
      return res.status(404).json({ error: "Goal not found" });
    }
    res.json(details);
  }));

  router.delete("/goals/:id", asyncHandler(async (req: any, res: any) => {
    const deleted = await deleteGoal(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: "Goal not found" });
    }
    res.status(204).send();
  }));

  // =========================================================================
  // Notes
  // =========================================================================

  router.get("/notes", asyncHandler(async (_req: any, res: any) => {
    const list = await getSubtasksWithNotes();
    res.json(list);
  }));

  router.get("/notes/:subtaskId", asyncHandler(async (req: any, res: any) => {
    const notes = await getNote(parseInt(req.params.subtaskId));
    res.json({ notes });
  }));

  router.put("/notes/:subtaskId", asyncHandler(async (req: any, res: any) => {
    const validation = z.object({
      content: z.string().max(100_000, "Note content too long").optional(),
    }).safeParse(req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }
    const saved = await saveNote(parseInt(req.params.subtaskId), validation.data.content ?? '');
    if (!saved) {
      return res.status(404).json({ error: "Subtask not found" });
    }
    res.json({ ok: true });
  }));

  // =========================================================================
  // Analytics
  // =========================================================================

  router.get("/analytics/daily-metrics", asyncHandler(async (req: any, res: any) => {
    const date = req.query.date as string;
    const targetDate = date || dateUtils.getTodayDate();
    const metrics = await getDailyMetrics(targetDate);
    res.json(metrics);
  }));

  router.get("/analytics/day-report", asyncHandler(async (req: any, res: any) => {
    const date = (req.query.date as string) || dateUtils.getTodayDate();
    const report = await getDayReportMetrics(date);
    res.json(report);
  }));

  router.get("/analytics/task-transition", asyncHandler(async (req: any, res: any) => {
    const isTransition = await checkTaskTransition();
    res.json({ isTaskTransition: isTransition });
  }));

  router.get("/analytics/work-sessions/:date", asyncHandler(async (req: any, res: any) => {
    const sessions = await getWorkSessionsByDate(req.params.date);
    res.json(sessions);
  }));

  // =========================================================================
  // Activity
  // =========================================================================

  router.get("/activity/status", asyncHandler(async (req: any, res: any) => {
    const running = await activityWatchService.isActivityWatchRunning();
    res.json({ running, paused: activityWatchService.isPaused() });
  }));

  router.post("/activity/pause", asyncHandler(async (_req: any, res: any) => {
    activityWatchService.pause();
    res.json({ paused: true });
  }));

  router.post("/activity/resume", asyncHandler(async (_req: any, res: any) => {
    activityWatchService.resume();
    res.json({ paused: false });
  }));

  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
