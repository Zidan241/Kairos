import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ActivitySquare, Palette, Info, Database, RefreshCw, Download, ExternalLink, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useElectron, isElectron } from "@/hooks/useElectron";
import { databaseApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";

export default function Settings() {
  const electron = useElectron();
  const isElectronApp = isElectron();
  const { toast } = useToast();
  const { connected: activityWatchConnected, paused: activityWatchPaused, loading: statusLoading, lastChecked, refresh: refreshStatus } = useConnectionStatus();

  const statusLoaded = !statusLoading;

  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [logPath, setLogPath] = useState<string | null>(null);
  const [dbInfo, setDbInfo] = useState<{ path: string; size: number; lastBackup: string | null } | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);

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
      await refreshStatus();
      if (activityWatchConnected) {
        toast({ title: "ActivityWatch Detected", description: "ActivityWatch is running and connected." });
      } else {
        toast({ title: "Not Running", description: "ActivityWatch is not running. Please start it and try again." });
      }
    } finally {
      setIsRechecking(false);
    }
  };

  // Load data
  useEffect(() => {
    databaseApi.getInfo().then(info => {
      if (info.exists) setDbInfo({ path: info.path, size: info.size, lastBackup: info.lastBackup });
    }).catch(() => { });

    // Electron-only data
    if (!electron) return;
    electron.getAppVersion().then(setAppVersion).catch(() => { });
    electron.getLogPath().then(setLogPath).catch(() => { });
  }, [electron]);

  return (
    <div className="p-6 space-y-6 w-full">
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
          {statusLoaded && !activityWatchConnected && !activityWatchPaused && (
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

          {/* Running or paused - show status info */}
          {(!statusLoaded || activityWatchConnected || activityWatchPaused) && (
            <>
              <div className="space-y-0.5">
                <Label>Connection Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={activityWatchConnected ? "default" : "secondary"}>
                    {activityWatchConnected ? "Connected" : activityWatchPaused ? "Paused" : "Disconnected"}
                  </Badge>
                  {!statusLoaded && !activityWatchPaused && (
                    <span className="text-sm text-muted-foreground">
                      Checking...
                    </span>
                  )}
                </div>
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
            {logPath && (
              <div className="space-y-0.5">
                <Label>Log File</Label>
                <p className="text-sm text-muted-foreground truncate max-w-md" title={logPath}>
                  {logPath}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}