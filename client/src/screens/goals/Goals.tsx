import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalModal } from "./GoalModal";
import { GoalRow } from "./GoalRow";
import { useGoalsSummary, useCreateGoal, useUpdateGoal } from "@/hooks/useGoals";
import { type GoalSummary } from "@/lib/api";
import { type Goal, type InsertGoal, type UpdateGoal } from "@shared/schema";

export default function Goals() {
  const { data: goals, isLoading } = useGoalsSummary(true);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [days, setDays] = useState(30);

  const handleSubmit = (data: InsertGoal | Partial<UpdateGoal>) => {
    if (editingGoal) {
      updateGoal.mutate({ id: editingGoal.id, updates: data as Partial<UpdateGoal> }, {
        onSuccess: () => { setModalOpen(false); setEditingGoal(null); },
      });
    } else {
      createGoal.mutate(data as InsertGoal, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const activeGoals = (goals ?? []).filter(g => !g.isArchived);
  const archivedGoals = (goals ?? []).filter(g => g.isArchived);

  return (
    <div className="flex flex-col h-full overflow-auto p-6 gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold">Goals</h1>
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
          <Button size="sm" onClick={() => { setEditingGoal(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Goal
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active ({activeGoals.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedGoals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeGoals.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <CardContent className="text-center">
                <p className="text-muted-foreground">No goals yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 pb-12">
              {activeGoals.map(g => (
                <GoalRow key={g.id} goal={g} days={days} onEdit={handleEdit} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No archived goals</p>
          ) : (
            <div className="space-y-2 pb-12">
              {archivedGoals.map(g => (
                <GoalRow key={g.id} goal={g} days={days} onEdit={handleEdit} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <GoalModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditingGoal(null); }}
        onSubmit={handleSubmit}
        isLoading={createGoal.isPending || updateGoal.isPending}
        existingGoal={editingGoal}
      />
    </div>
  );
}
