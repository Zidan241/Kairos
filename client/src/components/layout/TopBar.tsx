import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ThemeToggle from "./ThemeToggle";
import TrackingStatus from "./TrackingStatus";
import ActiveTaskIndicator from "./ActiveTaskIndicator";
import AppInfoModal from "@/components/AppInfoModal";

function RefreshButton() {
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    qc.invalidateQueries().then(() => setTimeout(() => setSpinning(false), 400));
  }, [qc]);

  return (
    <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh data">
      <RefreshCw className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
    </Button>
  );
}

export default function TopBar() {
  return (
    <header className="flex items-center justify-between pt-1.5 pb-2.5 px-4 border-b bg-background">
      <div className="flex items-center gap-4 no-drag">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <h1 className="text-lg font-bold font-brand tracking-tight text-foreground">Kairos</h1>
      </div>
      <div className="flex items-center gap-1 no-drag">
        <ActiveTaskIndicator />
        <div className="h-4 w-px bg-border" />
        <TrackingStatus />
        <div className="h-4 w-px bg-border" />
        <RefreshButton />
        <ThemeToggle />
        <AppInfoModal />
      </div>
    </header>
  );
}
