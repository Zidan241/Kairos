import { TaskHelpers } from "@/lib/taskHelpers";

export function CircularProgress({ 
  progress, 
  size = 16, 
  strokeWidth = 4, 
  isOverTime = false, 
  isCompleted = false 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number; 
  isOverTime?: boolean; 
  isCompleted?: boolean; 
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  
  const minProgress = 5;
  const displayProgress = Math.max(progress, minProgress);
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={strokeWidth - 1}
          fill="transparent"
          strokeDasharray="2 3"
          className="opacity-30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={TaskHelpers.getStrokeColor(isCompleted, isOverTime, progress)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
    </div>
  );
}
