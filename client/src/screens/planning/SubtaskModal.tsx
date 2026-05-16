import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type InsertSubtask, type UpdateSubtask, insertSubtaskSchema, updateSubtaskSchema } from "@shared/schema";
import { type SubtaskWithMetrics } from "@shared/types";
import { useGoalsList } from "@/hooks/useGoals";

interface SubtaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertSubtask | UpdateSubtask) => void;
  isLoading?: boolean;
  parentTaskId?: number | null;
  existingSubtask?: SubtaskWithMetrics | null;
}

export function SubtaskModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading, 
  parentTaskId,
  existingSubtask 
}: SubtaskModalProps) {
  const mode = existingSubtask ? 'edit' : 'create';
  const { data: goalsList } = useGoalsList(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    estimatedMinutes: "60" as string,
    goalId: "" as string,
  });

  useEffect(() => {
    if (!open) return;

    if (existingSubtask) {
      setFormData({
        title: existingSubtask.title,
        description: existingSubtask.description || "",
        estimatedMinutes: String(existingSubtask.estimatedMinutes || 60),
        goalId: existingSubtask.overrideGoal ? (existingSubtask.goalId ? String(existingSubtask.goalId) : "none") : "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        estimatedMinutes: "60",
        goalId: "",
      });
    }
  }, [open, existingSubtask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        estimatedMinutes: parseInt(formData.estimatedMinutes) || 60,
        goalId: formData.goalId && formData.goalId !== "none" ? parseInt(formData.goalId) : null,
        overrideGoal: formData.goalId !== "",
      };

      if (mode === 'create') {
        const validatedData = insertSubtaskSchema.parse({
          ...data,
          parentTaskId: parentTaskId!,
        });
        onSubmit(validatedData);
      } else {
        const validatedData = updateSubtaskSchema.parse(data);
        onSubmit(validatedData);
      }
    } catch (error) {
      console.error('Form validation error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Subtask' : 'Edit Subtask'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter subtask title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter subtask description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedMinutes">Estimated Time (minutes)</Label>
            <Input
              id="estimatedMinutes"
              type="number"
              min="5"
              max="480"
              value={formData.estimatedMinutes}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedMinutes: e.target.value }))}
              placeholder="60"
            />
          </div>

          <div className="space-y-2">
            <Label>Goal (optional)</Label>
            <Select
              value={formData.goalId}
              onValueChange={(v) => setFormData(prev => ({ ...prev, goalId: v === "inherit" ? "" : v }))}
            >
              <SelectTrigger className="data-[placeholder]:text-xs data-[placeholder]:italic"><SelectValue placeholder="Inherit from task" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit" className="text-xs text-muted-foreground italic">Inherit from task</SelectItem>
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
              {isLoading ? "Saving..." : (mode === 'create' ? "Create Subtask" : "Save Changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}