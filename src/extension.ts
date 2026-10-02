import * as vscode from 'vscode';
import { BugTracker } from './host/BugTracker';
import { PondViewProvider } from './host/PondViewProvider';

export function activate(context: vscode.ExtensionContext): void {
  const bugs = new BugTracker();
  const pond = new PondViewProvider(context.extensionUri, () => ({
    type: 'snapshot',
    bugs: bugs.bugCounts,
  }));

  context.subscriptions.push(
    bugs,
    vscode.window.registerWebviewViewProvider(PondViewProvider.viewId, pond),
    vscode.commands.registerCommand('frogPet.showPond', () =>
      vscode.commands.executeCommand(`${PondViewProvider.viewId}.focus`),
    ),
    bugs.onDidUpdate((update) =>
      pond.post({
        type: 'bugsChanged',
        bugs: update.counts,
        fixed: update.fixed.length,
        added: update.added,
      }),
    ),
  );
}

export function deactivate(): void {
  // Everything is disposed through context.subscriptions.
}
