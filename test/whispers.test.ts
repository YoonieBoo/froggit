import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickWhisper, WHISPERS } from '../src/webview/whispers';

describe('whispers', () => {
  it('never says the same thing twice in a row', () => {
    let last: string | null = null;
    for (let i = 0; i < 500; i++) {
      const next = pickWhisper(last);
      assert.notEqual(next, last);
      assert.ok(WHISPERS.includes(next));
      last = next;
    }
  });

  it('keeps messages short enough for a small bubble', () => {
    for (const w of WHISPERS) assert.ok(w.length <= 26, w);
  });
});
