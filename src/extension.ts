import * as vscode from 'vscode';
import { ActivityTracker } from './host/ActivityTracker';
import { BugTracker } from './host/BugTracker';
import { PondViewProvider } from './host/PondViewProvider';
import { Progression } from './host/Progression';
import { PROGRESS_KEY, ProgressStore } from './host/ProgressStore';
import type { XpEvent } from './host/XpEngine';
import type { HostMessage, PondSettings } from './shared/protocol';

function readSettings(): PondSettings {
  return {
    reducedMotion: vscode.workspace.getConfiguration('froggit').get<boolean>('reducedMotion', false),
  };
}

export function activate(context: vscode.ExtensionContext): void {
  // Let Settings Sync carry the frog to other machines.
  context.globalState.setKeysForSync([PROGRESS_KEY]);

  const bugs = new BugTracker();
  const activity = new ActivityTracker();

  const snapshot = (): HostMessage => ({
    type: 'snapshot',
    bugs: bugs.bugCounts,
    progress: progression.view,
    settings: readSettings(),
  });
  const pond = new PondViewProvider(context.extensionUri, snapshot);

  const progression = new Progression(new ProgressStore(context.globalState), (update) =>
    pond.post({ type: 'progress', ...update }),
  );

  context.subscriptions.push(
    bugs,
    activity,
    vscode.window.registerWebviewViewProvider(PondViewProvider.viewId, pond),

    vscode.commands.registerCommand('froggit.showPond', () =>
      vscode.commands.executeCommand(`${PondViewProvider.viewId}.focus`),
    ),

    vscode.commands.registerCommand('froggit.resetProgress', async () => {
      const choice = await vscode.window.showWarningMessage(
        'Reset your frog back to an egg? All XP will be lost.',
        { modal: true },
        'Reset',
      );
      if (choice !== 'Reset') return;
      await progression.reset();
      pond.post(snapshot());
    }),

    bugs.onDidUpdate((update) => {
      // Send the bug change first so the pond starts the eating animation,
      // then the XP it earned.
      pond.post({
        type: 'bugsChanged',
        bugs: update.counts,
        fixed: update.fixed.length,
        added: update.added,
      });

      const events: XpEvent[] = update.fixed.map((f) => ({
        kind: 'fix',
        severity: f.severity,
        ageMs: f.ageMs,
      }));
      const clean = update.counts.errors + update.counts.warnings === 0;
      if (clean && update.fixed.length > 0) events.push({ kind: 'clean' });
      progression.award(events);
    }),

    activity.onActivity((event) => progression.award([event])),

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('froggit.reducedMotion')) {
        pond.post({ type: 'settings', settings: readSettings() });
      }
    }),
  );

  // Testing shortcuts, only when launched with F5. The context key hides them
  // from the Command Palette in the published extension.
  if (context.extensionMode === vscode.ExtensionMode.Development) {
    void vscode.commands.executeCommand('setContext', 'froggit.devMode', true);
    context.subscriptions.push(
      vscode.commands.registerCommand('froggit.debugAddXp', () => progression.debugAddXp(10)),
    );
  }
}

export function deactivate(): void {
  // Everything is disposed through context.subscriptions.
}
