import { useState } from "react";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2, Flame, Clock, Timer, Check, X, SkipForward, ChevronDown, ChevronRight, Target, Circle } from "lucide-react";
import { TaskHelpers } from "@/lib/taskHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { TimeBreakdownRow } from "@/components/TimeBreakdownRow";
import { useUpdateHabit, useDeleteHabit, useHabitDetails } from "@/hooks/useHabits";
import { useGoalsList } from "@/hooks/useGoals";
import { type HabitSummary, type HabitDetails, type HabitDayStatus } from "@/lib/api";

// =========================================================================
// Constants & Helpers
// =========================================================================

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getFrequencyLabel(habit: HabitSummary): string {
  switch (habit.frequency) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'custom': {
      const days = habit.customDays as number[] | null;
      if (!days || days.length === 0) return 'Specific days';
      return days.map(d => DAY_LABELS[d]).join(', ');
    }
    default: return '';
  }
}

function getLastNDays(n: number): string[] {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function parseDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return { dayName: DAY_LABELS[d.getDay()], label: `${d.getDate()}/${d.getMonth() + 1}` };
}

// =========================================================================
// Sub-components
// =========================================================================

function DayTrackerDots({ history }: { history: HabitSummary['history'] }) {
  const days = getLastNDays(7);
  const lookup = new Map(history.map(h => [h.date, h]));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5">
        {days.map(date => {
          const entry = lookup.get(date);
          const { dayName, label } = parseDate(date);
          const dateLabel = `${dayName} ${label}`;

          let bg = 'bg-muted/60';
          let title = `${dateLabel}: Not due`;

          if (entry) {
            switch (entry.status) {
              case 'completed': bg = 'bg-status-success'; title = `${dateLabel}: Done`; break;
              case 'skipped': bg = 'bg-status-warning'; title = `${dateLabel}: Skipped`; break;
              case 'missed': bg = 'bg-status-danger/60'; title = `${dateLabel}: Missed`; break;
              case 'pending': bg = 'bg-foreground/30'; title = `Today: Pending`; break;
            }
            if (entry.minutes > 0) title += ` · ${TaskHelpers.formatTime(entry.minutes)}`;
          }

          return (
            <Tooltip key={date}>
              <TooltipTrigger asChild>
                <div className={`w-2 h-2 rounded-full ${bg} shrink-0`} />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">{title}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function StatusIcon({ status }: { status: HabitDayStatus }) {
  switch (status) {
    case 'completed': return <Check className="h-3 w-3 text-status-success" />;
    case 'skipped': return <SkipForward className="h-3 w-3 text-status-warning" />;
    case 'missed': return <X className="h-3 w-3 text-status-danger/60" />;
    case 'pending': return <Circle className="h-3 w-3 text-muted-foreground" />;
  }
}

function DayRow({ date, status, minutes, compact }: { date: string; status: HabitDayStatus; minutes: number; compact?: boolean }) {
  const { dayName, label } = parseDate(date);
  return (
    <div className={`flex items-center justify-between ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-md border text-xs`}>
      <div className="flex items-center gap-2">
        <StatusIcon status={status} />
        <span className="text-muted-foreground w-8">{dayName}</span>
        <span>{label}</span>
      </div>
      <span className="text-muted-foreground">{TaskHelpers.formatTime(minutes)}</span>
    </div>
  );
}

function HabitHistoryModal({ details, open, onOpenChange }: { details: HabitDetails; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col pb-0">
        <DialogHeader>
          <DialogTitle>{details.habit.title} — History</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-clean space-y-1.5 pb-4">
          {details.perDay.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No history yet</p>
          ) : (
            details.perDay.map(day => (
              <DayRow key={day.date} date={day.date} status={day.status} minutes={day.trackedMinutes} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// Main Component
// =========================================================================

export function HabitRow({ habit, days, onEdit }: {
  habit: HabitSummary;
  days: number;
  onEdit: (h: HabitSummary) => void;
}) {
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const [showDelete, setShowDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showViewAll, setShowViewAll] = useState(false);

  const { data: details } = useHabitDetails(expanded ? habit.id : null, days);
  const { data: goalsList } = useGoalsList(false);
  const goalName = habit.goalId ? goalsList?.find(g => g.id === habit.goalId)?.title : null;

  return (
    <>
      <Card>
        <CardContent className="py-3 px-4 space-y-0">
          {/* Collapsed row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <button onClick={() => setExpanded(!expanded)} className="shrink-0 mt-0.5">
                {expanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              <div className="min-w-0">
                <span className="font-medium text-sm block truncate">{habit.title}</span>
                {habit.description && (
                  <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{habit.description}</p>
                )}
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1">
                  <DayTrackerDots history={habit.history} />
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {TaskHelpers.formatTime(habit.workedMinutes)}
                  </span>
                  <span>{habit.completionRate.done}/{habit.completionRate.due}</span>
                  {habit.streak > 0 && (
                    <span className="flex items-center gap-0.5 text-status-warning font-medium">
                      <Flame className="h-3 w-3" /> {habit.streak}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right-side metadata + menu */}
            <div className="shrink-0 flex items-center gap-3 text-xs text-muted-foreground">
              {goalName && (<>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {goalName}
                </span>
                <span className="text-muted-foreground/40">•</span>
              </>)}
              <span>{getFrequencyLabel(habit)}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {habit.estimateMinutes ? `${habit.estimateMinutes}m` : '—'}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!habit.isArchived && (
                    <DropdownMenuItem onClick={() => onEdit(habit)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => updateHabit.mutate({ id: habit.id, updates: { isArchived: !habit.isArchived } })}>
                    {habit.isArchived
                      ? <><ArchiveRestore className="h-3.5 w-3.5 mr-2" /> Restore</>
                      : <><Archive className="h-3.5 w-3.5 mr-2" /> Archive</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 space-y-3 pt-1">
              <div className="h-px w-full" style={{ background: 'linear-gradient(to right, transparent, hsl(var(--border)) 5%, hsl(var(--border)) 90%, transparent)' }} />
              {details ? (
                <>
                  <div className="flex justify-between items-center">
                    <TimeBreakdownRow breakdown={details.timeBreakdown} />
                    <span className={`flex items-center gap-0.5 text-xs ${details.bestStreak > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                      <Flame className="h-3 w-3" /> Best: {details.bestStreak}
                    </span>
                  </div>

                  {details.perDay.length > 0 ? (
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider">Recent</span>
                      {details.perDay.slice(0, 3).map(day => (
                        <DayRow key={day.date} date={day.date} status={day.status} minutes={day.trackedMinutes} compact />
                      ))}
                      {details.perDay.length > 3 && (
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground" onClick={() => setShowViewAll(true)}>
                          View all ({details.perDay.length} days)
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">No history yet</p>
                  )}
                </>
              ) : (
                <Skeleton className="h-16 w-full" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {details && <HabitHistoryModal details={details} open={showViewAll} onOpenChange={setShowViewAll} />}

      <ConfirmationDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => deleteHabit.mutate(habit.id)}
        title="Delete Habit"
        description={`Delete "${habit.title}" and all its tracked data? This cannot be undone.`}
      />
    </>
  );
}
