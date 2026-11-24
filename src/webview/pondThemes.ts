// Pond themes: the scene palette plus optional extra scenery.
// Pond.ts lays out the scene (sky, far bank, water, lily pads, near bank) the same
// way for every theme; a theme only recolors it and adds its own touches.
//
// Keep extras subtle and out of the band where bugs hover (just above the frog),
// so bugs stay easy to spot on every pond.

import type { PondId } from '../shared/customization';
import { forEachTextPixel, GLYPH_HEIGHT, textWidth } from './sprites/font';

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
  /** The XP plank's lower-right corner, when it's showing, so extras can avoid it. */
  hud?: { right: number; bottom: number };
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
  /**
   * A big moment every `every` seconds in the ambient layer (a holiday
   * message, a fireworks volley). The frog smiles and throws confetti in
   * `colors` each time one starts; both run off the same clock.
   */
  finale?: { every: number; colors: string[] };
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

// ── Holiday ponds ──────────────────────────────────────────────────────────

const FINALE_EVERY = 30;
const BANNER_IN = 0.7;
const BANNER_HOLD = 2.6;
const BANNER_OUT = 0.8;

/**
 * A holiday message that twinkles into the sky at the start of each finale:
 * letters light up pixel by pixel, sparkle for a moment, then fade. It sits
 * right of the XP plank and above the bugs; if the pond is too small to fit
 * the words, it's skipped.
 */
function banner(text: string, colors: string[], stayUp = false): Ambient {
  return (scene) => {
    const box = bannerBox(text, scene);
    const fits = box !== null;
    const pixels: { x: number; y: number; letter: number; delay: number }[] = [];
    if (box) {
      forEachTextPixel(text, box.left, box.top, (x, y, letter) => {
        // A fixed scatter so every pixel lights up at its own moment.
        const delay = (((x * 73 + y * 151) % 97) / 97) * BANNER_IN;
        pixels.push({ x, y, letter, delay });
      });
    }
    return (ctx, time) => {
      const t = stayUp ? time : time % FINALE_EVERY;
      if (!fits || (!stayUp && t > BANNER_TIME)) return;
      const fade = !stayUp && t > BANNER_IN + BANNER_HOLD ? 1 - (t - BANNER_IN - BANNER_HOLD) / BANNER_OUT : 1;
      for (const px of pixels) {
        if (t < px.delay) continue;
        const sparkle = (Math.floor(time * 10) + px.x * 7 + px.y * 3) % 23 === 0;
        ctx.globalAlpha = fade;
        ctx.fillStyle = sparkle ? '#ffffff' : colors[px.letter % colors.length];
        ctx.fillRect(px.x, px.y, 1, 1);
      }
      ctx.globalAlpha = 1;
    };
  };
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Where a banner's text goes, or null if the pond is too small to fit it.
 * It sits right of center, slides left as far as the edge allows, and drops
 * below the XP plank if it would touch it, as long as it stays above the bugs.
 */
function bannerBox(text: string, { width, waterTop, groundY, hud }: SceneBox): Box | null {
  const w = textWidth(text);
  const left = Math.round(Math.max(2, Math.min(width - w - 3, width * 0.64 - w / 2)));
  let top = Math.max(3, Math.round(waterTop * 0.36));
  if (hud && left <= hud.right && top <= hud.bottom) top = hud.bottom + 2;
  if (left + w > width - 2 || top + GLYPH_HEIGHT >= groundY - 27) return null;
  return { left, top, right: left + w - 1, bottom: top + GLYPH_HEIGHT - 1 };
}

const BANNER_TIME = BANNER_IN + BANNER_HOLD + BANNER_OUT;
const insideBox = (box: Box | null, x: number, y: number, margin: number) =>
  !!box && x >= box.left - margin && x <= box.right + margin && y >= box.top - margin && y <= box.bottom + margin;

/** Runs several ambient layers together, in order. */
function layers(...parts: Ambient[]): Ambient {
  return (scene, rand) => {
    const draws = parts.map((part) => part(scene, rand));
    return (ctx, time) => draws.forEach((draw) => draw(ctx, time));
  };
}

/** Where the lit tree stands on the Snowy pond; its lights blink in the ambient layer. */
const litTree = ({ width, waterTop }: SceneBox) => ({ x: Math.round(width * 0.62), base: waterTop - 1, h: 11 });

/** A snowy pine: rows widen every other step, with snow on the left edges. */
function pine(paint: Paint, cx: number, base: number, h: number): void {
  for (let r = 0; r < h; r++) {
    const half = Math.floor((r + 1) * 0.45);
    const y = base - h + 1 + r;
    paint('#2f5e48', cx - half, y, half * 2 + 1, 1);
    if (r % 3 === 1) paint('#ffffff', cx - half, y, Math.max(1, half), 1);
  }
}

const TREE_LIGHTS = ['#ff6b6b', '#ffd166', '#7bdff2'];

const SNOWY_FESTIVE = ['#d9473f', '#e0a800', '#2e8b57'];

const snowy: PondTheme = {
  hud: 'light',
  finale: { every: FINALE_EVERY, colors: ['#ffffff', ...SNOWY_FESTIVE] },
  colors: {
    skyTop: '#c6d6e5',
    skyLow: '#dfe9f2',
    bush: '#3f6b57',
    bushDark: '#335a49',
    cattail: '#5b4636',
    reed: '#6f8f7a',
    water: '#5f93ad',
    waterDark: '#55869f',
    shimmer: '#cfe6f2',
    pad: '#4f8a63',
    padDark: '#41744f',
    grassTop: '#ffffff',
    grass: '#edf3f8',
    grassDark: '#d4dfea',
    stone: '#98a3ad',
    stoneDark: '#7c8791',
    flowerA: '#c0392b', // holly berries poking out of the snow
    flowerB: '#2e7d4f',
  },
  sky: (paint, scene, rand) => {
    const count = Math.max(2, Math.floor(scene.width / 35));
    for (let i = 0; i < count; i++) {
      const x = Math.floor(((i + 0.2 + rand() * 0.6) / count) * scene.width);
      pine(paint, x, scene.waterTop - 1, 7 + Math.floor(rand() * 3));
    }
    const tree = litTree(scene);
    pine(paint, tree.x, tree.base, tree.h);
    paint('#f5c542', tree.x, tree.base - tree.h, 1, 1);
    paint('#f5c542', tree.x - 1, tree.base - tree.h + 1, 3, 1);
  },
  // Slow snowfall, the lights on the tree twinkling in turn, and the message.
  ambient: layers((scene, rand) => {
    const snow = drifting(['#ffffff', '#f4f8fc'], 12, 1)(scene, rand);
    const tree = litTree(scene);
    const lights = Array.from({ length: 6 }, (_, i) => {
      const r = 3 + i;
      const half = Math.floor((r + 1) * 0.45);
      return { x: tree.x + (i % 2 ? half : -half), y: tree.base - tree.h + 1 + r, phase: i * 0.7 };
    });
    return (ctx, time) => {
      snow(ctx, time);
      lights.forEach((light, i) => {
        if (Math.sin(time * 2.2 + light.phase) < -0.3) return;
        ctx.fillStyle = TREE_LIGHTS[i % TREE_LIGHTS.length];
        ctx.fillRect(light.x, light.y, 1, 1);
      });
    };
  }, banner('merry christmas', SNOWY_FESTIVE)),
};

export const FIREWORK_COLORS = ['#ff6b8b', '#ffd166', '#7bdff2', '#b8f28a', '#c9a7ff'];
const ROCKET_TIME = 0.45;
const BURST_TIME = 1.4;
const FINALE_BURSTS = 6;
const NEW_YEAR = 'happy new year';
const FINALE_STAGGER = 0.22;

/**
 * One firework at `p` (0..1) through its burst: two rings of sparks that open,
 * sink a little and fade, a few crackling sparks near the end, and a soft
 * glow on the water below.
 */
function burst(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: number,
  size: number,
  color: string,
  time: number,
  waterTop: number,
  keepClear: Box | null,
): void {
  const radius = 1 + size * (1 - (1 - p) * (1 - p));
  const sink = p * 2;
  // Sparks skip the space around a message, so the words stay readable.
  const spark = (sx: number, sy: number) => {
    if (!insideBox(keepClear, sx, sy, 1)) ctx.fillRect(sx, sy, 1, 1);
  };
  ctx.globalAlpha = 1 - p * p;
  ctx.fillStyle = color;
  for (const [count, scale] of [[size > 5 ? 16 : 10, 1], [8, 0.5]] as const) {
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + scale;
      spark(Math.round(x + Math.cos(a) * radius * scale), Math.round(y + Math.sin(a) * radius * scale + sink));
    }
  }
  if (p < 0.2) {
    ctx.fillStyle = '#ffffff';
    spark(x, y);
  }
  if (p > 0.45) {
    // Crackle: sparks just outside the ring that flicker on and off.
    ctx.fillStyle = '#fff3d6';
    for (let k = 0; k < 5; k++) {
      if (Math.floor(time * 14 + k * 3) % 2) continue;
      const a = k * 2.4 + x;
      spark(Math.round(x + Math.cos(a) * (radius + 1)), Math.round(y + Math.sin(a) * (radius + 1) + sink));
    }
  }
  // The burst's glow on the water, dimmer the further it has faded.
  const glow = Math.round(radius * 1.6);
  ctx.globalAlpha = 0.3 * (1 - p);
  ctx.fillStyle = color;
  ctx.fillRect(x - glow, waterTop + 1, glow * 2 + 1, 1);
  ctx.fillRect(x - Math.round(glow / 2), waterTop + 3, glow + 1, 1);
  ctx.globalAlpha = 1;
}

/**
 * Rockets rising from the far bank and bursting in the upper sky: right of the
 * XP plank, left of the wardrobe button, and above the band where bugs hover,
 * so they never hide a bug. Every FINALE_EVERY seconds there's a volley.
 * Sparks skip whatever `keepClear` returns, so a message stays readable.
 */
function fireworkShow(
  scene: SceneBox,
  keepClear: (time: number) => Box | null,
): (ctx: CanvasRenderingContext2D, time: number) => void {
  const { width, waterTop } = scene;
  const high = 9;
  const low = Math.max(high, waterTop - 15);
  const heights = [high, Math.round((high + low) / 2), low];
  const spot = (i: number, of: number) => Math.round(width * (0.36 + (0.52 * (i + 0.5)) / of));
  const sites = Math.max(4, Math.floor(width / 25));
  const shows = Array.from({ length: sites }, (_, i) => ({
    x: spot(i, sites),
    y: heights[i % 3],
    period: 1.4 + (i % 4) * 0.35,
    phase: 1 + i * 0.53, // a burst is already open at time 0, for still previews
  }));
  const finale = Array.from({ length: FINALE_BURSTS }, (_, k) => ({
    x: spot((k * 4) % FINALE_BURSTS, FINALE_BURSTS),
    y: heights[(k + 1) % 3],
    start: k * FINALE_STAGGER,
  }));
  const rocket = (ctx: CanvasRenderingContext2D, x: number, y: number, t: number) => {
    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(x, Math.round(waterTop - (waterTop - y) * (t / ROCKET_TIME)), 1, 2);
  };
  return (ctx, time) => {
    const clear = keepClear(time);
    for (const s of shows) {
      const t = (time + s.phase) % s.period;
      const round = Math.floor((time + s.phase) / s.period);
      if (t < ROCKET_TIME) {
        rocket(ctx, s.x, s.y, t);
        continue;
      }
      const p = (t - ROCKET_TIME) / BURST_TIME;
      if (p >= 1) continue;
      const color = FIREWORK_COLORS[(round + s.x) % FIREWORK_COLORS.length];
      burst(ctx, s.x, s.y, p, round % 3 === 0 ? 7 : 4, color, time, waterTop, clear);
    }
    // The finale: a quick volley across the whole sky.
    const ft = time % FINALE_EVERY;
    for (const [k, f] of finale.entries()) {
      const t = ft - f.start;
      if (t < 0 || t >= BURST_TIME) continue;
      burst(ctx, f.x, f.y, t / BURST_TIME, 7, FIREWORK_COLORS[k % FIREWORK_COLORS.length], time, waterTop, clear);
    }
  };
}

const fireworks: PondTheme = {
  hud: 'dark',
  finale: { every: FINALE_EVERY, colors: FIREWORK_COLORS },
  // A plum and magenta party night, so it doesn't look like Moonlight's blue one.
  colors: {
    skyTop: '#1d0b2c',
    skyLow: '#36143f',
    bush: '#24162f',
    bushDark: '#1a1024',
    cattail: '#3d2433',
    reed: '#2f3a35',
    water: '#2a1c47',
    waterDark: '#23173d',
    shimmer: '#c97fc0',
    pad: '#3c5a49',
    padDark: '#2f4a3b',
    grassTop: '#3d5a45',
    grass: '#2e4637',
    grassDark: '#24382c',
    stone: '#5d4f70',
    stoneDark: '#4a3e5b',
    flowerA: '#ffd166',
    flowerB: '#ff6b8b',
  },
  sky: (paint, { width, waterTop }, rand) => {
    // A warm glow along the horizon, then pink-tinted stars above it.
    paint('#4c1b4a', 0, waterTop - 6, width, 3);
    paint('#62234f', 0, waterTop - 3, width, 3);
    for (let x = 0; x < width; x += 2) paint('#4c1b4a', x + ((waterTop >> 1) % 2), waterTop - 7, 1, 1);
    const stars = Math.floor((width * waterTop) / 120);
    for (let i = 0; i < stars; i++) {
      paint(rand() < 0.6 ? '#f3d9ff' : '#ffffff', Math.floor(rand() * width), 1 + Math.floor(rand() * Math.max(1, waterTop - 9)));
    }
  },
  ambient: layers((scene) => {
    const message = bannerBox(NEW_YEAR, scene);
    return fireworkShow(scene, (time) => (time % FINALE_EVERY < BANNER_TIME ? message : null));
  }, banner(NEW_YEAR, FIREWORK_COLORS)),
};

export const POND_THEMES: Record<PondId, PondTheme> = {
  classic,
  moonlight,
  sakura,
  autumn,
  snowy,
  fireworks,
};

/**
 * The New Year party's sky, for any pond, in two parts so reduced motion can
 * keep the words and skip the fireworks. Draw both with time counted from the
 * party's start.
 */
export const newYearFireworks: Ambient = (scene) => {
  const message = bannerBox(NEW_YEAR, scene);
  return fireworkShow(scene, () => message);
};

/** "happy new year" twinkling in, then staying up. */
export const newYearMessage: Ambient = banner(NEW_YEAR, FIREWORK_COLORS, true);
