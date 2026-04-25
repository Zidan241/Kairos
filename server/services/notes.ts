import { subtasks, tasks } from "@shared/schema";
import type { NoteListItem } from "@shared/types";
import { db } from "../core/database";
import { eq, isNotNull, desc } from "drizzle-orm";

export async function getNote(subtaskId: number): Promise<string | null> {
  const result = await db.select({ notes: subtasks.notes }).from(subtasks).where(eq(subtasks.id, subtaskId)).limit(1);
  return result[0]?.notes ?? null;
}

export async function saveNote(subtaskId: number, content: string): Promise<boolean> {
  const result = await db.update(subtasks)
    .set({ notes: content ?? null, updatedAt: new Date().toISOString() })
    .where(eq(subtasks.id, subtaskId)) as any;
  return result.changes > 0;
}

export async function getSubtasksWithNotes(): Promise<NoteListItem[]> {
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
