import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { type InsertTask, type UpdateTask, insertTaskSchema, updateTaskSchema } from "@shared/schema";
import { type TaskWithMetrics } from "@shared/types";
import { useGoalsList } from "@/hooks/useGoals";

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertTask | UpdateTask) => void;
  isLoading?: boolean;
  existingTask?: TaskWithMetrics | null;
}

export function TaskModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading, 
  existingTask 
}: TaskModalProps) {
  const mode = existingTask ? 'edit' : 'create';
  const { data: goalsList } = useGoalsList(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    goalId: "" as string,
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    if (!open) return;

    if (existingTask) {
      setFormData({
        title: existingTask.title,
        description: existingTask.description || "",
        priority: existingTask.priority || "medium",
        goalId: existingTask.goalId ? String(existingTask.goalId) : "",
      });
      setSelectedDate(existingTask.dueDate ? new Date(existingTask.dueDate) : undefined);
    } else {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        goalId: "",
      });
      setSelectedDate(undefined);
    }
  }, [open, existingTask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        dueDate: selectedDate?.toISOString(),
        goalId: formData.goalId ? parseInt(formData.goalId) : null,
      };

      if (mode === 'create') {
        const validatedData = insertTaskSchema.parse(data);
        onSubmit(validatedData);
      } else {
        const validatedData = updateTaskSchema.parse({
          ...data,
          dueDate: selectedDate?.toISOString() || null,
        });
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
          <DialogTitle>{mode === 'create' ? 'Create New Task' : 'Edit Task'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter task description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
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
              {isLoading ? "Saving..." : (mode === 'create' ? "Create Task" : "Save Changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}