// Messages between the extension host and the pond webview.
// Shared by both sides so the types can't drift apart.
// The webview only ever receives counts and progress — never file paths or code.

import { PACKS, type Customization, type PackId } from './customization';
import type { ProgressView } from './stages';

export interface BugCounts {
  errors: number;
  warnings: number;
}

/** User settings the pond needs to know about. */
export interface PondSettings {
  reducedMotion: boolean;
}

/** Host → webview */
export type HostMessage =
  | {
      type: 'snapshot';
      bugs: BugCounts;
      progress: ProgressView;
      settings: PondSettings;
      customization: Customization;
      /** Packs the user has bought. */
      owned: PackId[];
      /** Play the welcome hatch: a brand-new frog (or one reset). */
      hatch: boolean;
    }
  | { type: 'settings'; settings: PondSettings }
  | { type: 'customization'; customization: Customization }
  | { type: 'owned'; owned: PackId[] }
  /** Development only: start the New Year party right now. */
  | { type: 'newYearNow' }
  | { type: 'bugsChanged'; bugs: BugCounts; fixed: number; added: number }
  | { type: 'progress'; progress: ProgressView; gained: number; stageUp: boolean };

/** Webview → host */
export type WebviewMessage =
  | { type: 'ready' }
  /** The host cleans the payload with migrateCustomization before using it. */
  | { type: 'customize'; customization: Customization }
  /** Open the store page for a pack (and offer to take the license key after). */
  | { type: 'buy'; pack: PackId }
  /** The welcome hatch has played. */
  | { type: 'hatched' };

/** The webview is sandboxed, but its messages are still treated as untrusted input. */
export function isWebviewMessage(value: unknown): value is WebviewMessage {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as { type?: unknown; pack?: unknown };
  switch (message.type) {
    case 'ready':
    case 'customize':
    case 'hatched':
      return true;
    case 'buy':
      return PACKS.some((p) => p.id === message.pack);
    default:
      return false;
  }
}
