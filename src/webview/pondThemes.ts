// Pond themes: the scene palette plus optional extra scenery.
// Pond.ts lays out the scene (sky, far bank, water, lily pads, near bank) the same
// way for every theme; a theme only recolors it and adds its own touches.
//
// Keep extras subtle and out of the band where bugs hover (just above the frog),
// so bugs stay easy to spot on every pond.

import type { PondId } from '../shared/customization';

export interface PondColors {
  skyTop: string;
  skyLow: string;
  bush: string;
  bushDark: string;
  cattail: string;
  reed: string;
  water: string;
  waterDark: string;
  shimmer: string;
  pad: string;
  padDark: string;
  grassTop: string;
  grass: string;
  grassDark: string;
  stone: string;
  stoneDark: string;
  flowerA: string;
  flowerB: string;
}

/** Scene layout, in logical pixels. */
export interface SceneBox {
  width: number;
  height: number;
  waterTop: number;
  groundY: number;
}

export type Paint = (color: string, x: number, y: number, w?: number, h?: number) => void;

/** Draws static scenery into the background. Gets its own random stream. */
export type Painter = (paint: Paint, scene: SceneBox, rand: () => number) => void;

/** Sets up something that moves, and returns how to draw it at a given time. */
export type Ambient = (
  scene: SceneBox,
  rand: () => number,
) => (ctx: CanvasRenderingContext2D, time: number) => void;

export interface PondTheme {
  colors: PondColors;
  /** HUD style that reads well on this sky. */
  hud: 'light' | 'dark';
  /** Drawn on the sky, behind the far bank. */
  sky?: Painter;
  /** Drawn last, over the banks and water. */
  ground?: Painter;
  /** Moving extras, drawn every frame unless motion is reduced. */
  ambient?: Ambient;
}

// ── Shared pieces ──────────────────────────────────────────────────────────

/** Round blossom or leaf canopies on the far bank. */
function trees(trunk: string, leaves: [string, string, string]): Painter {
  return (paint, { width, waterTop }, rand) => {
    const count = Math.max(1, Math.floor(width / 45));
    for (let i = 0; i < count; i++) {
      const cx = Math.floor(((i + 0.25 + rand() * 0.5) / count) * width);
      const rx = 5 + Math.floor(rand() * 3);
      const ry = 3 + Math.floor(rand() * 2);
      const cy = waterTop - ry - 4;
      paint(trunk, cx, cy, 1, waterTop - cy);
      for (let y = -ry; y <= ry; y++) {
        for (let x = -rx; x <= rx; x++) {
          const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
          if (d > 1) continue;
          // Light on top, shade underneath, a few speckles in between.
          const color = y < -ry / 3 ? leaves[0] : y > ry / 3 ? leaves[2] : leaves[1];
          paint(rand() < 0.12 ? leaves[0] : color, cx + x, cy + y);
        }
      }
    }
  };
}

/** Bits scattered on the water and grass: petals or fallen leaves. */
function scatter(colors: string[], perPixels: number): Painter {
  return (paint, { width, height, waterTop }, rand) => {
    const count = Math.floor((width * (height - waterTop)) / perPixels);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rand() * width);
      const y = waterTop + 1 + Math.floor(rand() * (height - waterTop - 1));
      paint(colors[Math.floor(rand() * colors.length)], x, y);
    }
  };
}

/** Petals or leaves drifting down across the scene and swaying as they fall. */
function drifting(colors: string[], perWidth: number, size: number): Ambient {
  return ({ width, height }, rand) => {
    const bits = Array.from({ length: Math.max(3, Math.floor(width / perWidth)) }, () => ({
      x: rand() * width,
      y: rand() * height,
      fall: 3 + rand() * 3,
      drift: 2 + rand() * 3,
      phase: rand() * Math.PI * 2,
      color: colors[Math.floor(rand() * colors.length)],
    }));
    return (ctx, time) => {
      for (const b of bits) {
        const x = (b.x + time * b.drift + Math.sin(time * 1.5 + b.phase) * 2) % (width + 4);
        const y = (b.y + time * b.fall) % (height + 4);
        ctx.fillStyle = b.color;
        ctx.fillRect(Math.floor(x) - 2, Math.floor(y) - 2, size, 1);
      }
    };
  };
}

// ── Themes ─────────────────────────────────────────────────────────────────

const classic: PondTheme = {
  hud: 'light',
  colors: {
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
    flowerA: '#f2d75a',
    flowerB: '#f29ab0',
  },
};

const MOON = ['.MMMM.', 'MMMMSM', 'MMMMMM', 'MSMMMM', 'MMMMSM', '.MMMM.'];

const moonlight: PondTheme = {
  hud: 'dark',
  colors: {
    skyTop: '#141c3a',
    skyLow: '#1d2850',
    bush: '#1f4038',
    bushDark: '#17322d',
    cattail: '#3d2e22',
    reed: '#2b4d3a',
    water: '#1d3c5e',
    waterDark: '#183252',
    shimmer: '#7b9bd0',
    pad: '#2f6b4b',
    padDark: '#24573d',
    grassTop: '#3f7b50',
    grass: '#2f5f41',
    grassDark: '#254c34',
    stone: '#5d6579',
    stoneDark: '#484f62',
    flowerA: '#e9e3a6',
    flowerB: '#b9a7e2',
  },
  sky: (paint, { width, waterTop }, rand) => {
    // Stars, then a moon to the right of center (clear of the HUD on the left).
    const stars = Math.floor((width * waterTop) / 70);
    for (let i = 0; i < stars; i++) {
      const x = Math.floor(rand() * width);
      const y = 1 + Math.floor(rand() * Math.max(1, waterTop - 7));
      paint(rand() < 0.7 ? '#c9d3f5' : '#ffffff', x, y);
    }
    const mx = Math.floor(width * 0.72);
    const my = Math.max(2, Math.round(waterTop * 0.3) - 3);
    MOON.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== '.') paint(row[x] === 'M' ? '#f3eec8' : '#d4cc9a', mx + x, my + y);
      }
    });
  },
  // Fireflies stay low over the grass, below the bugs, and glow softly green
  // so they can't be mistaken for yellow gnats.
  ambient: ({ width, height, groundY }, rand) => {
    const flies = Array.from({ length: Math.max(3, Math.floor(width / 30)) }, () => ({
      x: rand() * width,
      y: groundY + 2 + rand() * Math.max(1, height - groundY - 4),
      phase: rand() * Math.PI * 2,
      speed: 0.6 + rand() * 0.6,
    }));
    return (ctx, time) => {
      for (const f of flies) {
        const glow = 0.5 + 0.5 * Math.sin(time * f.speed * 2 + f.phase);
        if (glow < 0.2) continue;
        const x = Math.round(f.x + Math.sin(time * f.speed + f.phase) * 4);
        const y = Math.round(f.y + Math.cos(time * f.speed * 0.7 + f.phase) * 1.5);
        ctx.globalAlpha = glow * 0.35;
        ctx.fillStyle = '#b8f28a';
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
        ctx.globalAlpha = glow;
        ctx.fillStyle = '#e4ffc0';
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
    };
  },
};

const sakura: PondTheme = {
  hud: 'light',
  colors: {
    skyTop: '#f4d6e2',
    skyLow: '#fae8ef',
    bush: '#7aac76',
    bushDark: '#659762',
    cattail: '#7a5a44',
    reed: '#7aa866',
    water: '#6aafc4',
    waterDark: '#5c9fb4',
    shimmer: '#c6e7ef',
    pad: '#66ad5c',
    padDark: '#53964b',
    grassTop: '#9cd078',
    grass: '#82bb61',
    grassDark: '#6da450',
    stone: '#b0a7ac',
    stoneDark: '#928a8f',
    flowerA: '#ffffff',
    flowerB: '#f29ab0',
  },
  sky: trees('#6b4a3a', ['#fbd0dc', '#f4adc3', '#e38aa6']),
  ground: scatter(['#f8c8d6', '#f4adc3'], 130),
  ambient: drifting(['#f8c8d6', '#f2a5bd', '#ffffff'], 32, 2),
};

const autumn: PondTheme = {
  hud: 'light',
  colors: {
    skyTop: '#b9d3e0',
    skyLow: '#d7e4e4',
    bush: '#c46f2e',
    bushDark: '#a45826',
    cattail: '#5e3b22',
    reed: '#9a7d3c',
    water: '#4e8794',
    waterDark: '#447884',
    shimmer: '#9fc8cc',
    pad: '#8f9a3f',
    padDark: '#768033',
    grassTop: '#adb251',
    grass: '#8f9a44',
    grassDark: '#78823a',
    stone: '#9b938b',
    stoneDark: '#7d756d',
    flowerA: '#e6b443',
    flowerB: '#d0603a',
  },
  sky: trees('#5e3b22', ['#f0b544', '#d9772e', '#b84a2a']),
  ground: (paint, scene, rand) => {
    scatter(['#d9772e', '#e8a33a', '#b84a2a'], 140)(paint, scene, rand);
    // Toadstools dotted along the near bank.
    const { width, height, groundY } = scene;
    for (let i = 0; i < Math.max(1, Math.floor(width / 40)); i++) {
      const x = 2 + Math.floor(rand() * (width - 6));
      const y = groundY + 2 + Math.floor(rand() * Math.max(1, height - groundY - 5));
      paint('#c0392b', x, y, 3, 1);
      paint('#f3e3c3', x + 1, y + 1, 1, 2);
      paint('#f7f1e1', x + 1, y);
    }
  },
  ambient: drifting(['#d9772e', '#e8a33a', '#b84a2a'], 45, 2),
};

export const POND_THEMES: Record<PondId, PondTheme> = { classic, moonlight, sakura, autumn };
