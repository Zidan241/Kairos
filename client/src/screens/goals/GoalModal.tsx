import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { type Goal, type InsertGoal, type UpdateGoal } from "@shared/schema";

export function GoalModal({ open, onOpenChange, onSubmit, isLoading, existingGoal }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: InsertGoal | Partial<UpdateGoal>) => void;
  isLoading?: boolean;
  existingGoal?: Goal | null;
}) {
  const mode = existingGoal ? 'edit' : 'create';
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setTitle(existingGoal?.title ?? "");
      setDescription(existingGoal?.description ?? "");
    }
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New Goal' : 'Edit Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Learning, Fitness..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-desc">Description</Label>
            <Textarea
              id="goal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
