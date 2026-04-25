import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const WEEK_START_KEY = "kairo_week_start";

/**
 * Get the first day of the week (0=Sun or 1=Mon).
 * Checks localStorage override first, then falls back to locale.
 */
export function getLocaleWeekStart(): 0 | 1 {
  const stored = localStorage.getItem(WEEK_START_KEY);
  if (stored === "0" || stored === "1") return Number(stored) as 0 | 1;
  try {
    const locale = new Intl.Locale(navigator.language);
    const firstDay = (locale as any).weekInfo?.firstDay;
    if (firstDay === 7) return 0;
    if (firstDay === 1) return 1;
  } catch {}
  return 0;
}

export function setWeekStart(day: 0 | 1) {
  localStorage.setItem(WEEK_START_KEY, String(day));
}

/**
 * Get the start of the week containing `date`, respecting locale.
 */
export function getWeekStart(date: Date, firstDay: number = getLocaleWeekStart()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - firstDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}
