import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultProgress, migrateProgress } from '../src/host/progressState';
import { XP_RULES, XpEngine } from '../src/host/XpEngine';

const NOON = new Date(2026, 9, 3, 12, 0, 0).getTime();
const SEC = 1000;
const MIN = 60 * SEC;
const oldError = { kind: 'fix', severity: 'error', ageMs: 60 * SEC } as const;

describe('XpEngine', () => {
  it('awards XP for fixing an error that existed long enough', () => {
    const state = defaultProgress(NOON);
    const xp = new XpEngine().award(state, oldError, NOON);
    assert.equal(xp, XP_RULES.fixError);
    assert.equal(state.xp, XP_RULES.fixError);
    assert.equal(state.stats.bugsEaten, 1);
  });

  it('gives warnings less than errors', () => {
    const state = defaultProgress(NOON);
    const xp = new XpEngine().award(state, { ...oldError, severity: 'warning' }, NOON);
    assert.equal(xp, XP_RULES.fixWarning);
  });

  it('ignores problems that were fixed seconds after appearing', () => {
    const state = defaultProgress(NOON);
    const xp = new XpEngine().award(state, { ...oldError, ageMs: 3 * SEC }, NOON);
    assert.equal(xp, 0);
    assert.equal(state.stats.bugsEaten, 1, 'still counted as eaten, just no XP');
  });

  it('caps fix XP within a 10-minute window, then allows more later', () => {
    const state = defaultProgress(NOON);
    const engine = new XpEngine();
    let total = 0;
    for (let i = 0; i < 20; i++) total += engine.award(state, oldError, NOON + i * SEC);
    assert.equal(total, XP_RULES.fixWindowCap);
    assert.equal(engine.award(state, oldError, NOON + XP_RULES.fixWindowMs + 30 * SEC), XP_RULES.fixError);
  });

  it('puts the clean bonus on a cooldown', () => {
    const state = defaultProgress(NOON);
    const engine = new XpEngine();
    assert.equal(engine.award(state, { kind: 'clean' }, NOON), XP_RULES.clean);
    assert.equal(engine.award(state, { kind: 'clean' }, NOON + MIN), 0);
    assert.equal(engine.award(state, { kind: 'clean' }, NOON + XP_RULES.cleanCooldownMs), XP_RULES.clean);
  });

  it('rate-limits saves per file', () => {
    const state = defaultProgress(NOON);
    const engine = new XpEngine();
    const save = (file: string, at: number) => engine.award(state, { kind: 'save', fileKey: file }, at);
    assert.equal(save('a.ts', NOON), 1);
    assert.equal(save('a.ts', NOON + 10 * SEC), 0, 'spam-saving the same file');
    assert.equal(save('b.ts', NOON + 10 * SEC), 1, 'a different file is fine');
    assert.equal(save('a.ts', NOON + MIN), 1, 'after the cooldown');
  });

  it('caps save XP per day', () => {
    const state = defaultProgress(NOON);
    const engine = new XpEngine();
    let total = 0;
    for (let i = 0; i < 50; i++) {
      total += engine.award(state, { kind: 'save', fileKey: `f${i}.ts` }, NOON + i * SEC);
    }
    assert.equal(total, XP_RULES.saveDailyCap);
  });

  it('enforces the daily cap and resets it the next day', () => {
    const state = defaultProgress(NOON);
    const engine = new XpEngine();
    let total = 0;
    for (let i = 0; i < 40; i++) total += engine.award(state, { kind: 'session' }, NOON + i * SEC);
    assert.equal(total, XP_RULES.dailyCap);

    const tomorrow = NOON + 24 * 60 * MIN;
    assert.equal(engine.award(state, { kind: 'session' }, tomorrow), XP_RULES.session);
    assert.equal(state.daily.earned, XP_RULES.session);
  });
});

describe('migrateProgress', () => {
  it('returns fresh progress for missing or unknown data', () => {
    assert.deepEqual(migrateProgress(undefined, NOON), defaultProgress(NOON));
    assert.deepEqual(migrateProgress({ v: 99, xp: 500 }, NOON), defaultProgress(NOON));
  });

  it('keeps valid data and repairs corrupted fields', () => {
    const saved = { ...defaultProgress(NOON), xp: 123 };
    assert.deepEqual(migrateProgress(saved, NOON), saved);

    const broken = migrateProgress({ v: 1, xp: -5, stats: 'nope', daily: { earned: NaN } }, NOON);
    assert.equal(broken.xp, 0);
    assert.equal(broken.stats.bugsEaten, 0);
    assert.equal(broken.daily.earned, 0);
  });
});
