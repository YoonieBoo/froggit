// Accessories drawn on top of the frog. Codes are defined in palette.ts; '.' is transparent.
//
// Each piece is placed relative to the frog's head anchor: the top-left outline
// pixel of the head in the current frame (see headAnchor below). `dx`/`dy`
// move the piece's top-left corner from there, in right-facing sprite pixels.

import type { FaceId, HatId } from '../../shared/customization';

export interface AccessoryArt {
  rows: string[];
  dx: number;
  dy: number;
}

// Hats rest their bottom row on the top row of the head, so the eyes stay uncovered.
export const HAT_ART: Record<HatId, AccessoryArt> = {
  mushroom: {
    dx: -2,
    dy: -4,
    rows: [
      '...kkkkkk...',
      '.kkMMwMMMkk.',
      'kMwMMMMMwMMk',
      'kMMMMwMMMMRk',
      'kkkkkkkkkkkk',
    ],
  },
  crown: {
    dx: 1,
    dy: -3,
    rows: [
      '.k.k.k.',
      'kOkOkOk',
      'kuOrOqk',
      'kkkkkkk',
    ],
  },
  wizard: {
    dx: -2,
    dy: -7,
    rows: [
      '...kk......',
      '..kvvk.....',
      '...kvvk....',
      '...kvuvk...',
      '..kvvvvVk..',
      '.kvvvvvvVk.',
      'kvvvvvvvvVk',
      'kkkkkkkkkkk',
    ],
  },
  // The bill points the way the frog faces.
  cap: {
    dx: -1,
    dy: -4,
    rows: [
      '...kkkkk.....',
      '.kkcccccck...',
      'kcccccccck...',
      'kcccccccCkkkk',
      'kCCCCCCCCCCCk',
      '..........kkk',
    ],
  },
};

// Face pieces trace the outlines of both eyes, leaving the eyes themselves visible.
export const FACE_ART: Record<FaceId, AccessoryArt> = {
  'round-glasses': {
    dx: -3,
    dy: 0,
    rows: [
      '...aaa.aaaa.',
      '..a...a....a',
      '..a...a....a',
      '.a.aaaa....a',
      'a......aaaa.',
    ],
  },
  sunglasses: {
    dx: -3,
    dy: 0,
    rows: [
      '...kkk.kkkk.',
      '..kxzzkxzzzk',
      '..kzxzkzxzzk',
      '.k.kkkkzzzzk',
      'k......kkkk.',
    ],
  },
};

/**
 * The first opaque pixel of a frog frame's top row: the top-left of the head.
 * Frames move the head around (crouching lowers it, jumping leans it forward),
 * so accessories follow this point rather than a fixed spot.
 */
export function headAnchor(rows: string[]): { x: number; y: number } {
  const y = rows.findIndex((row) => /[^.]/.test(row));
  return { x: rows[y].search(/[^.]/), y };
}
