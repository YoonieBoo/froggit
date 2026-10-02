// Messages between the extension host and the pond webview.
// Shared by both sides so the types can't drift apart.
// The webview only ever receives counts and progress — never file paths or code.

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
  | { type: 'snapshot'; bugs: BugCounts; progress: ProgressView; settings: PondSettings }
  | { type: 'settings'; settings: PondSettings }
  | { type: 'bugsChanged'; bugs: BugCounts; fixed: number; added: number }
  | { type: 'progress'; progress: ProgressView; gained: number; stageUp: boolean };

/** Webview → host */
export type WebviewMessage = { type: 'ready' };

/** The webview is sandboxed, but its messages are still treated as untrusted input. */
export function isWebviewMessage(value: unknown): value is WebviewMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'ready'
  );
}
