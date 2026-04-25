import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useElapsedMinutes, formatElapsed } from "@/hooks/useElapsedTime";
import { useActiveSubtask, useUpdateSubtask } from "@/hooks/useTasks";
import { Square } from "lucide-react";

export default function ActiveTaskIndicator() {
  const { data: activeSubtask, isLoading } = useActiveSubtask();
  const updateSubtask = useUpdateSubtask();
  const elapsed = useElapsedMinutes(activeSubtask?.activatedAt);

  if (isLoading) return null;

  const hasActive = !!activeSubtask;
  const timerText = hasActive ? formatElapsed(elapsed) : null;
  const label = hasActive ? activeSubtask.title : "No active task";

  const handleStop = () => {
    if (!activeSubtask) return;
    updateSubtask.mutate({ id: activeSubtask.id, updates: { status: 'pending' } });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={hasActive ? handleStop : undefined}
          className={`flex items-center gap-2 px-2 h-8 rounded-md text-xs select-none group transition-colors ${
            hasActive ? "cursor-pointer hover:bg-muted" : "cursor-default"
          }`}
        >
          {/* Status dot / stop icon */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {hasActive && (
              <span className="absolute inset-0 rounded-full bg-green-500/40 animate-ping [animation-duration:5s]" />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              hasActive ? "bg-green-500 group-hover:hidden" : "bg-muted-foreground/30"
            }`} />
            {hasActive && (
              <Square className="relative hidden group-hover:inline-flex h-2.5 w-2.5 fill-red-500 text-red-500" />
            )}
          </span>

          {hasActive ? (
            <>
              <span className="truncate max-w-[140px] text-foreground font-medium">
                {label}
              </span>
              <span className="tabular-nums text-green-500 font-semibold shrink-0">
                {timerText}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground/50">Idle</span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {hasActive ? "Click to stop active task" : "No active task"}
      </TooltipContent>
    </Tooltip>
  );
}
