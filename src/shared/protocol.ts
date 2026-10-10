// Messages between the extension host and the pond webview.
// Shared by both sides so the types can't drift apart.
// The webview only ever receives counts and progress — never file paths or code.

import type { Customization } from './customization';
import type { ProgressView } from './stages';

export interface BugCounts {
  errors: number;
  warnings: number;
}

/** User settings the pond needs to know about. */
export interface PondSettings {
  reducedMotion: boolean;
  /** Froggit Whispers: occasional encouraging speech bubbles. */
  whispers: boolean;
  whisperMinutes: number;
}

/** Host → webview */
export type HostMessage =
  | {
      type: 'snapshot';
      bugs: BugCounts;
      progress: ProgressView;
      settings: PondSettings;
      customization: Customization;
    }
  | { type: 'settings'; settings: PondSettings }
  | { type: 'customization'; customization: Customization }
  /** Development only: say something right now. */
  | { type: 'whisperNow' }
  | { type: 'bugsChanged'; bugs: BugCounts; fixed: number; added: number }
  | { type: 'progress'; progress: ProgressView; gained: number; stageUp: boolean };

/** Webview → host */
export type WebviewMessage =
  | { type: 'ready' }
  /** The host cleans the payload with migrateCustomization before using it. */
  | { type: 'customize'; customization: Customization };

/** The webview is sandboxed, but its messages are still treated as untrusted input. */
export function isWebviewMessage(value: unknown): value is WebviewMessage {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return type === 'ready' || type === 'customize';
}
