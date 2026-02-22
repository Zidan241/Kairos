import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import Onboarding from "@/components/Onboarding";
import Home from "@/pages/Home";
import Planning from "@/pages/Planning";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { isElectron } from "@/hooks/useElectron";

const isMacElectron = isElectron() && navigator.platform.toLowerCase().includes('mac');
const ONBOARDING_COMPLETE_KEY = "kairos_onboarding_complete";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/planning" component={Planning} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Apply stored theme immediately so onboarding respects it
    // const stored = localStorage.getItem("theme");
    // document.documentElement.classList.toggle("dark", stored === "dark");

    const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    setShowOnboarding(completed !== "true");
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    setShowOnboarding(false);
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Wait for onboarding check
  if (showOnboarding === null) {
    return null;
  }

  // Show onboarding on first launch
  if (showOnboarding) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Onboarding onComplete={handleOnboardingComplete} />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <WouterRouter hook={useHashLocation}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className={`flex flex-col h-screen w-full ${isMacElectron ? 'macos-titlebar-layout' : ''}`}>
            {isMacElectron && (
              <div className="macos-titlebar-bar shrink-0 bg-sidebar draggable-header border-b" />
            )}
            <div className="flex flex-1 min-h-0">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between pt-1.5 pb-2.5 px-4 border-b bg-background">
                  <div className="flex items-center gap-4 no-drag">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <h1 className="text-lg font-bold font-brand tracking-tight text-foreground">Kairos</h1>
                  </div>
                  <div className="flex items-center gap-4 no-drag">
                    <ThemeToggle />
                  </div>
                </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-clean">
                  <Router />
                </main>
              </div>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
    </WouterRouter>
    </ErrorBoundary>
  );
}