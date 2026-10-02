import * as vscode from 'vscode';
import type { BugCounts } from '../shared/protocol';
import {
  diffDiagnostics,
  type CurrentDiagnostic,
  type FixedDiagnostic,
  type Severity,
  type TrackedDiagnostic,
} from './diagnosticsDiff';

export interface BugUpdate {
  counts: BugCounts;
  fixed: FixedDiagnostic[];
  added: number;
  cleared: number;
}

// Language servers report bursts of short-lived errors while you type.
const DEBOUNCE_MS = 600;
// Closing a file often clears its diagnostics; that isn't a fix.
const CLOSE_GRACE_MS = 5000;
const TRACKED_SCHEMES = new Set(['file', 'untitled', 'vscode-notebook-cell']);

/** Watches VS Code diagnostics and reports error/warning counts and genuine fixes. */
export class BugTracker implements vscode.Disposable {
  private tracked = new Map<string, TrackedDiagnostic>();
  private counts: BugCounts = { errors: 0, warnings: 0 };
  private readonly recentlyClosed = new Map<string, number>();
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly emitter = new vscode.EventEmitter<BugUpdate>();
  readonly onDidUpdate = this.emitter.event;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(
      this.emitter,
      vscode.languages.onDidChangeDiagnostics(() => this.schedule()),
      vscode.workspace.onDidCloseTextDocument((doc) =>
        this.recentlyClosed.set(doc.uri.toString(), Date.now()),
      ),
    );
    // Problems that already exist at startup are not "new" and not "fixed".
    this.scan(false);
  }

  get bugCounts(): BugCounts {
    return { ...this.counts };
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.disposables.forEach((d) => d.dispose());
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.scan(true), DEBOUNCE_MS);
  }

  private scan(emit: boolean): void {
    const now = Date.now();
    for (const [uri, closedAt] of this.recentlyClosed) {
      if (now - closedAt > CLOSE_GRACE_MS) this.recentlyClosed.delete(uri);
    }

    const result = diffDiagnostics(this.tracked, this.collect(), now, (uri) =>
      this.recentlyClosed.has(uri),
    );
    const changed =
      result.counts.errors !== this.counts.errors ||
      result.counts.warnings !== this.counts.warnings ||
      result.fixed.length > 0 ||
      result.added > 0;

    this.tracked = result.tracked;
    this.counts = result.counts;

    if (emit && changed) {
      this.emitter.fire({
        counts: this.bugCounts,
        fixed: result.fixed,
        added: result.added,
        cleared: result.cleared,
      });
    }
  }

  private collect(): CurrentDiagnostic[] {
    const result: CurrentDiagnostic[] = [];
    for (const [uri, diagnostics] of vscode.languages.getDiagnostics()) {
      if (!TRACKED_SCHEMES.has(uri.scheme)) continue;
      const uriString = uri.toString();

      for (const d of diagnostics) {
        const severity = toSeverity(d.severity);
        if (!severity) continue;
        const code = typeof d.code === 'object' ? String(d.code.value) : String(d.code ?? '');
        result.push({
          uri: uriString,
          severity,
          key: [uriString, severity, d.source ?? '', code, d.message].join('\u0000'),
        });
      }
    }
    return result;
  }
}

function toSeverity(severity: vscode.DiagnosticSeverity): Severity | undefined {
  if (severity === vscode.DiagnosticSeverity.Error) return 'error';
  if (severity === vscode.DiagnosticSeverity.Warning) return 'warning';
  return undefined;
}
