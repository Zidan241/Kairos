import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, ArrowRight, Download, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { useElectron, isElectron } from "@/hooks/useElectron";
import { activityApi } from "@/lib/api";

interface OnboardingProps {
  onComplete: () => void;
}

type Step = "welcome" | "activitywatch" | "ready";

export default function Onboarding({ onComplete }: OnboardingProps) {
  const electron = useElectron();
  const isElectronApp = isElectron();
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [awStatus, setAwStatus] = useState<{ available: boolean; running: boolean } | null>(null);
  const [checking, setChecking] = useState(false);
  const [awPath, setAwPath] = useState('');

  // Check ActivityWatch status
  const checkActivityWatch = async () => {
    setChecking(true);
    try {
      const status = electron
        ? await electron.getActivityWatchStatus()
        : await activityApi.getStatus();
      setAwStatus(status);
    } catch (e) {
      console.error("Failed to check ActivityWatch:", e);
    }
    setChecking(false);
  };

  // Check on mount and when entering the activitywatch step
  useEffect(() => {
    if (currentStep === "activitywatch") {
      checkActivityWatch();
      if (electron) {
        electron.getSettings().then(s => setAwPath(s.activityWatchPath || '')).catch(() => {});
      }
    }
  }, [currentStep, electron]);

  const steps: { key: Step; label: string }[] = [
    { key: "welcome", label: "Welcome" },
    { key: "activitywatch", label: "ActivityWatch" },
    { key: "ready", label: "Ready" },
  ];

  const currentIndex = steps.findIndex(s => s.key === currentStep);

  const platform = typeof navigator !== "undefined" ? 
    (navigator.platform.toLowerCase().includes("mac") ? "mac" : 
     navigator.platform.toLowerCase().includes("win") ? "win" : "linux") : "win";

  const getDownloadUrl = () => {
    switch (platform) {
      case "mac":
        return "https://github.com/ActivityWatch/activitywatch/releases/latest/download/activitywatch-v0.13.1-macos-x86_64.dmg";
      case "win":
        return "https://github.com/ActivityWatch/activitywatch/releases/latest/download/activitywatch-v0.13.1-windows-x86_64-setup.exe";
      default:
        return "https://activitywatch.net/downloads/";
    }
  };

  const getInstallInstructions = () => {
    switch (platform) {
      case "mac":
        return (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>1. Download the DMG file</p>
            <p>2. Open the DMG and drag ActivityWatch to Applications</p>
            <p>3. Open ActivityWatch from Applications</p>
            <p>4. Allow it in System Preferences → Security & Privacy if prompted</p>
          </div>
        );
      case "win":
        return (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>1. Download and run the installer</p>
            <p>2. Follow the installation wizard</p>
            <p>3. ActivityWatch will start automatically</p>
          </div>
        );
      default:
        return (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Visit activitywatch.net for installation instructions for your platform.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-4">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${index <= currentIndex ? "text-primary" : "text-muted-foreground"}`}>
                {index < currentIndex ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className={`h-5 w-5 ${index === currentIndex ? "fill-primary" : ""}`} />
                )}
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 ${index < currentIndex ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card className="border-2">
          {currentStep === "welcome" && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Welcome to Kairos</CardTitle>
                <CardDescription className="text-base">
                  Your personal productivity companion for task management, day planning, and focus tracking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Plan Your Day</p>
                      <p className="text-sm text-muted-foreground">Schedule tasks and subtasks into your daily timeline</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Track Your Focus</p>
                      <p className="text-sm text-muted-foreground">Automatic focus detection with ActivityWatch integration</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Review Your Progress</p>
                      <p className="text-sm text-muted-foreground">Daily, weekly, and monthly productivity reports</p>
                    </div>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setCurrentStep("activitywatch")}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}

          {currentStep === "activitywatch" && (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">Set Up ActivityWatch</CardTitle>
                <CardDescription className="text-base">
                  ActivityWatch enables automatic time tracking and focus detection.
                  It's free, open-source, and runs locally on your computer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status indicator */}
                <div className="flex items-center justify-center gap-2">
                  {checking ? (
                    <Badge variant="secondary" className="gap-2">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Checking...
                    </Badge>
                  ) : awStatus?.available ? (
                    <Badge variant="default" className="gap-2 bg-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      ActivityWatch Detected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-2">
                      <Circle className="h-3 w-3" />
                      Not Detected
                    </Badge>
                  )}
                </div>

                {/* Show install instructions if not detected */}
                {!awStatus?.available && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button
                        variant="default"
                        onClick={() => window.open(getDownloadUrl(), "_blank")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download ActivityWatch
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open("https://docs.activitywatch.net/en/latest/getting-started.html", "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Setup Guide
                      </Button>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      {getInstallInstructions()}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={checkActivityWatch}
                      disabled={checking}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
                      Check Again
                    </Button>

                    {/* Custom executable path - Electron only */}
                    {isElectronApp && (
                    <div className="space-y-1.5">
                      <Label htmlFor="onboarding-aw-path" className="text-sm">Custom Executable Path</Label>
                      <p className="text-xs text-muted-foreground">
                        If ActivityWatch is installed in a non-standard location, enter the path to aw-qt here.
                      </p>
                      <Input
                        id="onboarding-aw-path"
                        placeholder="Leave empty to auto-detect"
                        value={awPath}
                        onChange={(e) => setAwPath(e.target.value)}
                        onBlur={async () => {
                          if (electron) {
                            await electron.setSettings({ activityWatchPath: awPath.trim() });
                          }
                        }}
                      />
                    </div>
                    )}
                  </div>
                )}

                {/* Success state */}
                {awStatus?.available && (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {awStatus.running 
                        ? "ActivityWatch is running and ready to track your activity."
                        : "ActivityWatch is installed. Make sure to start it for automatic tracking."}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCurrentStep("ready")}
                  >
                    Skip for Now
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => setCurrentStep("ready")}
                    disabled={!awStatus?.available}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === "ready" && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle className="text-2xl">You're All Set!</CardTitle>
                <CardDescription className="text-base">
                  Kairos is ready to help you stay productive.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="font-medium">Quick Tips:</p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Use the <strong>Home</strong> page to manage today's tasks</li>
                    <li>• Switch to <strong>Planning</strong> to organize your backlog</li>
                    <li>• Check <strong>Reports</strong> for productivity insights</li>
                    <li>• Customize preferences in <strong>Settings</strong></li>
                  </ul>
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={onComplete}
                >
                  Start Using Kairos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
