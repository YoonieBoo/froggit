import { describeProgress, type ProgressView } from '../shared/stages';
import type { ProgressStore } from './ProgressStore';
import { XpEngine, type XpEvent } from './XpEngine';

export interface ProgressUpdate {
  progress: ProgressView;
  gained: number;
  stageUp: boolean;
}

/** Applies XP events to saved progress and reports what changed. */
export class Progression {
  private readonly engine = new XpEngine();

  constructor(
    private readonly store: ProgressStore,
    private readonly onUpdate: (update: ProgressUpdate) => void,
  ) {}

  get view(): ProgressView {
    return describeProgress(this.store.load().xp);
  }

  award(events: XpEvent[]): void {
    if (events.length === 0) return;

    // Re-read every time: another VS Code window may have saved XP since we last looked.
    const state = this.store.load();
    const before = describeProgress(state.xp).stage;
    const now = Date.now();
    const gained = events.reduce((sum, event) => sum + this.engine.award(state, event, now), 0);
    void this.store.save(state);

    if (gained > 0) {
      const progress = describeProgress(state.xp);
      this.onUpdate({ progress, gained, stageUp: progress.stage !== before });
    }
  }

  /** Development only: adds XP directly, skipping every rule and cap. */
  debugAddXp(amount: number): void {
    const state = this.store.load();
    const before = describeProgress(state.xp).stage;
    state.xp += amount;
    void this.store.save(state);
    const progress = describeProgress(state.xp);
    this.onUpdate({ progress, gained: amount, stageUp: progress.stage !== before });
  }

  async reset(): Promise<void> {
    await this.store.reset();
  }
}
