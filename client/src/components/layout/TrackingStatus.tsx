import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Radio, Pause, WifiOff, Loader2 } from "lucide-react";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { activityApi } from "@/lib/api";

export default function TrackingStatus() {
  const { connected, paused, loading, refresh } = useConnectionStatus();
  const [toggling, setToggling] = useState(false);

  const handleClick = async () => {
    if (loading || toggling) return;
    setToggling(true);
    try {
      if (connected) {
        await activityApi.pause();
      } else if (paused) {
        await activityApi.resume();
      }
      // If disconnected, just recheck status
      await refresh();
    } catch {
      // Silently fail, status will update on next poll
    } finally {
      setToggling(false);
    }
  };

  const isWorking = loading || toggling;

  let icon: React.ReactNode;
  let label: string;
  let color: string;

  if (isWorking) {
    icon = <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    label = "Checking...";
    color = "text-muted-foreground";
  } else if (connected) {
    icon = <Radio className="h-3.5 w-3.5" />;
    label = "Tracking";
    color = "text-green-500";
  } else if (paused) {
    icon = <Pause className="h-3.5 w-3.5" />;
    label = "Paused";
    color = "text-amber-500";
  } else {
    icon = <WifiOff className="h-3.5 w-3.5" />;
    label = "Disconnected";
    color = "text-muted-foreground/50";
  }

  const tooltip = connected
    ? "Click to pause tracking"
    : paused
    ? "Click to resume tracking"
    : "Click to check again";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-1.5 px-2 ${color}`}
          onClick={handleClick}
          disabled={isWorking}
        >
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
