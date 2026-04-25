import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { HabitModal } from "./HabitModal";
import { HabitRow } from "./HabitRow";
import { useHabitsSummary, useCreateHabit, useUpdateHabit } from "@/hooks/useHabits";
import { type InsertHabit, type UpdateHabit } from "@shared/schema";
import { type HabitSummary } from "@/lib/api";

export default function Habits() {
  const { data: habits, isLoading } = useHabitsSummary(true);
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitSummary | null>(null);
  const [days, setDays] = useState(30);

  const handleSubmit = (data: InsertHabit | Partial<UpdateHabit>) => {
    if (editingHabit) {
      updateHabit.mutate({ id: editingHabit.id, updates: data as Partial<UpdateHabit> }, {
        onSuccess: () => { setModalOpen(false); setEditingHabit(null); },
      });
    } else {
      createHabit.mutate(data as InsertHabit, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const handleEdit = (habit: HabitSummary) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const activeHabits = (habits ?? []).filter(h => !h.isArchived);
  const archivedHabits = (habits ?? []).filter(h => h.isArchived);

  return (
    <div className="flex flex-col h-full overflow-auto p-6 gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold">Habits</h1>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="h-8 w-auto text-xs gap-1 px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="0">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { setEditingHabit(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Habit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active ({activeHabits.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedHabits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeHabits.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <CardContent className="text-center">
                <p className="text-muted-foreground">No habits yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 pb-12">
              {activeHabits.map(h => (
                <HabitRow key={h.id} habit={h} days={days} onEdit={handleEdit} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedHabits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No archived habits</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Archived habits will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 pb-12">
              {archivedHabits.map(h => (
                <HabitRow key={h.id} habit={h} days={days} onEdit={handleEdit} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <HabitModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingHabit(null); }}
        onSubmit={handleSubmit}
        isLoading={createHabit.isPending || updateHabit.isPending}
        existingHabit={editingHabit}
      />
    </div>
  );
}
