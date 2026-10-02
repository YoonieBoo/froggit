// Pure diffing logic for diagnostics. No `vscode` import, so it can be unit tested in plain Node.

import type { BugCounts } from '../shared/protocol';

export type Severity = 'error' | 'warning';

/** A diagnostic as currently reported by VS Code, already reduced to what we need. */
export interface CurrentDiagnostic {
  /** Identity without the line/column, so moving code around doesn't look like a fix. */
  key: string;
  uri: string;
  severity: Severity;
}

export interface TrackedDiagnostic {
  uri: string;
  severity: Severity;
  firstSeen: number;
}

export interface FixedDiagnostic {
  severity: Severity;
  /** How long the problem existed. Used later to ignore add-then-delete XP farming. */
  ageMs: number;
}

export interface DiffResult {
  tracked: Map<string, TrackedDiagnostic>;
  counts: BugCounts;
  /** Problems that went away because the user fixed them. */
  fixed: FixedDiagnostic[];
  /** Problems that are new since the last scan. */
  added: number;
  /** Problems that vanished for other reasons (file closed, branch switch…). */
  cleared: number;
}

/** If more than this many vanish in one scan, it's a branch switch or similar, not fixes. */
export const MASS_CLEAR_THRESHOLD = 20;

export function diffDiagnostics(
  previous: ReadonlyMap<string, TrackedDiagnostic>,
  current: readonly CurrentDiagnostic[],
  now: number,
  wasRecentlyClosed: (uri: string) => boolean,
): DiffResult {
  const tracked = new Map<string, TrackedDiagnostic>();
  const counts: BugCounts = { errors: 0, warnings: 0 };
  const occurrences = new Map<string, number>();
  let added = 0;

  for (const diagnostic of current) {
    // The same message can appear more than once in a file; number the copies.
    const n = (occurrences.get(diagnostic.key) ?? 0) + 1;
    occurrences.set(diagnostic.key, n);
    const id = `${diagnostic.key}#${n}`;

    const existing = previous.get(id);
    if (!existing) added++;
    tracked.set(id, {
      uri: diagnostic.uri,
      severity: diagnostic.severity,
      firstSeen: existing?.firstSeen ?? now,
    });

    if (diagnostic.severity === 'error') counts.errors++;
    else counts.warnings++;
  }

  const gone = [...previous].filter(([id]) => !tracked.has(id)).map(([, d]) => d);
  const candidates = gone.filter((d) => !wasRecentlyClosed(d.uri));
  const fixed =
    candidates.length > MASS_CLEAR_THRESHOLD
      ? []
      : candidates.map((d) => ({ severity: d.severity, ageMs: now - d.firstSeen }));

  return { tracked, counts, fixed, added, cleared: gone.length - fixed.length };
}
