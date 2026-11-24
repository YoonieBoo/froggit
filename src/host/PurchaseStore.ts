import * as vscode from 'vscode';
import { migrateOwned, type PackId } from '../shared/customization';

export const PURCHASES_KEY = 'froggit.purchases';

/**
 * Remembers which packs were bought. Synced like progress, so a pack bought on
 * one machine is unlocked on the others. License keys themselves are kept in
 * VS Code's secret storage, not here.
 */
export class PurchaseStore {
  constructor(private readonly memento: vscode.Memento) {}

  load(): PackId[] {
    const raw = this.memento.get<{ packs?: unknown }>(PURCHASES_KEY);
    return migrateOwned(raw?.packs);
  }

  async add(pack: PackId): Promise<PackId[]> {
    const packs = migrateOwned([...this.load(), pack]);
    await this.memento.update(PURCHASES_KEY, { v: 1, packs });
    return packs;
  }

  /** Development only. */
  async remove(pack: PackId): Promise<PackId[]> {
    const packs = this.load().filter((p) => p !== pack);
    await this.memento.update(PURCHASES_KEY, { v: 1, packs });
    return packs;
  }
}
