import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUp,
  ArrowDown,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { useUpdateTask, useDeleteTask, useCreateTask, useCreateSubtask, useUpdateSubtask, useDeleteSubtask, usePlanningTasks, useScheduledSubtasks } from "@/hooks/useTasks";
import { TaskModal } from "./TaskModal";
import { SubtaskModal } from "./SubtaskModal";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useToast } from "@/hooks/useToast";
import TaskCard from "./TaskCard";
import { InsertSubtask, UpdateSubtask, UpdateTask, type InsertTask, type Subtask } from "@shared/schema";
import { SubtaskWithMetrics, TaskWithMetrics } from "@shared/types";
import { Button } from "@/components/ui/button";
import { dateUtils } from "@shared/utils";

export default function PlanningView() {
  const [sortBy, setSortBy] = useState<string>("urgency");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Separate modal states
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTaskForModal, setEditingTaskForModal] = useState<TaskWithMetrics | null>(null);
  
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [editingSubtaskForModal, setEditingSubtaskForModal] = useState<SubtaskWithMetrics | null>(null);
  const [parentTaskIdForModal, setParentTaskIdForModal] = useState<number | null>(null);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });
  
  // Use real API data instead of mock data
  const { data: allTasks = [], isLoading, error } = usePlanningTasks(sortBy, sortOrder);
  
  // Separate completed and incomplete tasks
  const backlogTasks = allTasks.filter((task: TaskWithMetrics) => !task.isCompleted);
  const completedTasks = allTasks.filter((task: TaskWithMetrics) => task.isCompleted);

  // Mutation hooks for task and subtask operations
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const createTaskMutation = useCreateTask();
  const createSubtaskMutation = useCreateSubtask();
  const updateSubtaskMutation = useUpdateSubtask();
  const deleteSubtaskMutation = useDeleteSubtask();
  
  // Toast hook for notifications
  const { toast } = useToast();

  // Helper function to show confirmation dialog
  const showConfirmation = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      onConfirm,
    });
  };


  // Early returns for loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-muted-foreground">Failed to load tasks</p>
          <p className="text-sm text-red-500">{error.message}</p>
        </div>
      </div>
    );
  }

  // Event handlers
  const handleToggleDayPlan = (subtaskId: number, isPlannedOnDate: boolean) => {
      updateSubtaskMutation.mutate(
      { id: subtaskId, updates: isPlannedOnDate 
        ? { scheduledDate: null, scheduledStartTime: null } 
        : { scheduledDate: dateUtils.getTodayDate(), scheduledStartTime: null } 
      },
      {
        onSuccess: () => {
          toast({
            title: isPlannedOnDate ? "Task Removed from Today" : "Task Added to Today",
            description: `Subtask has been ${isPlannedOnDate ? 'removed from' : 'added to'} today's plan`,
          });
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to ${isPlannedOnDate ? 'remove' : 'add'} subtask ${isPlannedOnDate ? 'from' : 'to'} today's plan`,
          });
        },
      }
    );
  };

  const handleCompleteTask = (taskId: number, isCompleted: boolean) => {
    updateTaskMutation.mutate(
      { id: taskId, updates: { isCompleted: !isCompleted } },
      {
        onSuccess: () => {
          toast({
            title: "Task Updated",
            description: `Task has been marked as ${!isCompleted ? 'completed' : 'incomplete'}`,
          });
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update task",
          });
        },
      }
    );
  };

  const handleCompleteSubtask = (subtaskId: number, currentStatus: Subtask['status']) => {
    updateSubtaskMutation.mutate(
      { id: subtaskId, updates: { status: currentStatus === 'completed' ? 'pending' : 'completed' } },
      {
        onSuccess: () => {
          toast({
            title: "Subtask Updated",
            description: `Subtask has been marked as ${currentStatus !== 'completed' ? 'completed' : 'incomplete'}`,
          });
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update subtask",
          });
        },
      }
    );
  };

  // Separate modal handlers
  const handleOpenTaskModal = () => {
    setEditingTaskForModal(null);
    setTaskModalOpen(true);
  };

  const handleOpenSubtaskModal = (parentTaskId: number) => {
    setParentTaskIdForModal(parentTaskId);
    setEditingSubtaskForModal(null);
    setSubtaskModalOpen(true);
  };

  const handleEditTaskModal = (task: TaskWithMetrics) => {
    setEditingTaskForModal(task);
    setTaskModalOpen(true);
  };

  const handleEditSubtaskModal = (subtask: SubtaskWithMetrics) => {
    setEditingSubtaskForModal(subtask);
    setSubtaskModalOpen(true);
  };

  const handleTaskModalSubmit = (data: any) => {
    if (editingTaskForModal) {
      handleSaveTask(editingTaskForModal.id, data);
    } else {
      handleCreateTask(data);
    }
    setTaskModalOpen(false);
  };

  const handleSubtaskModalSubmit = (data: any) => {
    if (editingSubtaskForModal) {
      handleSaveSubtask(editingSubtaskForModal.id, data);
    } else {
      handleCreateSubtask(data);
    }
    setSubtaskModalOpen(false);
  };

  const handleCreateTask = (taskData: InsertTask) => {
    const parentTaskData = {
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
    };

    createTaskMutation.mutate(parentTaskData, {
      onSuccess: () => {
        toast({
          title: "Task Created",
          description: "New task has been created successfully",
        });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create task",
        });
      },
    });
  };

  const handleCreateSubtask = (subtaskData: InsertSubtask) => {
    // This is a subtask only
    const newSubtaskData = {
      parentTaskId: parentTaskIdForModal!,
      title: subtaskData.title,
      description: subtaskData.description,
      estimatedMinutes: subtaskData.estimatedMinutes,
    };

    createSubtaskMutation.mutate(newSubtaskData, {
      onSuccess: () => {
        toast({
          title: "Subtask Created",
          description: "New subtask has been created successfully",
        });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create subtask",
        });
      },
    });
  };

  const handleSaveTask = (taskId: number, updates: UpdateTask) => {
    updateTaskMutation.mutate(
      { id: taskId, updates },
      {
        onSuccess: () => {
          toast({
            title: "Task Updated",
            description: "Task has been updated successfully",
          });
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update task",
          });
        },
      }
    );
  };

  const handleSaveSubtask = (subtaskId: number, updates: UpdateSubtask) => {
    updateSubtaskMutation.mutate(
      { id: subtaskId, updates },
      {
        onSuccess: () => {
          toast({
            title: "Subtask Updated",
            description: "Subtask has been updated successfully",
          });
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update subtask",
          });
        },
      }
    );
  };

  const handleDeleteTask = (taskId: number) => {
    showConfirmation(
      "Delete Task",
      "Are you sure you want to delete this task? This will also delete all its subtasks.",
      () => {
        deleteTaskMutation.mutate(taskId, {
          onSuccess: () => {
            toast({
              title: "Task Deleted",
              description: "Task has been deleted successfully",
            });
          },
          onError: (error: any) => {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to delete task",
            });
          },
        });
      }
    );
  };

  const handleDeleteSubtask = (subtaskId: number) => {
    showConfirmation(
      "Delete Subtask",
      "Are you sure you want to delete this subtask?",
      () => {
        deleteSubtaskMutation.mutate(subtaskId, {
          onSuccess: () => {
            toast({
              title: "Subtask Deleted",
              description: "Subtask has been deleted successfully",
            });
          },
          onError: (error: any) => {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to delete subtask",
            });
          },
        });
      }
    );
  };
  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Planning</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition-colors"
              title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
            >
              {sortOrder === "asc" ? (
                <ArrowUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40" data-testid="select-sort">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgency">Urgency</SelectItem>
                <SelectItem value="creation">Creation Date</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleOpenTaskModal} data-testid="button-new-task">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="backlog" className="h-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="backlog" data-testid="tab-backlog">
            Backlog ({backlogTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backlog" className="mt-6">
          <div className="space-y-4 pb-12">
            {backlogTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create a task to get started</p>
              </div>
            ) : (
              backlogTasks.map((task) => (
                <TaskCard
                  key={task.id} 
                  task={task}
                  handleCompleteTask={handleCompleteTask}
                  handleCompleteSubtask={handleCompleteSubtask}
                  handleAddSubtask={handleOpenSubtaskModal}
                  handleEditTask={handleEditTaskModal}
                  handleEditSubtask={handleEditSubtaskModal}
                  handleDeleteTask={handleDeleteTask}
                  handleDeleteSubtask={handleDeleteSubtask}
                  handleToggleDayPlan={handleToggleDayPlan}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="space-y-4 pb-12">
            {completedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">No completed tasks</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Completed tasks will appear here</p>
              </div>
            ) : (
              completedTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task}
                  handleCompleteTask={handleCompleteTask}
                  handleCompleteSubtask={handleCompleteSubtask}
                  handleAddSubtask={handleOpenSubtaskModal}
                  handleEditTask={handleEditTaskModal}
                  handleEditSubtask={handleEditSubtaskModal}
                  handleDeleteTask={handleDeleteTask}
                  handleDeleteSubtask={handleDeleteSubtask}
                  handleToggleDayPlan={handleToggleDayPlan}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Separate Task and Subtask Modals */}
      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        onSubmit={handleTaskModalSubmit}
        isLoading={editingTaskForModal ? updateTaskMutation.isPending : createTaskMutation.isPending}
        existingTask={editingTaskForModal}
      />

      <SubtaskModal
        open={subtaskModalOpen}
        onOpenChange={setSubtaskModalOpen}
        onSubmit={handleSubtaskModalSubmit}
        isLoading={editingSubtaskForModal ? updateSubtaskMutation.isPending : createSubtaskMutation.isPending}
        parentTaskId={parentTaskIdForModal}
        existingSubtask={editingSubtaskForModal}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
