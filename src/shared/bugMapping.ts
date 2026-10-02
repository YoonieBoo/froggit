// How many bugs to *show* for a given number of problems.
// 25 errors shouldn't mean 25 sprites, so the count grows slowly and caps out.

export const MAX_BEETLES = 6;
export const MAX_GNATS = 3;

/** errors 1–3 → one beetle each, 4–9 → 4, 10–19 → 5, 20+ → 6 */
export function visibleBeetles(errors: number): number {
  if (errors <= 0) return 0;
  if (errors <= 3) return errors;
  if (errors <= 9) return 4;
  if (errors <= 19) return 5;
  return MAX_BEETLES;
}

/** warnings 1–3 → one gnat each, more → 3 */
export function visibleGnats(warnings: number): number {
  return Math.max(0, Math.min(MAX_GNATS, warnings));
}
