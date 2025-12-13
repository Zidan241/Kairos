import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ActivitySquare, Clock, Bell, Palette } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Settings() {
  const [notifications, setNotifications] = useState({
    taskReminders: true,
    focusBreaks: false,
    dailySummary: true,
    weeklyReport: true,
  });

  const [activityWatchConnected, setActivityWatchConnected] = useState(false);

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    console.log(`${key} notification ${!notifications[key] ? 'enabled' : 'disabled'}`);
  };

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
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Connection Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={activityWatchConnected ? "default" : "secondary"}>
                  {activityWatchConnected ? "Connected" : "Disconnected"}
                </Badge>
                {!activityWatchConnected && (
                  <span className="text-sm text-muted-foreground">
                    Make sure ActivityWatch is running
                  </span>
                )}
              </div>
            </div>
            <Button 
              variant={activityWatchConnected ? "outline" : "default"}
              onClick={() => {
                setActivityWatchConnected(!activityWatchConnected);
                console.log(activityWatchConnected ? 'Disconnected from ActivityWatch' : 'Connected to ActivityWatch');
              }}
              data-testid="button-activitywatch-toggle"
            >
              {activityWatchConnected ? "Disconnect" : "Connect"}
            </Button>
          </div>
          {activityWatchConnected && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Server URL</Label>
                <Input value="http://localhost:5600" readOnly />
              </div>
              <div>
                <Label>Last Sync</Label>
                <Input value="2 minutes ago" readOnly />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Focus Settings */}
      <Card>
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
      </Card>

      {/* Notification Settings */}
      <Card>
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
    </div>
  );
}