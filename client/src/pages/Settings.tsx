import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ActivitySquare, Palette, Info, Database, RefreshCw, Download, ExternalLink, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { useElectron, isElectron, useVersions } from "@/hooks/useElectron";
import { activityApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_ACTIVITY_WATCH_URL } from "@shared/constants.js";

export default function Settings() {
  const electron = useElectron();
  const versions = useVersions();
  const isElectronApp = isElectron();
  const { toast } = useToast();

  // const [notifications, setNotifications] = useState({
  //   taskReminders: true,
  //   focusBreaks: false,
  //   dailySummary: true,
  //   weeklyReport: true,
  // });
  // const handleNotificationChange = (key: keyof typeof notifications) => {
  //   setNotifications(prev => ({
  //     ...prev,
  //     [key]: !prev[key]
  //   }));
  //   console.log(`${key} notification ${!notifications[key] ? 'enabled' : 'disabled'}`);
  // };

  const [activityWatchConnected, setActivityWatchConnected] = useState(false);
  const [activityWatchInstalled, setActivityWatchInstalled] = useState<boolean | null>(null);
  const [manageActivityWatch, setManageActivityWatch] = useState(false);
  const [activityWatchPath, setActivityWatchPath] = useState('');
  const [activityWatchUrl, setActivityWatchUrl] = useState(DEFAULT_ACTIVITY_WATCH_URL);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [dbInfo, setDbInfo] = useState<{ path: string; size: number } | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);

  const refreshStatus = async () => {
    try {
      const status = electron
        ? await electron.getActivityWatchStatus()
        : await activityApi.getStatus();
      setActivityWatchInstalled(status.available);
      setActivityWatchConnected(status.running);
      setLastChecked(new Date());
      return status;
    } catch {
      return null;
    }
  };

  const handleToggleConnection = async () => {
    if (!electron || isToggling) return;
    setIsToggling(true);

    try {
      if (activityWatchConnected) {
        await electron.stopActivityWatch();
        toast({
          title: manageActivityWatch ? "Stopped" : "Disconnected",
          description: manageActivityWatch
            ? "ActivityWatch has been stopped."
            : "ActivityWatch has been disconnected.",
        });
      } else {
        await electron.startActivityWatch();
        toast({
          title: manageActivityWatch ? "Started" : "Connected",
          description: manageActivityWatch
            ? "ActivityWatch has been started and is tracking."
            : "ActivityWatch is now connected and tracking.",
        });
      }
      await refreshStatus();
    } catch (e: any) {
      const action = activityWatchConnected
        ? (manageActivityWatch ? "stop" : "disconnect from")
        : (manageActivityWatch ? "start" : "connect to");
      toast({
        title: manageActivityWatch ? "Operation Failed" : "Connection Failed",
        description: `Could not ${action} ActivityWatch. ${e?.message || "Please try again."}`,
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleRecheck = async () => {
    if (isRechecking) return;
    setIsRechecking(true);
    try {
      const status = await refreshStatus();
      if (status?.available) {
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

    // Electron-only data
    if (!electron) return;
    electron.getAppVersion().then(setAppVersion).catch(() => { });
    electron.getDatabaseInfo().then(info => {
      if (info.exists) setDbInfo({ path: info.path, size: info.size });
    }).catch(() => { });
    electron.getSettings().then(settings => {
      setManageActivityWatch(settings.manageActivityWatch);
      setActivityWatchPath(settings.activityWatchPath || '');
      setActivityWatchUrl(settings.activityWatchUrl || DEFAULT_ACTIVITY_WATCH_URL);
    }).catch(() => { });
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
          {/* Not installed - show install instructions */}
          {activityWatchInstalled === false && (
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
                {isRechecking ? "Checking..." : "Recheck Installation"}
              </Button>
            </div>
          )}

          {/* Installed - show connection controls */}
          {activityWatchInstalled !== false && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Connection Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={activityWatchConnected ? "default" : "secondary"}>
                      {activityWatchConnected ? "Connected" : "Disconnected"}
                    </Badge>
                    {activityWatchInstalled === null && (
                      <span className="text-sm text-muted-foreground">
                        Checking...
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant={activityWatchConnected ? "outline" : "default"}
                  disabled={activityWatchInstalled === null || !isElectronApp || isToggling}
                  onClick={handleToggleConnection}
                  data-testid="button-activitywatch-toggle"
                >
                  {activityWatchConnected
                    ? (manageActivityWatch ? "Stop" : "Disconnect")
                    : (manageActivityWatch ? "Start" : "Connect")}
                </Button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Server URL</Label>
                  <Label className="text-muted-foreground font-normal">
                    Last Checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
                  </Label>
                </div>
                <Input
                  value={activityWatchUrl}
                  readOnly={!isElectronApp}
                  onChange={(e) => setActivityWatchUrl(e.target.value)}
                  onBlur={async () => {
                    if (electron) {
                      await electron.setSettings({ activityWatchUrl: activityWatchUrl.trim() });
                    }
                  }}
                  data-testid="input-aw-url"
                />
              </div>

              {/* Manage AW lifecycle toggle - Electron only */}
              {isElectronApp && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Manage ActivityWatch Lifecycle</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically start ActivityWatch when Kairos opens and stop it when Kairos closes
                    </p>
                  </div>
                  <Switch
                    checked={manageActivityWatch}
                    onCheckedChange={async (checked) => {
                      setManageActivityWatch(checked);
                      if (electron) {
                        await electron.setSettings({ manageActivityWatch: checked });
                      }
                    }}
                    data-testid="switch-manage-aw"
                  />
                </div>
              )}

              {/* Custom executable path - Electron only */}
              {isElectronApp && (
                <div className="space-y-1.5">
                  <Label htmlFor="aw-path">ActivityWatch Executable Path</Label>
                  <p className="text-sm text-muted-foreground">
                    Path to the ActivityWatch executable. Change if installed in a non-standard location.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="aw-path"
                      placeholder="Path to aw-qt executable"
                      value={activityWatchPath}
                      onChange={(e) => setActivityWatchPath(e.target.value)}
                      onBlur={async () => {
                        if (electron) {
                          await electron.setSettings({ activityWatchPath: activityWatchPath.trim() });
                        }
                      }}
                      data-testid="input-aw-path"
                    />
                    {activityWatchPath && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          setActivityWatchPath('');
                          if (electron) {
                            await electron.setSettings({ activityWatchPath: '' });
                          }
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Focus Settings */}
      {/* <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Focus Settings</CardTitle>
          </div>
          <CardDescription>
            Configure focus tracking and break reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pomodoro-duration">Pomodoro Duration</Label>
              <Input 
                id="pomodoro-duration"
                type="number" 
                defaultValue="25" 
                min="15" 
                max="60"
                data-testid="input-pomodoro-duration"
              />
              <p className="text-xs text-muted-foreground mt-1">Minutes</p>
            </div>
            <div>
              <Label htmlFor="break-duration">Break Duration</Label>
              <Input 
                id="break-duration"
                type="number" 
                defaultValue="5" 
                min="1" 
                max="30"
                data-testid="input-break-duration"
              />
              <p className="text-xs text-muted-foreground mt-1">Minutes</p>
            </div>
          </div>
          <div>
            <Label htmlFor="daily-goal">Daily Focus Goal</Label>
            <Input 
              id="daily-goal"
              type="number" 
              defaultValue="6" 
              min="1" 
              max="16"
              data-testid="input-daily-goal"
            />
            <p className="text-xs text-muted-foreground mt-1">Hours per day</p>
          </div>
        </CardContent>
      </Card> */}

      {/* Notification Settings */}
      {/* <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Manage your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Task Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when task estimates are reached
                </p>
              </div>
              <Switch
                checked={notifications.taskReminders}
                onCheckedChange={() => handleNotificationChange('taskReminders')}
                data-testid="switch-task-reminders"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Focus Break Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Reminder to take breaks during long focus sessions
                </p>
              </div>
              <Switch
                checked={notifications.focusBreaks}
                onCheckedChange={() => handleNotificationChange('focusBreaks')}
                data-testid="switch-focus-breaks"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Summary</Label>
                <p className="text-sm text-muted-foreground">
                  End-of-day productivity summary
                </p>
              </div>
              <Switch
                checked={notifications.dailySummary}
                onCheckedChange={() => handleNotificationChange('dailySummary')}
                data-testid="switch-daily-summary"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Report</Label>
                <p className="text-sm text-muted-foreground">
                  Weekly productivity insights and trends
                </p>
              </div>
              <Switch
                checked={notifications.weeklyReport}
                onCheckedChange={() => handleNotificationChange('weeklyReport')}
                data-testid="switch-weekly-report"
              />
            </div>
          </div>
        </CardContent>
      </Card> */}

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

      {/* Database - shown when running in Electron */}
      {isElectronApp && dbInfo && (
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
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (electron) {
                    try {
                      const backupPath = await electron.backupDatabase();
                      toast({
                        title: "Backup Created",
                        description: `Database backed up to ${backupPath}`,
                      });
                    } catch (e: any) {
                      toast({
                        title: "Backup Failed",
                        description: e?.message || "Could not create database backup.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}