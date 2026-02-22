import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export default function ConnectionIndicator() {
  const { connected, paused, loading } = useConnectionStatus();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const label = loading
    ? "Checking…"
    : paused
      ? "AW Paused"
      : connected
        ? "AW Connected"
        : "AW Disconnected";

  const Icon = loading ? Loader2 : (connected && !paused) ? Wifi : WifiOff;
  const iconClass = loading
    ? "text-muted-foreground/40 animate-spin"
    : paused
      ? "text-muted-foreground"
      : connected
        ? "text-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]"
        : "text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]";

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
