import * as vscode from 'vscode';
import { ActivityTracker } from './host/ActivityTracker';
import { BugTracker } from './host/BugTracker';
import { CUSTOMIZATION_KEY, CustomizationStore } from './host/CustomizationStore';
import { PondViewProvider } from './host/PondViewProvider';
import { Progression } from './host/Progression';
import { PROGRESS_KEY, ProgressStore } from './host/ProgressStore';
import { PURCHASES_KEY, PurchaseStore } from './host/PurchaseStore';
import { activateLicense, LISTINGS } from './host/store';
import type { XpEvent } from './host/XpEngine';
import {
  migrateCustomization,
  PACKS,
  withoutLocked,
  type PackId,
} from './shared/customization';
import type { HostMessage, PondSettings } from './shared/protocol';

function readSettings(): PondSettings {
  return {
    reducedMotion: vscode.workspace.getConfiguration('froggit').get<boolean>('reducedMotion', false),
  };
}

export function activate(context: vscode.ExtensionContext): void {
  // Let Settings Sync carry the frog (and its outfit) to other machines.
  context.globalState.setKeysForSync([PROGRESS_KEY, CUSTOMIZATION_KEY, PURCHASES_KEY]);

  const bugs = new BugTracker();
  const activity = new ActivityTracker();
  const looks = new CustomizationStore(context.globalState);
  const purchases = new PurchaseStore(context.globalState);

  // Locked items are taken off here, on the host, whatever the pond asks for.
  const currentLook = () => withoutLocked(looks.load(), purchases.load());
  const snapshot = (): HostMessage => ({
    type: 'snapshot',
    bugs: bugs.bugCounts,
    progress: progression.view,
    settings: readSettings(),
    customization: currentLook(),
    owned: purchases.load(),
    hatch: !progression.hatched,
  });
  // Echo the saved look back, so the pond shows exactly what was stored.
  const customize = (raw: unknown) => {
    const look = withoutLocked(migrateCustomization(raw), purchases.load());
    pond.post({ type: 'customization', customization: looks.save(look) });
  };
  const ownedChanged = (owned: PackId[]) => {
    pond.post({ type: 'owned', owned });
    customize(looks.load());
  };

  const packName = (pack: PackId) => PACKS.find((p) => p.id === pack)!.name;

  const buy = async (pack: PackId) => {
    const url = LISTINGS[pack].checkoutUrl;
    if (!url) {
      void vscode.window.showInformationMessage(`The ${packName(pack)} isn't on sale yet. Check back soon!`);
      return;
    }
    await vscode.env.openExternal(vscode.Uri.parse(url));
    // The key comes in the PDF buyers download after checkout, so offer a place to paste it.
    const choice = await vscode.window.showInformationMessage(
      `After you buy the ${packName(pack)}, paste your license key here to unlock it.`,
      'Enter License Key',
    );
    if (choice) await enterKey(pack);
  };

  const enterKey = async (pack: PackId) => {
    const key = (
      await vscode.window.showInputBox({
        title: `${packName(pack)} license key`,
        prompt: 'Paste the license key from the How to unlock PDF you downloaded.',
        ignoreFocusOut: true,
      })
    )?.trim();
    if (!key) return;
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Checking your license key...' },
      () => activateLicense(pack, key),
    );
    if (!result.ok) {
      void vscode.window.showErrorMessage(result.message);
      return;
    }
    await context.secrets.store(`froggit.license.${pack}`, key);
    ownedChanged(await purchases.add(pack));
    void vscode.window.showInformationMessage(`${packName(pack)} unlocked. Thank you!`);
  };

  const pond = new PondViewProvider(context.extensionUri, snapshot, (message) => {
    if (message.type === 'customize') customize(message.customization);
    else if (message.type === 'buy') void buy(message.pack);
    else if (message.type === 'hatched') void progression.markHatched();
  });

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

    vscode.commands.registerCommand('froggit.enterLicenseKey', () => enterKey('holiday')),

    vscode.commands.registerCommand('froggit.resetProgress', async () => {
      const choice = await vscode.window.showWarningMessage(
        'Start over with a new frog? All XP will be lost. Your outfit, pond and packs stay.',
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
      vscode.commands.registerCommand('froggit.debugNewYear', () => pond.post({ type: 'newYearNow' })),
      vscode.commands.registerCommand('froggit.debugTogglePack', async () => {
        const owned = purchases.load().includes('holiday')
          ? await purchases.remove('holiday')
          : await purchases.add('holiday');
        ownedChanged(owned);
        void vscode.window.showInformationMessage(
          owned.includes('holiday') ? 'Holiday Pack unlocked (debug).' : 'Holiday Pack locked again (debug).',
        );
      }),
    );
  }
}

export function deactivate(): void {
  // Everything is disposed through context.subscriptions.
}
