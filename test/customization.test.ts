import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultCustomization,
  FACES,
  HATS,
  migrateCustomization,
} from '../src/shared/customization';
import { FACE_ART, HAT_ART, headAnchor } from '../src/webview/sprites/accessories';
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
    assert.deepEqual(Object.keys(clean).sort(), ['decorations', 'face', 'hat', 'pond', 'v']);
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
    const art = [...HATS.map((h) => HAT_ART[h.id]), ...FACES.map((f) => FACE_ART[f.id])];
    for (const { rows } of art) {
      assert.ok(rows.length > 0);
      for (const row of rows) {
        assert.equal(row.length, rows[0].length);
        for (const code of row) assert.ok(code === '.' || code in PALETTE, `unknown code ${code}`);
      }
    }
  });
});
