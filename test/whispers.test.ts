import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickWhisper, WhisperClock, WHISPERS } from '../src/webview/whispers';

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

  it('speaks once per interval', () => {
    const clock = new WhisperClock(600);
    let spoken = 0;
    for (let t = 0; t < 1800; t += 0.1) if (clock.update(0.1, true)) spoken++;
    assert.equal(spoken, 3);
  });

  it('waits while the frog is busy, then says just one message', () => {
    const clock = new WhisperClock(60);
    for (let t = 0; t < 600; t++) assert.equal(clock.update(1, false), false);
    assert.equal(clock.update(0.1, true), true);
    assert.equal(clock.update(0.1, true), false);
  });

  it('starts counting again when restarted or reconfigured', () => {
    const clock = new WhisperClock(60);
    clock.update(50, true);
    clock.restart();
    assert.equal(clock.update(50, true), false);
    clock.setInterval(300);
    assert.equal(clock.update(20, true), false);
  });
});
