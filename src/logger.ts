// Debug warnings for non-fatal failures (e.g. an optional API call). Printed
// only in development so production users' consoles stay clean.
export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
}
