import { TaskHelpers } from "@/lib/taskHelpers";
import type { TimeBreakdown } from "@shared/types";

interface TimeBreakdownRowProps {
  breakdown: TimeBreakdown;
  /** "inline" = flat row (default), "card" = bordered box with two-column layout */
  variant?: 'inline' | 'card';
  /** Show worked minutes (default: false) */
  showWorked?: boolean;
  /** Show productivity percentage (default: true) */
  showProductivity?: boolean;
  className?: string;
}

export function TimeBreakdownRow({
  breakdown,
  variant = 'inline',
  showWorked = false,
  showProductivity = true,
  className,
}: TimeBreakdownRowProps) {
  if (breakdown.trackedMinutes <= 0 && !showWorked) return null;

  const primary: Array<{ label: string; value: string }> = [];
  const detail: Array<{ label: string; value: string }> = [];

  if (showWorked) primary.push({ label: 'Worked', value: TaskHelpers.formatTime(breakdown.workedMinutes) });
  if (breakdown.trackedMinutes > 0) primary.push({ label: 'Tracked', value: TaskHelpers.formatTime(breakdown.trackedMinutes) });
  if (breakdown.focusMinutes > 0) detail.push({ label: 'Focus', value: TaskHelpers.formatTime(breakdown.focusMinutes) });
  if (breakdown.distractionMinutes > 0) detail.push({ label: 'Distraction', value: TaskHelpers.formatTime(breakdown.distractionMinutes) });
  if (breakdown.idleMinutes > 0) detail.push({ label: 'Idle', value: TaskHelpers.formatTime(breakdown.idleMinutes) });
  if (showProductivity && breakdown.trackedMinutes > 0) {
    primary.push({ label: 'Productivity', value: `${Math.round(breakdown.productivityRatio * 100)}%` });
  }

  if (primary.length === 0 && detail.length === 0) return null;

  if (variant === 'card') {
    const productivityPart = primary.find(p => p.label === 'Productivity');
    const rest = primary.filter(p => p.label !== 'Productivity');
    return (
      <div className={`p-3 bg-muted/20 rounded-md border text-xs text-muted-foreground ${className ?? ''}`}>
        <div className="flex justify-between items-center">
          {productivityPart && (
            <div>
              <span className="font-medium">{productivityPart.label}: </span>
              <span className="font-bold">{productivityPart.value}</span>
            </div>
          )}
          <div className="flex items-center gap-x-3">
            {rest.map((p, i) => (
              <span key={p.label}>
                {i > 0 && <span className="mr-3">·</span>}
                <span className="font-medium">{p.label}: {p.value}</span>
              </span>
            ))}
            {detail.length > 0 && rest.length > 0 && <span>·</span>}
            {detail.map((p) => (
              <span key={p.label}>{p.label}: {p.value}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground ${className ?? ''}`}>
      {primary.map((p, i) => (
        <span key={p.label}>
          {i > 0 && <span className="mr-3">·</span>}
          <span className="font-medium">{p.label}: {p.value}</span>
        </span>
      ))}
      {detail.length > 0 && primary.length > 0 && <span>·</span>}
      {detail.map((p) => (
        <span key={p.label}>{p.label}: {p.value}</span>
      ))}
    </div>
  );
}
