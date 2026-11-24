import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_BEETLES, MAX_GNATS, visibleBeetles, visibleGnats } from '../src/shared/bugMapping';
import { describeProgress, STAGES } from '../src/shared/stages';

describe('bug mapping', () => {
  it('shows one beetle per error for small counts, then caps', () => {
    assert.deepEqual([0, 1, 2, 3].map(visibleBeetles), [0, 1, 2, 3]);
    assert.equal(visibleBeetles(7), 4);
    assert.equal(visibleBeetles(15), 5);
    assert.equal(visibleBeetles(500), MAX_BEETLES);
  });

  it('never decreases as errors increase', () => {
    for (let n = 1; n < 100; n++) assert.ok(visibleBeetles(n) >= visibleBeetles(n - 1));
  });

  it('caps gnats', () => {
    assert.equal(visibleGnats(0), 0);
    assert.equal(visibleGnats(2), 2);
    assert.equal(visibleGnats(80), MAX_GNATS);
  });
});

describe('stages', () => {
  it('starts as a baby frog and grows up at the next threshold', () => {
    const developer = STAGES[1].minXp;
    assert.equal(describeProgress(0).stage, 'baby');
    assert.equal(describeProgress(developer - 1).stage, 'baby');
    assert.equal(describeProgress(developer).stage, 'developer');
  });

  it('reports progress toward the next stage, and none at the last', () => {
    const p = describeProgress(STAGES[1].minXp + 10);
    assert.equal(p.stageStartXp, STAGES[1].minXp);
    assert.equal(p.nextStageXp, STAGES[2].minXp);
    assert.equal(describeProgress(999_999).nextStageXp, null);
  });
});
