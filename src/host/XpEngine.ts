// XP rules. Pure: time is passed in, so every rule can be unit tested.

import type { Severity } from './diagnosticsDiff';
import { localDateKey, type ProgressState } from './progressState';

export type XpEvent =
  | { kind: 'fix'; severity: Severity; ageMs: number }
  | { kind: 'clean' }
  | { kind: 'save'; fileKey: string }
  | { kind: 'session' };

const MINUTE = 60_000;

export const XP_RULES = {
  fixError: 5,
  fixWarning: 2,
  /** Problems younger than this earn nothing (stops type-an-error-then-delete-it farming). */
  minProblemAgeMs: 15_000,
  fixWindowMs: 10 * MINUTE,
  /** Max fix XP per window. */
  fixWindowCap: 30,

  clean: 10,
  cleanCooldownMs: 10 * MINUTE,

  save: 1,
  /** Per file. */
  saveCooldownMs: MINUTE,
  saveDailyCap: 20,

  session: 15,

  dailyCap: 300,
} as const;

/**
 * Decides how much XP an event is worth and applies it to the state.
 * Short-lived cooldowns live here in memory; anything that must survive a restart
 * lives in ProgressState.
 */
export class XpEngine {
  private fixLog: Array<{ at: number; xp: number }> = [];
  private readonly lastSaveByFile = new Map<string, number>();

  /** Mutates `state` and returns the XP granted (possibly 0). */
  award(state: ProgressState, event: XpEvent, now: number): number {
    const today = localDateKey(now);
    if (state.daily.date !== today) state.daily = { date: today, earned: 0, saveXp: 0 };

    this.recordStats(state, event);

    const remainingToday = Math.max(0, XP_RULES.dailyCap - state.daily.earned);
    const xp = Math.min(this.baseXp(state, event, now), remainingToday);
    if (xp <= 0) return 0;

    state.xp += xp;
    state.daily.earned += xp;
    switch (event.kind) {
      case 'fix':
        this.fixLog.push({ at: now, xp });
        break;
      case 'clean':
        state.lastCleanAt = now;
        break;
      case 'save':
        state.daily.saveXp += xp;
        this.lastSaveByFile.set(event.fileKey, now);
        break;
    }
    return xp;
  }

  private baseXp(state: ProgressState, event: XpEvent, now: number): number {
    switch (event.kind) {
      case 'fix': {
        if (event.ageMs < XP_RULES.minProblemAgeMs) return 0;
        this.fixLog = this.fixLog.filter((entry) => now - entry.at < XP_RULES.fixWindowMs);
        const used = this.fixLog.reduce((sum, entry) => sum + entry.xp, 0);
        const base = event.severity === 'error' ? XP_RULES.fixError : XP_RULES.fixWarning;
        return Math.min(base, Math.max(0, XP_RULES.fixWindowCap - used));
      }
      case 'clean':
        return now - state.lastCleanAt < XP_RULES.cleanCooldownMs ? 0 : XP_RULES.clean;

      case 'save': {
        const last = this.lastSaveByFile.get(event.fileKey);
        if (last !== undefined && now - last < XP_RULES.saveCooldownMs) return 0;
        return Math.min(XP_RULES.save, Math.max(0, XP_RULES.saveDailyCap - state.daily.saveXp));
      }
      case 'session':
        return XP_RULES.session;
    }
  }

  private recordStats(state: ProgressState, event: XpEvent): void {
    if (event.kind === 'fix') state.stats.bugsEaten++;
    if (event.kind === 'clean') state.stats.cleans++;
    if (event.kind === 'session') state.stats.sessions++;
  }
}
