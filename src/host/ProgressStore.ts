import * as vscode from 'vscode';
import { migrateProgress, type ProgressState } from './progressState';

export const PROGRESS_KEY = 'frogPet.progress';

/**
 * Saves progress in VS Code's global storage, so the same frog follows you
 * across every project and survives restarts.
 */
export class ProgressStore {
  constructor(private readonly memento: vscode.Memento) {}

  load(): ProgressState {
    return migrateProgress(this.memento.get(PROGRESS_KEY), Date.now());
  }

  save(state: ProgressState): Thenable<void> {
    return this.memento.update(PROGRESS_KEY, state);
  }

  reset(): Thenable<void> {
    return this.memento.update(PROGRESS_KEY, undefined);
  }
}
