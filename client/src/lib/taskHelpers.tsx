import {
  Flame,
  ArrowUp,
  Circle,
  Minus,
  Clock,
  AlertTriangle,
} from "lucide-react";

export class TaskHelpers {
  static formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  static isOverdue(isCompleted: boolean, deadline: string | null): boolean {
    if (!deadline || isCompleted) return false;
    return new Date(deadline) < new Date();
  }

  static getTaskPriority(priority: string) {
    switch (priority) {
      case "urgent":
        return { text: "urgent", icon: <Flame className="h-3 w-3" /> };
      case "high":
        return { text: "high", icon: <ArrowUp className="h-3 w-3" /> };
      case "medium":
        return { text: "medium", icon: <Circle className="h-2 w-2" /> };
      case "low":
        return { text: "low", icon: <Minus className="h-3 w-3" /> };
      default:
        return { text: "medium", icon: <Circle className="h-2 w-2" /> };
    }
  }

  static getTaskDeadlineUrgency(dueDate: string | null) {
    const now = new Date();
    const deadline = dueDate ? new Date(dueDate) : null;

    if (!deadline) return null;

    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 0) {
      return { icon: <AlertTriangle className="h-3 w-3" />, variant: "destructive" as const, text: "Overdue" };
    } else if (daysUntilDeadline === 0) {
      return { icon: <AlertTriangle className="h-3 w-3" />, variant: "destructive" as const, text: "Due Today" };
    } else if (daysUntilDeadline === 1) {
      return { icon: <Clock className="h-3 w-3" />, variant: "outline" as const, text: "Due Tomorrow" };
    } else if (daysUntilDeadline <= 3) {
      return { icon: <Clock className="h-3 w-3" />, variant: "outline" as const, text: "Due Soon" };
    } else if (daysUntilDeadline <= 7) {
      return { icon: <Clock className="h-3 w-3" />, variant: "outline" as const, text: "Due This Week" };
    }

    return null;
  }

  static getBadgeTheme = (type: 'completed' | 'waiting' | 'active' | 'in-progress' | 'priority' | 'deadline-urgent' | 'deadline-warning') => {
    const themes = {
      completed: "bg-status-success/10 text-status-success-foreground border-status-success/20",
      waiting: "bg-muted/50 text-muted-foreground border-muted-foreground/20 dark:bg-muted/30 dark:text-muted-foreground dark:border-muted-foreground/30",
      active: "bg-status-info/10 text-status-info-foreground border-status-info/20",
      'in-progress': "bg-status-info/10 text-status-info-foreground border-status-info/20",
      priority: "bg-status-active/10 text-status-active-foreground border-status-active/20",
      'deadline-urgent': "bg-status-danger/10 text-status-danger-foreground border-status-danger/20",
      'deadline-warning': "bg-status-warning/10 text-status-warning-foreground border-status-warning/20"
    };
    return themes[type];
  };

  static getStrokeColor(isCompleted: boolean, isOverTime: boolean, progress: number): string {
    if (isCompleted) return "hsl(var(--chart-2))";
    if (isOverTime) return "hsl(var(--chart-5))";
    if (progress > 80) return "hsl(var(--chart-3))";
    return "hsl(var(--muted-foreground))";
  }

  static getStatusColor(isCompleted: boolean, isOverTime: boolean, progress: number): string {
    if (isCompleted) return "text-muted-foreground";
    if (isOverTime) return "text-chart-5";
    if (progress > 80) return "text-chart-3";
    return "text-muted-foreground";
  }

  static groupAppsByUsage(apps: Array<{ app: string; minutes: number; percentage: number }>, threshold: number = 5) {
    const sortedApps = apps.sort((a, b) => b.percentage - a.percentage);
    const significantApps = sortedApps.filter(app => app.percentage >= threshold);
    const otherApps = sortedApps.filter(app => app.percentage < threshold);
    
    const result = [...significantApps];
    
    if (otherApps.length > 0) {
      const othersTotalMinutes = otherApps.reduce((sum, app) => sum + app.minutes, 0);
      const othersPercentage = otherApps.reduce((sum, app) => sum + app.percentage, 0);
      result.push({
        app: `Others (${otherApps.length} apps)`,
        minutes: othersTotalMinutes,
        percentage: othersPercentage
      });
    }
    
    return result;
  }
}