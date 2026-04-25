import { Check, Clock, Flame, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useHabitsSummary } from "@/hooks/useHabits";
import { TaskHelpers } from "@/lib/taskHelpers";

function isHabitDone(h: { goalType?: string | null; estimateMinutes: number | null; progress: { completedCount: number; totalMinutes: number } }): boolean {
  if (h.estimateMinutes) return h.progress.totalMinutes >= h.estimateMinutes;
  return h.progress.completedCount > 0;
  return false;
}

export default function HabitsSummary() {
  const { data: habits } = useHabitsSummary();

  if (!habits || habits.length === 0) return null;

  const todayHabits = habits.filter(h => h.isDueToday);
  if (todayHabits.length === 0) return null;

  const completedCount = todayHabits.filter(isHabitDone).length;
  const streaksAtRisk = todayHabits.filter(h => !isHabitDone(h) && h.streak >= 3);

  return (
    <Card>
      <CardContent className="py-3 px-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Habits ({completedCount}/{todayHabits.length})</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {todayHabits.map(h => {
            const isDone = isHabitDone(h);
            const isCompletion = !h.estimateMinutes;

            return (
              <div key={h.id} className="flex items-center gap-1.5 text-xs">
                {isDone ? (
                  <Check className="h-3 w-3 text-primary" />
                ) : isCompletion ? (
                  <div className="w-3 h-3 rounded-full border border-muted-foreground/40" />
                ) : (
                  <Clock className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={isDone ? 'text-muted-foreground line-through' : ''}>
                  {h.title}
                </span>
                {!isCompletion && h.estimateMinutes && (
                  <span className="text-muted-foreground">
                    {TaskHelpers.formatTime(h.progress.totalMinutes)}/{TaskHelpers.formatTime(h.estimateMinutes)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Streaks at risk — habits with 3+ streak not yet done today */}
        {streaksAtRisk.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t">
            {streaksAtRisk.map(h => (
              <div key={h.id} className="flex items-center gap-1.5 text-xs text-orange-500">
                <AlertTriangle className="h-3 w-3" />
                <span>{h.title}</span>
                <span className="flex items-center gap-0.5">
                  <Flame className="h-2.5 w-2.5" /> {h.streak}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
