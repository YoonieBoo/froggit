// The saved progress record. Pure: no `vscode` import, so it can be unit tested.

export interface ProgressState {
  v: 1;
  xp: number;
  createdAt: number;
  lastCleanAt: number;
  stats: {
    bugsEaten: number;
    cleans: number;
    sessions: number;
  };
  /** Resets at local midnight. */
  daily: {
    date: string;
    earned: number;
    saveXp: number;
  };
}

export function localDateKey(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function defaultProgress(now: number): ProgressState {
  return {
    v: 1,
    xp: 0,
    createdAt: now,
    lastCleanAt: 0,
    stats: { bugsEaten: 0, cleans: 0, sessions: 0 },
    daily: { date: localDateKey(now), earned: 0, saveXp: 0 },
  };
}

/**
 * Turns whatever is in storage into a valid ProgressState.
 * Handles missing data, older versions (future `v` bumps go here) and corrupted values.
 */
export function migrateProgress(raw: unknown, now: number): ProgressState {
  const fresh = defaultProgress(now);
  if (!isRecord(raw) || raw.v !== 1) return fresh;

  const stats = isRecord(raw.stats) ? raw.stats : {};
  const daily = isRecord(raw.daily) ? raw.daily : {};
  return {
    v: 1,
    xp: count(raw.xp),
    createdAt: count(raw.createdAt) || now,
    lastCleanAt: count(raw.lastCleanAt),
    stats: {
      bugsEaten: count(stats.bugsEaten),
      cleans: count(stats.cleans),
      sessions: count(stats.sessions),
    },
    daily: {
      date: typeof daily.date === 'string' ? daily.date : fresh.daily.date,
      earned: count(daily.earned),
      saveXp: count(daily.saveXp),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** A non-negative whole number, or 0. */
function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
