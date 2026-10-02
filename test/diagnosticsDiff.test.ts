import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { diffDiagnostics, MASS_CLEAR_THRESHOLD, type CurrentDiagnostic } from '../src/host/diagnosticsDiff';

const error = (key: string, uri = 'file:///a.ts'): CurrentDiagnostic => ({ key, uri, severity: 'error' });
const warning = (key: string, uri = 'file:///a.ts'): CurrentDiagnostic => ({ key, uri, severity: 'warning' });
const neverClosed = () => false;

describe('diffDiagnostics', () => {
  it('counts errors and warnings and reports new ones', () => {
    const r = diffDiagnostics(new Map(), [error('x'), error('y'), warning('z')], 0, neverClosed);
    assert.deepEqual(r.counts, { errors: 2, warnings: 1 });
    assert.equal(r.added, 3);
    assert.equal(r.fixed.length, 0);
  });

  it('reports a fix with how long the problem existed', () => {
    const first = diffDiagnostics(new Map(), [error('x'), error('y')], 1000, neverClosed);
    const r = diffDiagnostics(first.tracked, [error('y')], 21000, neverClosed);
    assert.deepEqual(r.fixed, [{ severity: 'error', ageMs: 20000 }]);
    assert.equal(r.added, 0);
  });

  it('keeps the original age when a problem persists', () => {
    const first = diffDiagnostics(new Map(), [error('x')], 1000, neverClosed);
    const second = diffDiagnostics(first.tracked, [error('x')], 5000, neverClosed);
    const r = diffDiagnostics(second.tracked, [], 9000, neverClosed);
    assert.equal(r.fixed[0].ageMs, 8000);
  });

  it('tells identical messages apart', () => {
    const first = diffDiagnostics(new Map(), [error('same'), error('same')], 0, neverClosed);
    const r = diffDiagnostics(first.tracked, [error('same')], 1, neverClosed);
    assert.equal(r.counts.errors, 1);
    assert.equal(r.fixed.length, 1);
  });

  it('does not count problems from a just-closed file as fixes', () => {
    const first = diffDiagnostics(new Map(), [error('x', 'file:///closed.ts')], 0, neverClosed);
    const r = diffDiagnostics(first.tracked, [], 1, (uri) => uri === 'file:///closed.ts');
    assert.equal(r.fixed.length, 0);
    assert.equal(r.cleared, 1);
  });

  it('treats a mass disappearance (e.g. branch switch) as cleared, not fixed', () => {
    const many = Array.from({ length: MASS_CLEAR_THRESHOLD + 1 }, (_, i) => error(`e${i}`));
    const first = diffDiagnostics(new Map(), many, 0, neverClosed);
    const r = diffDiagnostics(first.tracked, [], 1, neverClosed);
    assert.equal(r.fixed.length, 0);
    assert.equal(r.cleared, MASS_CLEAR_THRESHOLD + 1);
  });
});
