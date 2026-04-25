import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AppInfoModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How Kairos Works</DialogTitle>
        </DialogHeader>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Focus</span> — Plan your day, activate tasks to track time, see your real activity timeline
          </li>
          <li>
            <span className="font-medium text-foreground">Plan</span> — Schedule tasks and subtasks across days, drag to reorder or reschedule
          </li>
          <li>
            <span className="font-medium text-foreground">Habits</span> — Recurring tasks with streaks, skip when needed, track time the same way
          </li>
          <li>
            <span className="font-medium text-foreground">Reflect</span> — Daily productivity breakdown: focus vs distraction, app usage, plan accuracy
          </li>
          <li>
            <span className="font-medium text-foreground">Goals</span> — Group tasks and habits to analyze time spent per goal
          </li>
          <li>
            <span className="font-medium text-foreground">Notes</span> — Markdown notes attached to any subtask
          </li>
          <li>
            <span className="font-medium text-foreground">ActivityWatch</span> — Runs in the background to classify your app usage as focus/distraction/idle
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
