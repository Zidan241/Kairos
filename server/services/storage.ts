import { 
  type Task, type InsertTask, type UpdateTask,
  type Subtask, type InsertSubtask,
  type ActivityBucket, type InsertActivityBucket,
  type WorkSessionHistory,
  tasks, subtasks, activityBuckets, workSessionsHistory,
  UpdateSubtask,
  taskScheduleHistory
} from "@shared/schema";
import { TaskWithMetrics } from "@shared/metrics";
import { 
  buildTaskHierarchyWithMetrics,
} from "../utils/taskMappers";
import { db } from "../core/database";
import { eq, and, desc, asc, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import { metricsService } from "./metrics";
import { dateUtils } from "@shared/utils";

export class SQLiteStorage {
  // -------------------------
  // Task operations
  // -------------------------
  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning() as Task[];
    if (!result[0]) throw new Error("Failed to create task");
    return result[0];
  }

  async updateTask(id: number, updates: Partial<UpdateTask>): Promise<Task | undefined> {
    const finalUpdates: any = { ...updates };
    if (updates.isCompleted === true) {
      finalUpdates.completedAt = new Date().toISOString();
    } else if (updates.isCompleted === false) {
      // If unmarking as completed, clear the completedAt timestamp
      finalUpdates.completedAt = null;
    }
    const result = await db.update(tasks)
      .set({ ...finalUpdates, updatedAt: new Date().toISOString() })
      .where(eq(tasks.id, id))
      .returning() as Task[];
    return result[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    // End work session if any subtask under this task is active (cascade will delete subtasks)
    const active = await this.getActiveSubtask();
    if (active && active.parentTaskId === id) {
      await this.deactivate();
    }
    const result = await db.delete(tasks).where(eq(tasks.id, id)) as any;
    return result.changes > 0;
  }

  // -------------------------
  // Subtask operations
  // -------------------------
  async createSubtask(subtask: InsertSubtask): Promise<Subtask> {
    const result = await db.insert(subtasks).values(subtask).returning() as Subtask[];
    if (!result[0]) throw new Error("Failed to create subtask");
    return result[0];
  }

  async updateSubtask(id: number, updates: Partial<UpdateSubtask>): Promise<Subtask | undefined> {
    // Handle completion status - when marking as completed, set isActive to false and completedAt timestamp
    const finalUpdates: Partial<UpdateSubtask> & { activatedAt?: string | null } = { ...updates };
    let completedAt;
    const now = new Date().toISOString();
    
    if (updates.isCompleted === true) {
      finalUpdates.isActive = false;
      completedAt = now;
    } else if (updates.isCompleted === false) {
      // If unmarking as completed, clear the completedAt timestamp
      completedAt = null;
    }

    // Handle isActive field - if setting a subtask to active, clear other active subtasks first
    if (finalUpdates.isActive === true) {
      await this.activate(id, now);
      finalUpdates.activatedAt = now;
    }

    // Deactivation: explicit toggle, completion, or reschedule
    // Only end work session if THIS subtask is currently active (avoid ending another subtask's session)
    if (finalUpdates.isActive === false || (finalUpdates.scheduledDate !== undefined && finalUpdates.isActive !== true)) {
      const active = await this.getActiveSubtask();
      if (active?.id === id) {
        await this.deactivate();
      }
      finalUpdates.isActive = false;
      finalUpdates.activatedAt = null;
    }

    // Record schedule history
    if (finalUpdates.scheduledDate !== undefined) {
      try {
        await db.insert(taskScheduleHistory).values({
          subtaskId: id,
          scheduledDate: finalUpdates.scheduledDate,
          createdAt: now
        });
      } catch (error) {
        console.error('Failed to create task schedule history:', error);
        // Don't throw - this is supplementary data, shouldn't block the main update
      }
    }

    const result = await db.update(subtasks)
      .set({ ...finalUpdates, updatedAt: now, completedAt })
      .where(eq(subtasks.id, id))
      .returning() as Subtask[];
    return result[0];
  }

  async deleteSubtask(id: number): Promise<boolean> {
    // End work session if this subtask is active
    const active = await this.getActiveSubtask();
    if (active?.id === id) {
      await this.deactivate();
    }
    const result = await db.delete(subtasks).where(eq(subtasks.id, id)) as any;
    return result.changes > 0;
  }

  // -------------------------
  // Notes
  // -------------------------
  async getNote(subtaskId: number): Promise<string | null> {
    const result = await db.select({ notes: subtasks.notes }).from(subtasks).where(eq(subtasks.id, subtaskId)).limit(1);
    return result[0]?.notes ?? null;
  }

  async saveNote(subtaskId: number, content: string): Promise<boolean> {
    const result = await db.update(subtasks)
      .set({ notes: content ?? null, updatedAt: new Date().toISOString() })
      .where(eq(subtasks.id, subtaskId)) as any;
    return result.changes > 0;
  }

  async getSubtasksWithNotes(): Promise<{ id: number; title: string; parentTaskTitle: string; updatedAt: string }[]> {
    const rows = await db
      .select({
        id: subtasks.id,
        title: subtasks.title,
        parentTaskTitle: tasks.title,
        updatedAt: subtasks.updatedAt,
      })
      .from(subtasks)
      .innerJoin(tasks, eq(subtasks.parentTaskId, tasks.id))
      .where(isNotNull(subtasks.notes))
      .orderBy(desc(subtasks.updatedAt));
    return rows;
  }

  async getActiveSubtask(): Promise<Subtask | undefined> {
    const result = await db.select().from(subtasks).where(eq(subtasks.isActive, true)).limit(1);
    const active = result[0];
    if (!active) return undefined;

    // Auto-deactivate if scheduled for a previous day
    const today = dateUtils.getTodayDate();
    if (active.scheduledDate && active.scheduledDate < today) {
      await this.deactivate();
      await db.update(subtasks).set({ isActive: false, activatedAt: null, updatedAt: new Date().toISOString() }).where(eq(subtasks.id, active.id));
      return undefined;
    }

    return active;
  }

  async getScheduledSubtasks(date: string): Promise<Subtask[]> {
    return await db.select()
      .from(subtasks)
      .where(eq(subtasks.scheduledDate, date))
  }  

  // -------------------------
  // Activation helpers
  // -------------------------
  private async activate(subtaskId: number, now: string): Promise<void> {
    await this.endCurrentWorkSession(now);
    await db.update(subtasks).set({ isActive: false, activatedAt: null, updatedAt: now }).where(eq(subtasks.isActive, true));
    await this.startWorkSession(subtaskId, now);
  }

  private async deactivate(): Promise<void> {
    await this.endCurrentWorkSession(new Date().toISOString());
  }

  // -------------------------
  // Work session operations
  // -------------------------
  private async startWorkSession(subtaskId: number, now: string): Promise<void> {
    const today = dateUtils.getTodayDate();
    await db.insert(workSessionsHistory).values({
      subtaskId,
      startedAt: now,
      date: today,
    });
  }

  private async endCurrentWorkSession(now: string): Promise<void> {
    // There should only be one open session at a time (single active subtask invariant)
    const openSession = await db.select().from(workSessionsHistory)
      .where(isNull(workSessionsHistory.endedAt))
      .limit(1);

    if (openSession[0]) {
      const startMs = new Date(openSession[0].startedAt).getTime();
      const endMs = new Date(now).getTime();
      const durationMinutes = Math.max(0, (endMs - startMs) / 60000);

      await db.update(workSessionsHistory)
        .set({ endedAt: now, durationMinutes, updatedAt: now })
        .where(eq(workSessionsHistory.id, openSession[0].id));
    }
  }

  async getWorkSessionsByDate(date: string): Promise<WorkSessionHistory[]> {
    return await db.select().from(workSessionsHistory)
      .where(eq(workSessionsHistory.date, date))
      .orderBy(asc(workSessionsHistory.startedAt));
  }

  async getWorkSessionsBySubtask(subtaskId: number): Promise<WorkSessionHistory[]> {
    return await db.select().from(workSessionsHistory)
      .where(eq(workSessionsHistory.subtaskId, subtaskId))
      .orderBy(asc(workSessionsHistory.startedAt));
  }

  // -------------------------
  // Activity bucket operations
  // -------------------------
  async getLatestBuckets(limit: number = 100): Promise<ActivityBucket[]> {
    return await db.select()
      .from(activityBuckets)
      .orderBy(desc(activityBuckets.startTime))
      .limit(limit);
  }

  async createActivityBucket(bucket: InsertActivityBucket): Promise<ActivityBucket> {
    // Get the current active subtask if not explicitly provided
    const activeSubtask = bucket.subtaskId ? null : await this.getActiveSubtask();
    
    // Create the bucket with the active subtask ID if available
    const bucketToInsert = {
      ...bucket,
      subtaskId: bucket.subtaskId || activeSubtask?.id || null
    };
    
    const result = await db.insert(activityBuckets).values(bucketToInsert).returning() as ActivityBucket[];
    if (!result[0]) throw new Error("Failed to create activity bucket");
    return result[0];
  }

  // -------------------------
  // Composite operations
  // -------------------------
  async getTasksWithMetrics(sortBy: string = 'creation', sortOrder: string = 'asc'): Promise<TaskWithMetrics[]> {
    const today = dateUtils.getTodayDate();

    // Determine the sorting column based on sortBy parameter
    let taskOrderBy;
  // Helper SQL fragments for urgency (priority weight + due date proximity)
  const priorityWeight = sql`CASE ${tasks.priority}
    WHEN 'urgent' THEN 4
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 1
    ELSE 0 END`;
  // daysUntil: negative => overdue, 0 => today, positive => future; NULL dueDate pushed last
  const daysUntilDue = sql`CASE 
    WHEN ${tasks.dueDate} IS NULL THEN 99999
    ELSE CAST((julianday(${tasks.dueDate}) - julianday('now')) AS INTEGER)
    END`;
    
    switch (sortBy) {
      case 'urgency':
        if (sortOrder === 'desc') {
          // Highest priority weight, earliest (lowest daysUntilDue), then raw dueDate for tie-breaker
            taskOrderBy = [desc(priorityWeight), asc(daysUntilDue)];
        } else {
            taskOrderBy = [asc(priorityWeight), desc(daysUntilDue)];
        }
        break;
      case 'alphabetical':
        if (sortOrder === 'desc') {
          taskOrderBy = desc(tasks.title);
        } else {
          taskOrderBy = asc(tasks.title);
        }
        break;
      case 'creation':
      default:
        if (sortOrder === 'desc') {
          taskOrderBy = desc(tasks.createdAt);
        } else {
          taskOrderBy = asc(tasks.createdAt);
        }
        break;
    }

    // Get all tasks and subtasks with proper sorting
    const allTasks = await db.select().from(tasks).orderBy(...(Array.isArray(taskOrderBy) ? taskOrderBy : [taskOrderBy]));
    const allSubtasks = await db.select().from(subtasks).orderBy(subtasks.createdAt);
    
    // Separate subtask IDs
    const subtaskIds = allSubtasks.map(s => s.id);
    
    // Get complete metrics for all tasks and subtasks using simplified methods
    const subtaskMetrics = await metricsService.getSubtaskMetricsBulk(subtaskIds);

    // Use the hierarchy builder to create TaskWithMetrics
    return buildTaskHierarchyWithMetrics(allTasks, allSubtasks, subtaskMetrics, today);
  }

  async getDayPlanWithMetrics(): Promise<TaskWithMetrics[]> {
    const today = dateUtils.getTodayDate();
    
    // Get scheduled subtasks for today
    const scheduledSubtasks = await this.getScheduledSubtasks(today);
    
    // Get unique task IDs
    const taskIds = Array.from(new Set(scheduledSubtasks.map(s => s.parentTaskId)));
    
    if (taskIds.length === 0) return [];

    // Get the parent tasks
    const parentTasks = await db.select().from(tasks)
      .where(inArray(tasks.id, taskIds));

    // Get subtask IDs
    const subtaskIds = scheduledSubtasks.map(s => s.id);
    
    // Get complete metrics for all tasks and subtasks using simplified methods
    const subtaskMetrics = await metricsService.getSubtaskMetricsBulk(subtaskIds);

    // Use the hierarchy builder to create TaskWithMetrics for scheduled items
    return buildTaskHierarchyWithMetrics(parentTasks, scheduledSubtasks, subtaskMetrics, today);
  }


}

// Export a singleton instance
export const storage = new SQLiteStorage();