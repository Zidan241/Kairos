import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type InsertHabit, type UpdateHabit, type Habit } from "@shared/schema";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { useGoalsList } from "@/hooks/useGoals";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface HabitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertHabit | Partial<UpdateHabit>) => void;
  isLoading?: boolean;
  existingHabit?: Habit | null;
}

export function HabitModal({ open, onOpenChange, onSubmit, isLoading, existingHabit }: HabitModalProps) {
  const mode = existingHabit ? 'edit' : 'create';
  const { data: goalsList } = useGoalsList(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    frequency: "daily" as "daily" | "weekly" | "custom",
    customDays: [] as number[],
    goalType: "completion" as "completion" | "duration",
    goalTarget: "60",
    endDate: "" as string,
    goalId: "" as string,
  });

  useEffect(() => {
    if (!open) return;
    if (existingHabit) {
      setFormData({
        title: existingHabit.title,
        description: existingHabit.description || "",
        frequency: existingHabit.frequency as any,
        customDays: (existingHabit.customDays as number[]) || [],
        goalType: existingHabit.estimateMinutes ? 'duration' : 'completion' as any,
        goalTarget: String(existingHabit.estimateMinutes || 60),
        endDate: existingHabit.endDate || "",
        goalId: existingHabit.goalId ? String(existingHabit.goalId) : "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        frequency: "daily",
        customDays: [],
        goalType: "completion",
        goalTarget: "60",
        endDate: "",
        goalId: "",
      });
    }
  }, [open, existingHabit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      frequency: formData.frequency,
      customDays: formData.frequency === 'custom' ? formData.customDays : null,
    };
    if (formData.goalType === 'duration') {
      data.estimateMinutes = parseInt(formData.goalTarget) || 60;
    } else {
      data.estimateMinutes = null;
    }
    if (formData.endDate) {
      data.endDate = formData.endDate;
    } else {
      data.endDate = null;
    }
    data.goalId = formData.goalId ? parseInt(formData.goalId) : null;
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New Habit' : 'Edit Habit'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="habit-title">Title</Label>
            <Input
              id="habit-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Daily LeetCode, Learning..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="habit-description">Description</Label>
            <Textarea
              id="habit-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(v) => setFormData(prev => ({ ...prev, frequency: v as any }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="custom">Specific days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.frequency === 'custom' && (
            <div className="space-y-2">
              <Label>Days</Label>
              <ToggleGroup
                type="multiple"
                value={formData.customDays.map(String)}
                onValueChange={(vals) => setFormData(prev => ({ ...prev, customDays: vals.map(Number) }))}
                className="justify-start"
              >
                {DAY_LABELS.map((label, i) => (
                  <ToggleGroupItem key={i} value={String(i)} size="sm" className="w-10">
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label>Goal type</Label>
            <Select
              value={formData.goalType}
              onValueChange={(v) => setFormData(prev => ({ ...prev, goalType: v as any }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="completion">Just complete it</SelectItem>
                <SelectItem value="duration">Track time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.goalType === 'duration' && (
            <div className="space-y-2">
              <Label htmlFor="habit-target">Target (minutes)</Label>
              <Input
                id="habit-target"
                type="number"
                min="1"
                max="1440"
                value={formData.goalTarget}
                onChange={(e) => setFormData(prev => ({ ...prev, goalTarget: e.target.value }))}
              />
              {formData.frequency === 'weekly' && (
                <p className="text-xs text-muted-foreground">Time accumulates across the week</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>End Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal group"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="flex-1">
                    {formData.endDate ? formData.endDate : <span className="text-muted-foreground">No end date</span>}
                  </span>
                  {formData.endDate && (
                    <span
                      role="button"
                      className="ml-auto opacity-50 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, endDate: "" })); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.endDate ? new Date(formData.endDate + 'T00:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setFormData(prev => ({ ...prev, endDate: `${y}-${m}-${d}` }));
                    }
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Goal (optional)</Label>
            <Select
              value={formData.goalId}
              onValueChange={(v) => setFormData(prev => ({ ...prev, goalId: v === "none" ? "" : v }))}
            >
              <SelectTrigger className="data-[placeholder]:text-xs data-[placeholder]:italic"><SelectValue placeholder="No goal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs text-muted-foreground italic">No goal</SelectItem>
                {goalsList?.map(g => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title.trim()}>
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
