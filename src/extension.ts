import * as vscode from 'vscode';
import { PondViewProvider } from './host/PondViewProvider';

export function activate(context: vscode.ExtensionContext): void {
  const pond = new PondViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PondViewProvider.viewId, pond),
    vscode.commands.registerCommand('frogPet.showPond', () =>
      vscode.commands.executeCommand(`${PondViewProvider.viewId}.focus`),
    ),
  );
}

export function deactivate(): void {
  // Everything is disposed through context.subscriptions.
}
