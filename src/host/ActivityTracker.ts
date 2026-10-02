import * as vscode from 'vscode';
import type { XpEvent } from './XpEngine';

const TRACKED_SCHEMES = new Set(['file', 'untitled']);
const MINUTE = 60_000;
/** You count as "actively coding" if you edited something within this window. */
const ACTIVE_WINDOW_MS = 2 * MINUTE;
const SESSION_MINUTES = 25;

/**
 * Turns everyday editing into XP events:
 * - a save that actually contains new edits
 * - every 25 minutes of active coding (focused window, recent edits)
 */
export class ActivityTracker implements vscode.Disposable {
  private readonly editedSinceSave = new Set<string>();
  private lastEditAt = 0;
  private activeMinutes = 0;
  private readonly timer: ReturnType<typeof setInterval>;

  private readonly emitter = new vscode.EventEmitter<XpEvent>();
  readonly onActivity = this.emitter.event;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(
      this.emitter,
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.contentChanges.length === 0 || !TRACKED_SCHEMES.has(e.document.uri.scheme)) return;
        this.editedSinceSave.add(e.document.uri.toString());
        this.lastEditAt = Date.now();
      }),
      vscode.workspace.onDidSaveTextDocument((doc) => {
        // Saving without changes earns nothing.
        if (this.editedSinceSave.delete(doc.uri.toString())) {
          this.emitter.fire({ kind: 'save', fileKey: doc.uri.toString() });
        }
      }),
    );
    this.timer = setInterval(() => this.tick(), MINUTE);
  }

  dispose(): void {
    clearInterval(this.timer);
    this.disposables.forEach((d) => d.dispose());
  }

  private tick(): void {
    const active = vscode.window.state.focused && Date.now() - this.lastEditAt < ACTIVE_WINDOW_MS;
    if (!active) return;
    this.activeMinutes++;
    if (this.activeMinutes >= SESSION_MINUTES) {
      this.activeMinutes = 0;
      this.emitter.fire({ kind: 'session' });
    }
  }
}
