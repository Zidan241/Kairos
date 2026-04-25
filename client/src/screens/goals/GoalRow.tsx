import { useState } from "react";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2, Clock, ChevronDown, ChevronRight, Check, ListTodo, Repeat } from "lucide-react";
import { TaskHelpers } from "@/lib/taskHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useUpdateGoal, useDeleteGoal, useGoalDetails } from "@/hooks/useGoals";
import { type GoalSummary, type GoalDetails } from "@/lib/api";

const INLINE_CAP = 6;

function SubtaskRow({ s }: { s: GoalDetails['subtasks'][number] }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded border text-xs">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {s.isCompleted && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
          <span className={`truncate ${s.isCompleted ? "line-through text-muted-foreground" : ""}`}>{s.title}</span>
        </div>
        <span className="text-[10px] text-muted-foreground/60 pl-5">↳ {s.parentTaskTitle}</span>
      </div>
      {s.minutes > 0 && (
        <span className="text-muted-foreground shrink-0 ml-2">{TaskHelpers.formatTime(s.minutes)}</span>
      )}
    </div>
  );
}

function HabitRow({ h }: { h: GoalDetails['habits'][number] }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded border text-xs">
      <span className="truncate">{h.title}</span>
      {h.minutes > 0 && (
        <span className="text-muted-foreground shrink-0 ml-2">{TaskHelpers.formatTime(h.minutes)}</span>
      )}
    </div>
  );
}

function GoalLinkedItemsModal({ details, open, onOpenChange }: { details: GoalDetails; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col pb-0">
        <DialogHeader>
          <DialogTitle>{details.goal.title} — Linked Items</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-clean space-y-4 pr-2 pb-4">
          {details.subtasks.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                <ListTodo className="h-3 w-3" /> Tasks ({details.subtasks.length})
              </span>
              {details.subtasks.map(s => <SubtaskRow key={s.id} s={s} />)}
            </div>
          )}
          {details.habits.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                <Repeat className="h-3 w-3" /> Habits ({details.habits.length})
              </span>
              {details.habits.map(h => <HabitRow key={h.id} h={h} />)}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GoalRow({ goal, days, onEdit }: { goal: GoalSummary; days: number; onEdit: (g: GoalSummary) => void }) {
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [showDelete, setShowDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showViewAll, setShowViewAll] = useState(false);
  const isArchived = goal.isArchived;

  const stats = goal.stats;
  const { data: details } = useGoalDetails(expanded ? goal.id : null, days);

  const totalLinked = details ? details.subtasks.length + details.habits.length : 0;

  return (
    <>
      <Card>
        <CardContent className="py-3 px-4 space-y-0">
          {/* Title + right actions */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <button onClick={() => setExpanded(!expanded)} className="shrink-0 mt-0.5">
                {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              <div className="min-w-0">
                <span className="font-medium text-sm block truncate">{goal.title}</span>
                {goal.description && (
                  <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{goal.description}</p>
                )}
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {TaskHelpers.formatTime(stats.totalMinutes)}
                  </span>
                  <span>{stats.completedSubtaskCount}/{stats.subtaskCount} tasks</span>
                  {stats.habitCount > 0 && (
                    <span>{stats.habitCount} habits</span>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isArchived && (
                    <DropdownMenuItem onClick={() => onEdit(goal)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => updateGoal.mutate({ id: goal.id, updates: { isArchived: !isArchived } })}>
                    {isArchived ? (
                      <><ArchiveRestore className="h-3.5 w-3.5 mr-2" /> Restore</>
                    ) : (
                      <><Archive className="h-3.5 w-3.5 mr-2" /> Archive</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {expanded && (
            <div className="mt-3 pt-1 space-y-3">
              <div className="mt-2 h-px w-full" style={{ background: 'linear-gradient(to right, transparent, hsl(var(--border)) 5%, hsl(var(--border)) 90%, transparent)' }} />

              {details ? (
                <>
                  {/* Time breakdown */}
                  {details.timeBreakdown.trackedMinutes > 0 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="text-muted-foreground">{TaskHelpers.formatTime(details.timeBreakdown.trackedMinutes)} tracked</span>
                      <span className="text-muted-foreground">Focus: {TaskHelpers.formatTime(details.timeBreakdown.focusMinutes)}</span>
                      {details.timeBreakdown.distractionMinutes > 0 && (
                        <span className="text-muted-foreground">Distraction: {TaskHelpers.formatTime(details.timeBreakdown.distractionMinutes)}</span>
                      )}
                    </div>
                  )}

                  {/* Linked subtasks (capped) */}
                  {details.subtasks.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                        <ListTodo className="h-3 w-3" /> Tasks
                      </span>
                      {details.subtasks.slice(0, INLINE_CAP).map(s => <SubtaskRow key={s.id} s={s} />)}
                    </div>
                  )}

                  {/* Linked habits (capped) */}
                  {details.habits.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                        <Repeat className="h-3 w-3" /> Habits
                      </span>
                      {details.habits.slice(0, INLINE_CAP).map(h => <HabitRow key={h.id} h={h} />)}
                    </div>
                  )}

                  {/* View all button when any section exceeds cap */}
                  {(details.subtasks.length > INLINE_CAP || details.habits.length > INLINE_CAP) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 text-muted-foreground"
                      onClick={() => setShowViewAll(true)}
                    >
                      View all ({totalLinked} items)
                    </Button>
                  )}
                </>
              ) : (
                <Skeleton className="h-16 w-full" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {details && (
        <GoalLinkedItemsModal details={details} open={showViewAll} onOpenChange={setShowViewAll} />
      )}

      <ConfirmationDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => deleteGoal.mutate(goal.id)}
        title="Delete Goal"
        description={`Delete "${goal.title}"? Linked tasks and habits will be unlinked but not deleted.`}
      />
    </>
  );
}
