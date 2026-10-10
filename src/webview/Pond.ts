import { DEFAULT_POND, type DecorationId, type PondId } from '../shared/customization';
import { DECORATION_ART, decorationBase } from './decorations';
import { motion } from './motion';
import { POND_THEMES, type Paint, type PondTheme, type SceneBox } from './pondThemes';

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

/**
 * The pond scenery: sky, far bank, water with lily pads, and the grassy near bank,
 * colored and decorated by the current theme.
 */
export class Pond {
  /** Row the frog's feet stand on. */
  groundY = 0;
  waterTop = 0;

  private themeId: PondId = DEFAULT_POND;
  private decorations: readonly DecorationId[] = [];
  private background?: HTMLCanvasElement;
  private shimmers: Shimmer[] = [];
  private ambient?: (ctx: CanvasRenderingContext2D, time: number) => void;
  private width = 0;
  private height = 0;

  get theme(): PondTheme {
    return POND_THEMES[this.themeId];
  }

  /** Switches theme and decorations, redrawing the scenery if anything changed. */
  setLook(themeId: PondId, decorations: readonly DecorationId[]): void {
    const same =
      themeId === this.themeId && decorations.join() === this.decorations.join();
    if (same) return;
    this.themeId = themeId;
    this.decorations = decorations;
    if (this.background) this.build(this.width, this.height);
  }

  build(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.groundY = height - Math.max(8, Math.round(height * 0.22));
    this.waterTop = Math.round(height * 0.45);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d')!;
    // The layout stream stays the same for every theme; extras get their own
    // stream so adding them never moves the lily pads or stones.
    const rand = seededRandom(1337);
    const extrasRand = seededRandom(4242);
    const rect: Paint = (color, x, y, w = 1, h = 1) => {
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
    };
    const { colors: C, sky, ground, ambient } = this.theme;
    const scene: SceneBox = { width, height, waterTop: this.waterTop, groundY: this.groundY };

    // Sky in two soft bands.
    rect(C.skyTop, 0, 0, width, height);
    rect(C.skyLow, 0, Math.round(this.waterTop * 0.55), width, this.waterTop);
    sky?.(rect, scene, extrasRand);

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
      this.drawLilyPad(rect, x, y, rand() < 0.4, C.pad, C.padDark, C.water);
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
        rect(rand() < 0.5 ? C.flowerA : C.flowerB, x, this.groundY - tall - 1);
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

    ground?.(rect, scene, extrasRand);
    for (const id of this.decorations) {
      const art = DECORATION_ART[id];
      art.draw(rect, Math.round(art.at * width), decorationBase(art.placement, scene), C, g);
    }
    this.background = canvas;
    this.ambient = ambient?.(scene, extrasRand);

    // Moving light streaks on the water.
    this.shimmers = Array.from({ length: Math.max(3, Math.floor(width / 25)) }, () => ({
      x: rand() * width,
      y: this.waterTop + 1 + Math.floor(rand() * Math.max(1, this.groundY - this.waterTop - 2)),
      len: 2 + Math.floor(rand() * 3),
      speed: 1 + rand() * 2,
      phase: rand() * Math.PI * 2,
    }));
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.background) return;
    ctx.drawImage(this.background, 0, 0);
    if (motion.reduced) return;

    ctx.fillStyle = this.theme.colors.shimmer;
    for (const s of this.shimmers) {
      // Fade in and out so streaks don't pop.
      const alpha = 0.5 + 0.5 * Math.sin(time * 1.3 + s.phase);
      if (alpha < 0.25) continue;
      ctx.globalAlpha = alpha;
      const x = Math.floor((s.x + time * s.speed) % (this.width + s.len)) - s.len;
      ctx.fillRect(x, s.y, s.len, 1);
    }
    ctx.globalAlpha = 1;
    this.ambient?.(ctx, time);
  }

  private drawLilyPad(
    rect: Paint,
    x: number,
    y: number,
    small: boolean,
    pad: string,
    padDark: string,
    water: string,
  ): void {
    const rows = small ? [[1, 4], [0, 6], [1, 4]] : [[2, 5], [0, 9], [0, 9], [2, 5]];
    rows.forEach(([offset, w], i) => rect(pad, x + offset, y + i, w, 1));
    // Notch and underside shading.
    rect(water, x + (small ? 4 : 6), y + 1, small ? 2 : 3, 1);
    const last = rows[rows.length - 1];
    rect(padDark, x + last[0], y + rows.length - 1, last[1], 1);
  }
}
