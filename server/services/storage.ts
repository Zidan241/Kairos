import { 
  type Task, type InsertTask, type UpdateTask,
  type Subtask, type InsertSubtask,
  type ActivityBucket, type InsertActivityBucket,
  tasks, subtasks, activityBuckets,
  UpdateSubtask,
  taskScheduleHistory
} from "@shared/schema";
import { TaskWithMetrics } from "@shared/metrics";
import { 
  buildTaskHierarchyWithMetrics,
} from "../utils/taskMappers";
import { db } from "../core/database";
import { eq, desc, asc, inArray, sql } from "drizzle-orm";
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
    const finalUpdates = { ...updates };
    let completedAt;
    
    if (updates.isCompleted === true) {
      finalUpdates.isActive = false;
      completedAt = new Date().toISOString();
    } else if (updates.isCompleted === false) {
      // If unmarking as completed, clear the completedAt timestamp
      completedAt = null;
    }

    // Handle isActive field - if setting a subtask to active, clear other active subtasks first
    if (finalUpdates.isActive === true) {
      await db.update(subtasks).set({ isActive: false }).where(eq(subtasks.isActive, true));
    }

    // When rescheduling, reset active state so the task doesn't carry over as active
    if (finalUpdates.scheduledDate !== undefined) {
      finalUpdates.isActive = false;
    }

    // Handle schedule history
    if(finalUpdates.scheduledDate !== undefined){
      try{
        await db.insert(taskScheduleHistory).values({
          subtaskId: id,
          scheduledDate: finalUpdates.scheduledDate,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to create task schedule history:', error);
        // Don't throw - this is supplementary data, shouldn't block the main update
      }
    }

    const result = await db.update(subtasks)
      .set({ ...finalUpdates, updatedAt: new Date().toISOString() , completedAt })
      .where(eq(subtasks.id, id))
      .returning() as Subtask[];
    return result[0];
  }

  async deleteSubtask(id: number): Promise<boolean> {
    const result = await db.delete(subtasks).where(eq(subtasks.id, id)) as any;
    return result.changes > 0;
  }

  async getActiveSubtask(): Promise<Subtask | undefined> {
    const result = await db.select().from(subtasks).where(eq(subtasks.isActive, true)).limit(1);
    const active = result[0];
    if (!active) return undefined;

    // Auto-deactivate if scheduled for a previous day
    const today = dateUtils.getTodayDate();
    if (active.scheduledDate && active.scheduledDate < today) {
      await db.update(subtasks).set({ isActive: false }).where(eq(subtasks.id, active.id));
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