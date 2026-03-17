import { useState, useEffect } from 'react';

/**
 * Returns elapsed minutes since the given ISO timestamp, updating every second.
 * Returns 0 if `since` is null/undefined.
 */
export function useElapsedMinutes(since: string | null | undefined): number {
  const [elapsed, setElapsed] = useState(() => computeElapsed(since));

  useEffect(() => {
    if (!since) {
      setElapsed(0);
      return;
    }
    setElapsed(computeElapsed(since));
    const interval = setInterval(() => setElapsed(computeElapsed(since)), 1000);
    return () => clearInterval(interval);
  }, [since]);

  return elapsed;
}

function computeElapsed(since: string | null | undefined): number {
  if (!since) return 0;
  return Math.max(0, (Date.now() - new Date(since).getTime()) / 60000);
}

/** Format minutes as "Xh Ym" or "Xm" or "Xs" for very short durations */
export function formatElapsed(minutes: number): string {
  if (minutes < 1) {
    const secs = Math.floor(minutes * 60);
    return `${secs}s`;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0) return m === 0 ? `${h}h` : `${h}h ${m}m`;
  return `${m}m`;
}
