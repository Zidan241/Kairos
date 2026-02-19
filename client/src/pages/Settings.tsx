import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ActivitySquare, Palette, Info, Database, RefreshCw, Download, ExternalLink, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { useElectron, isElectron } from "@/hooks/useElectron";
import { activityApi, databaseApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
export default function Settings() {
  const electron = useElectron();
  const isElectronApp = isElectron();
  const { toast } = useToast();

  const [activityWatchConnected, setActivityWatchConnected] = useState(false);
  const [activityWatchPaused, setActivityWatchPaused] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [dbInfo, setDbInfo] = useState<{ path: string; size: number; lastBackup: string | null } | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);

  const refreshStatus = async () => {
    try {
      const status = await activityApi.getStatus();
      setActivityWatchPaused(status.paused);
      setActivityWatchConnected(status.running && !status.paused);
      setLastChecked(new Date());
      return status;
    } catch {
      return null;
    }
  };

  const handleToggleConnection = async () => {
    if (isToggling) return;
    setIsToggling(true);

    try {
      if (activityWatchConnected) {
        await activityApi.pause();
        toast({
          title: "Disconnected",
          description: "ActivityWatch has been disconnected.",
        });
      } else {
        await activityApi.resume();
        toast({
          title: "Connected",
          description: "ActivityWatch is now connected and tracking.",
        });
      }
      await refreshStatus();
    } catch (e: any) {
      const action = activityWatchConnected ? "disconnect from" : "connect to";
      toast({
        title: "Connection Failed",
        description: `Could not ${action} ActivityWatch. ${e?.message || "Please try again."}`,
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleBackup = async () => {
    try {
      const result = await databaseApi.backup();
      setDbInfo(prev => prev ? { ...prev, lastBackup: new Date().toISOString() } : prev);
      toast({
        title: "Backup Created",
        description: `Database backed up to ${result.path}`,
      });
    } catch (e: any) {
      toast({
        title: "Backup Failed",
        description: e?.message || "Could not create database backup.",
        variant: "destructive",
      });
    }
  };

  const handleRecheck = async () => {
    if (isRechecking) return;
    setIsRechecking(true);
    try {
      const status = await refreshStatus();
      if (status?.running) {
        toast({ title: "ActivityWatch Detected", description: "ActivityWatch installation found." });
      } else {
        toast({ title: "Not Found", description: "ActivityWatch was not detected. Please install it first.", variant: "destructive" });
      }
    } finally {
      setIsRechecking(false);
    }
  };

  // Load data
  useEffect(() => {
    refreshStatus();
    databaseApi.getInfo().then(info => {
      if (info.exists) setDbInfo({ path: info.path, size: info.size, lastBackup: info.lastBackup });
    }).catch(() => { });

    // Electron-only data
    if (!electron) return;
    electron.getAppVersion().then(setAppVersion).catch(() => { });
  }, [electron]);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* ActivityWatch Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ActivitySquare className="h-5 w-5" />
            <CardTitle>ActivityWatch Integration</CardTitle>
          </div>
          <CardDescription>
            Connect to ActivityWatch for automatic time tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Not running and not paused - show install instructions */}
          {lastChecked !== null && !activityWatchConnected && !activityWatchPaused && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Not Installed</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                ActivityWatch is required for automatic time tracking and focus detection.
                It's a free, open-source app that runs locally on your computer.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  onClick={() => window.open('https://activitywatch.net/downloads/', '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download ActivityWatch
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://docs.activitywatch.net/en/latest/getting-started.html', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Setup Guide
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                After installing, restart Kairos or click the button below to detect ActivityWatch.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={isRechecking}
                onClick={handleRecheck}
              >
                {isRechecking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isRechecking ? "Checking..." : "Check Again"}
              </Button>
            </div>
          )}

          {/* Running or paused - show connection controls */}
          {(lastChecked === null || activityWatchConnected || activityWatchPaused) && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Connection Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={activityWatchConnected ? "default" : "secondary"}>
                      {activityWatchConnected ? "Connected" : activityWatchPaused ? "Paused" : "Disconnected"}
                    </Badge>
                    {lastChecked === null && !activityWatchPaused && (
                      <span className="text-sm text-muted-foreground">
                        Checking...
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant={activityWatchConnected ? "outline" : "default"}
                  disabled={lastChecked === null || isToggling}
                  onClick={handleToggleConnection}
                  data-testid="button-activitywatch-toggle"
                >
                  {activityWatchConnected ? "Disconnect" : activityWatchPaused ? "Reconnect" : "Connect"}
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-normal">
                  Last Checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
                </Label>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize the look and feel of the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      {dbInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Database</CardTitle>
            </div>
            <CardDescription>
              Local database storage and backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Location</Label>
                <p className="text-sm text-muted-foreground truncate max-w-md" title={dbInfo.path}>
                  {dbInfo.path}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Size</Label>
                <p className="text-sm text-muted-foreground">
                  {(dbInfo.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Last Backup</Label>
                <p className="text-sm text-muted-foreground">
                  {dbInfo.lastBackup ? new Date(dbInfo.lastBackup).toLocaleString() : 'Never'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackup}
              >
                <Download className="h-4 w-4 mr-2" />
                Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* App Info - shown when running in Electron */}
      {isElectronApp && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              <CardTitle>App Info</CardTitle>
            </div>
            <CardDescription>
              Application version and system information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Version</Label>
                <p className="text-sm text-muted-foreground">{appVersion || 'Loading...'}</p>
              </div>
            </div>
            {dbInfo && (
              <div className="space-y-0.5">
                <Label>Data Directory</Label>
                <p className="text-sm text-muted-foreground truncate max-w-md" title={dbInfo.path.replace(/\/[^/]+$/, '')}>
                  {dbInfo.path.replace(/\/[^/]+$/, '')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}