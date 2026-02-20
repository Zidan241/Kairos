/**
 * Parse a CLI flag argument (e.g. --db /path/to/db).
 * CLI args are used instead of env vars because Bun compiled binaries
 * don't reliably expose env vars at top-level module evaluation time.
 */
export function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : undefined;
}
