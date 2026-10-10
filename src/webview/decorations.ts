// Pond decorations. Each one has a fixed spot, given as a fraction of the pond's
// width, so they never overlap. They're painted into the background, behind the
// frog and the bugs. Grid codes are defined in sprites/palette.ts.

import type { DecorationId } from '../shared/customization';
import type { Paint, PondColors, SceneBox } from './pondThemes';
import { PALETTE } from './sprites/palette';

/** Where a decoration sits: in the near-bank grass, on the water, or on the shoreline. */
export type Placement = 'grass' | 'water' | 'shore';

export interface DecorationArt {
  placement: Placement;
  /** Horizontal center, as a fraction of the pond's width. */
  at: number;
  /** Paints the decoration centered on x, with its bottom row at y. */
  draw(paint: Paint, x: number, y: number, colors: PondColors, g: CanvasRenderingContext2D): void;
}

function grid(rows: string[]): DecorationArt['draw'] {
  return (paint, x, y) => {
    const left = x - Math.floor(rows[0].length / 2);
    const top = y - rows.length + 1;
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] !== '.') paint(PALETTE[row[rx]], left + rx, top + ry);
      }
    });
  };
}

const FLOWERS = [
  '.w.....p..',
  'wOw...pOp.',
  '.wG.p..pG.',
  '..GpOp.G..',
  '..G.pG.G..',
  '..G..GG...',
];

const MUSHROOMS = [
  '.MMM.....',
  'MwMMM....',
  'MMMwM.MM.',
  '..e..MwMM',
  '..e...e..',
  '..e...e..',
];

const LANTERN = [
  '..K..',
  '.KKK.',
  'KuuuK',
  'KuOuK',
  'KuuuK',
  '.KKK.',
  '..J..',
  '..J..',
  '..J..',
  '.JJJ.',
];

export const DECORATION_ART: Record<DecorationId, DecorationArt> = {
  flowers: { placement: 'grass', at: 0.12, draw: grid(FLOWERS) },
  lantern: {
    placement: 'grass',
    at: 0.3,
    draw: (paint, x, y, colors, g) => {
      // A soft, round glow around the glass; it shows most on dark ponds.
      g.globalAlpha = 0.22;
      [5, 7, 9, 9, 9, 7, 5].forEach((w, i) => paint('#fff3b0', x - (w >> 1), y - 12 + i, w, 1));
      g.globalAlpha = 1;
      grid(LANTERN)(paint, x, y, colors, g);
    },
  },
  'lily-flower': {
    placement: 'water',
    // On the water above the flower patch: clear of the lantern, and of the
    // frog's starting spot in the middle.
    at: 0.22,
    draw: (paint, x, y, colors) => {
      // A big pad in the theme's colors with a pink water lily on top.
      const left = x - 5;
      [[2, 7], [0, 11], [0, 11], [2, 7]].forEach(([offset, w], i) =>
        paint(i === 3 ? colors.padDark : colors.pad, left + offset, y - 3 + i, w, 1),
      );
      paint(colors.water, left + 8, y - 2, 3, 1);
      paint('#f6b8c8', x - 2, y - 4, 1, 2);
      paint('#f6b8c8', x + 1, y - 4, 1, 2);
      paint('#ef8a9a', x - 1, y - 5, 2, 3);
      paint('#f2d75a', x - 1, y - 3, 2, 1);
    },
  },
  rocks: {
    placement: 'shore',
    at: 0.66,
    draw: (paint, x, y, colors) => {
      // A big rock and a pebble, half in the water, in the theme's stone colors.
      paint(colors.stone, x - 3, y - 3, 5, 1);
      paint(colors.stone, x - 4, y - 2, 7, 2);
      paint(colors.stoneDark, x - 4, y, 7, 1);
      paint('#ffffff', x - 2, y - 3, 1, 1);
      paint(colors.stone, x + 4, y - 1, 3, 1);
      paint(colors.stoneDark, x + 4, y, 3, 1);
    },
  },
  mushrooms: { placement: 'grass', at: 0.86, draw: grid(MUSHROOMS) },
};

/** Where a decoration's bottom row goes in a scene. */
export function decorationBase(placement: Placement, scene: SceneBox): number {
  const { height, waterTop, groundY } = scene;
  switch (placement) {
    case 'grass':
      return Math.min(height - 1, groundY + 5);
    case 'water':
      return Math.round((waterTop + groundY) / 2) + 2;
    case 'shore':
      return groundY;
  }
}
