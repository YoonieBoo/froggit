import * as vscode from 'vscode';
import { migrateCustomization, type Customization } from '../shared/customization';

export const CUSTOMIZATION_KEY = 'froggit.customization';

/**
 * Saves the frog's look in global storage, separate from progress, so
 * resetting progress keeps the outfit.
 */
export class CustomizationStore {
  constructor(private readonly memento: vscode.Memento) {}

  load(): Customization {
    return migrateCustomization(this.memento.get(CUSTOMIZATION_KEY));
  }

  /** Cleans up the value before saving and returns what was saved. */
  save(raw: unknown): Customization {
    const customization = migrateCustomization(raw);
    void this.memento.update(CUSTOMIZATION_KEY, customization);
    return customization;
  }
}
