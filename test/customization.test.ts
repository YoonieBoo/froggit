import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DECORATIONS,
  defaultCustomization,
  EXTRAS,
  FACES,
  HATS,
  isUnlocked,
  migrateCustomization,
  migrateOwned,
  PONDS,
  withoutLocked,
} from '../src/shared/customization';
import { EXTRA_ART, FACE_ART, HAT_ART, headAnchor } from '../src/webview/sprites/accessories';
import * as frog from '../src/webview/sprites/frog';
import { PALETTE } from '../src/webview/sprites/palette';

describe('customization', () => {
  it('defaults to the plain frog for new users and garbage', () => {
    for (const raw of [undefined, null, 'crown', 42, {}, { v: 2, hat: 'crown' }]) {
      assert.deepEqual(migrateCustomization(raw), defaultCustomization());
    }
  });

  it('keeps valid choices', () => {
    const look = {
      v: 1,
      hat: 'wizard',
      face: 'sunglasses',
      extra: 'santa-beard',
      pond: 'moonlight',
      decorations: ['flowers', 'lantern'],
    };
    assert.deepEqual(migrateCustomization(look), look);
  });

  it('gives looks saved before ponds existed the classic pond', () => {
    assert.deepEqual(migrateCustomization({ v: 1, hat: 'crown', face: null }), {
      v: 1,
      hat: 'crown',
      face: null,
      extra: null,
      pond: 'classic',
      decorations: [],
    });
  });

  it('drops unknown or malformed item ids instead of failing', () => {
    assert.deepEqual(migrateCustomization({ v: 1, hat: 'top-hat', face: 7 }), defaultCustomization());
    assert.deepEqual(migrateCustomization({ v: 1, hat: 'cap', face: 'monocle', pond: 'lava' }), {
      v: 1,
      hat: 'cap',
      face: null,
      extra: null,
      pond: 'classic',
      decorations: [],
    });
  });

  it('cleans up decoration lists', () => {
    const clean = (decorations: unknown) =>
      migrateCustomization({ v: 1, hat: null, face: null, pond: 'classic', decorations }).decorations;
    assert.deepEqual(clean('flowers'), []);
    assert.deepEqual(clean(['rocks', 'castle', 7, 'flowers', 'rocks']), ['flowers', 'rocks']);
  });

  it('strips extra fields', () => {
    const clean = migrateCustomization({ v: 1, hat: 'crown', face: null, evil: '<script>' });
    assert.deepEqual(Object.keys(clean).sort(), ['decorations', 'extra', 'face', 'hat', 'pond', 'v']);
  });
});

describe('holiday pack', () => {
  const santaLook = {
    ...defaultCustomization(),
    hat: 'santa' as const,
    face: 'party-glasses' as const,
    extra: 'santa-beard' as const,
    pond: 'snowy' as const,
  };

  it('gives every item a unique id, so locks can look items up by id', () => {
    const ids = [...HATS, ...FACES, ...EXTRAS, ...PONDS, ...DECORATIONS].map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('keeps the Santa hat free and locks the rest of the pack', () => {
    assert.equal(isUnlocked('santa', []), true);
    assert.equal(isUnlocked('santa-beard', []), false);
    assert.equal(isUnlocked('crown', []), true);
    assert.equal(isUnlocked('santa-beard', ['holiday']), true);
  });

  it('takes locked items off a look, and keeps them once the pack is owned', () => {
    assert.deepEqual(withoutLocked(santaLook, []), {
      ...santaLook,
      face: null,
      extra: null,
      pond: 'classic',
    });
    assert.deepEqual(withoutLocked(santaLook, ['holiday']), santaLook);
  });

  it('cleans up the stored list of bought packs', () => {
    assert.deepEqual(migrateOwned(['holiday', 'holiday', 'pirate', 3]), ['holiday']);
    assert.deepEqual(migrateOwned('holiday'), []);
    assert.deepEqual(migrateOwned(undefined), []);
  });
});

describe('accessory art', () => {
  it('finds the head in every frog frame', () => {
    assert.deepEqual(headAnchor(frog.FROG_IDLE_0), { x: 7, y: 0 });
    assert.deepEqual(headAnchor(frog.FROG_CROUCH), { x: 7, y: 1 }); // squashed down
    assert.deepEqual(headAnchor(frog.FROG_JUMP), { x: 8, y: 0 }); // leaning forward
    for (const rows of Object.values(frog)) {
      const head = headAnchor(rows);
      assert.ok(head.x >= 0 && head.y >= 0);
    }
  });

  it('has art for every item, as rectangular grids of known colors', () => {
    const art = [
      ...HATS.map((h) => HAT_ART[h.id]),
      ...FACES.map((f) => FACE_ART[f.id]),
      ...EXTRAS.map((e) => EXTRA_ART[e.id]),
    ];
    for (const { rows } of art) {
      assert.ok(rows.length > 0);
      for (const row of rows) {
        assert.equal(row.length, rows[0].length);
        for (const code of row) assert.ok(code === '.' || code in PALETTE, `unknown code ${code}`);
      }
    }
  });
});
