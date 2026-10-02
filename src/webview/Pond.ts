import { motion } from './motion';
import type { Screen } from './renderer';

// Scene colors. These are separate from the sprite palette because the
// background is drawn procedurally rather than from grids.
const C = {
  skyTop: '#a9dccd',
  skyLow: '#c6e8cf',
  bush: '#4f8f5a',
  bushDark: '#3f7a4b',
  cattail: '#6b4a2e',
  reed: '#5a8f3e',
  water: '#3f8fa3',
  waterDark: '#357a8e',
  shimmer: '#86cad3',
  pad: '#4fa64a',
  padDark: '#3b8a3c',
  grassTop: '#7cbf55',
  grass: '#5f9e46',
  grassDark: '#4a8538',
  stone: '#9aa0a6',
  stoneDark: '#7b8188',
  flowerYellow: '#f2d75a',
  flowerPink: '#f29ab0',
};

/** Small deterministic random generator so the scenery doesn't reshuffle. */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Shimmer {
  x: number;
  y: number;
  len: number;
  speed: number;
  phase: number;
}

/** The pond scenery: sky, far bank, water with lily pads, and the grassy near bank. */
export class Pond {
  /** Row the frog's feet stand on. */
  groundY = 0;
  waterTop = 0;

  private background?: HTMLCanvasElement;
  private shimmers: Shimmer[] = [];
  private width = 0;

  build(width: number, height: number): void {
    this.width = width;
    this.groundY = height - Math.max(8, Math.round(height * 0.22));
    this.waterTop = Math.round(height * 0.45);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d')!;
    const rand = seededRandom(1337);
    const rect = (color: string, x: number, y: number, w = 1, h = 1) => {
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
    };

    // Sky in two soft bands.
    rect(C.skyTop, 0, 0, width, height);
    rect(C.skyLow, 0, Math.round(this.waterTop * 0.55), width, this.waterTop);

    // Far bank: bumpy bushes along the top edge of the water.
    for (let x = 0; x < width; x += 3) {
      const bump = 2 + Math.floor(rand() * 3);
      rect(C.bush, x, this.waterTop - bump, 3, bump);
      rect(C.bushDark, x, this.waterTop - 1, 3, 1);
    }

    // Cattails on the far bank.
    for (let i = 0; i < Math.max(2, Math.floor(width / 30)); i++) {
      const x = Math.floor(rand() * width);
      const tall = 6 + Math.floor(rand() * 5);
      rect(C.reed, x, this.waterTop - tall, 1, tall);
      rect(C.cattail, x, this.waterTop - tall + 1, 1, 3);
    }

    // Water with a few darker rows for depth.
    rect(C.water, 0, this.waterTop, width, this.groundY - this.waterTop);
    for (let y = this.waterTop + 3; y < this.groundY; y += 4) {
      rect(C.waterDark, 0, y, width, 1);
    }

    // Lily pads.
    const padCount = Math.max(2, Math.floor(width / 40));
    for (let i = 0; i < padCount; i++) {
      const x = Math.floor(((i + 0.2 + rand() * 0.6) / padCount) * width) - 4;
      const y = this.waterTop + 2 + Math.floor(rand() * Math.max(1, this.groundY - this.waterTop - 6));
      this.drawLilyPad(rect, x, y, rand() < 0.4);
    }

    // Near bank: grass with a lighter top edge.
    rect(C.grass, 0, this.groundY, width, height - this.groundY);
    rect(C.grassTop, 0, this.groundY, width, 1);
    for (let y = this.groundY + 3; y < height; y += 3) {
      for (let x = Math.floor(rand() * 4); x < width; x += 4 + Math.floor(rand() * 5)) {
        rect(C.grassDark, x, y, 1, 1);
      }
    }

    // Grass tufts poking up, some with flowers.
    for (let x = 1; x < width; x += 2 + Math.floor(rand() * 6)) {
      const tall = 1 + Math.floor(rand() * 3);
      rect(C.grassTop, x, this.groundY - tall, 1, tall);
      if (rand() < 0.12) {
        rect(rand() < 0.5 ? C.flowerYellow : C.flowerPink, x, this.groundY - tall - 1);
      }
    }

    // A couple of stones.
    for (let i = 0; i < Math.max(1, Math.floor(width / 60)); i++) {
      const x = Math.floor(rand() * (width - 5));
      const y = this.groundY + 2 + Math.floor(rand() * Math.max(1, height - this.groundY - 4));
      rect(C.stone, x + 1, y, 3, 1);
      rect(C.stone, x, y + 1, 5, 1);
      rect(C.stoneDark, x, y + 2, 5, 1);
    }

    this.background = canvas;

    // Moving light streaks on the water.
    this.shimmers = Array.from({ length: Math.max(3, Math.floor(width / 25)) }, () => ({
      x: rand() * width,
      y: this.waterTop + 1 + Math.floor(rand() * Math.max(1, this.groundY - this.waterTop - 2)),
      len: 2 + Math.floor(rand() * 3),
      speed: 1 + rand() * 2,
      phase: rand() * Math.PI * 2,
    }));
  }

  draw(screen: Screen, time: number): void {
    if (!this.background) return;
    const ctx = screen.ctx;
    ctx.drawImage(this.background, 0, 0);
    if (motion.reduced) return;

    ctx.fillStyle = C.shimmer;
    for (const s of this.shimmers) {
      // Fade in and out so streaks don't pop.
      const alpha = 0.5 + 0.5 * Math.sin(time * 1.3 + s.phase);
      if (alpha < 0.25) continue;
      ctx.globalAlpha = alpha;
      const x = Math.floor((s.x + time * s.speed) % (this.width + s.len)) - s.len;
      ctx.fillRect(x, s.y, s.len, 1);
    }
    ctx.globalAlpha = 1;
  }

  private drawLilyPad(
    rect: (color: string, x: number, y: number, w?: number, h?: number) => void,
    x: number,
    y: number,
    small: boolean,
  ): void {
    const rows = small ? [[1, 4], [0, 6], [1, 4]] : [[2, 5], [0, 9], [0, 9], [2, 5]];
    rows.forEach(([offset, w], i) => rect(C.pad, x + offset, y + i, w, 1));
    // Notch and underside shading.
    rect(C.water, x + (small ? 4 : 6), y + 1, small ? 2 : 3, 1);
    const last = rows[rows.length - 1];
    rect(C.padDark, x + last[0], y + rows.length - 1, last[1], 1);
  }
}
