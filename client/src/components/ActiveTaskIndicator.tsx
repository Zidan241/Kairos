import { useQuery } from "@tanstack/react-query";
import { subtasksApi } from "@/lib/api";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ACTIVITY_CONFIG } from "@shared/constants.js";
import { PlayCircle, CircleDashed } from "lucide-react";

export default function ActiveTaskIndicator() {
  const { data: activeSubtask, isLoading } = useQuery({
    queryKey: ['subtasks', 'active'],
    queryFn: subtasksApi.getActive,
    refetchInterval: ACTIVITY_CONFIG.METRICS_CACHE_TIME_MS,
  });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  if (isLoading) return null;

  const hasActive = !!activeSubtask;
  const label = hasActive ? activeSubtask.title : "No active task";

  const Icon = hasActive ? PlayCircle : CircleDashed;
  const iconClass = hasActive
    ? "text-green-500 drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]"
    : "text-muted-foreground/40";

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center">
            <Icon className={`size-4 shrink-0 ${iconClass}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
      <Icon className={`size-4 shrink-0 ${iconClass}`} />
      <span className="truncate">{label}</span>
    </div>
  );
}
