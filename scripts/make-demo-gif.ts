// Renders images/demo.gif for the README: a scripted scene drawn with the real sprites.
// The egg hatches, bugs fly in, the frog eats them all and celebrates.
// Run with: npm run demo-gif

import { mkdirSync, writeFileSync } from 'fs';
import { BEETLE_0, BEETLE_1, GNAT_0, GNAT_1 } from '../src/webview/sprites/bug';
import { EGG, EGG_CRACKED } from '../src/webview/sprites/egg';
import * as F from '../src/webview/sprites/frog';
import { NOTICE_BUBBLE } from '../src/webview/sprites/fx';
import { PALETTE } from '../src/webview/sprites/palette';

const W = 128;
const H = 64;
const SCALE = 3;
const DT = 0.08; // seconds per frame (12.5 fps)
const DELAY_CS = 8; // the same, in GIF centiseconds
const OUT = 'images/demo.gif';

// ── Pixel buffer with an automatically built palette ──────────────────────

const colors: string[] = [];
const colorIndex = new Map<string, number>();
function idx(color: string): number {
  let i = colorIndex.get(color);
  if (i === undefined) {
    i = colors.length;
    colors.push(color);
    colorIndex.set(color, i);
  }
  return i;
}

function rect(buf: Uint8Array, color: string, x: number, y: number, w = 1, h = 1): void {
  const c = idx(color);
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) {
    for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) buf[j * W + i] = c;
  }
}

function sprite(buf: Uint8Array, rows: string[], x: number, y: number, flip = false): void {
  const px = Math.round(x);
  const py = Math.round(y);
  const w = rows[0].length;
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < w; rx++) {
      const ch = row[flip ? w - 1 - rx : rx];
      if (ch !== '.') rect(buf, PALETTE[ch], px + rx, py + ry);
    }
  });
}

// ── Background (same layout rules as src/webview/Pond.ts) ─────────────────

const C = {
  skyTop: '#a9dccd', skyLow: '#c6e8cf', bush: '#4f8f5a', bushDark: '#3f7a4b',
  cattail: '#6b4a2e', reed: '#5a8f3e', water: '#3f8fa3', waterDark: '#357a8e',
  pad: '#4fa64a', padDark: '#3b8a3c', grassTop: '#7cbf55', grass: '#5f9e46',
  grassDark: '#4a8538', stone: '#9aa0a6', stoneDark: '#7b8188',
  flowerYellow: '#f2d75a', flowerPink: '#f29ab0',
};

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const groundY = H - Math.max(8, Math.round(H * 0.22));
const waterTop = Math.round(H * 0.45);
const background = new Uint8Array(W * H);
{
  const b = background;
  const rand = seededRandom(1337);
  rect(b, C.skyTop, 0, 0, W, H);
  rect(b, C.skyLow, 0, Math.round(waterTop * 0.55), W, waterTop);
  for (let x = 0; x < W; x += 3) {
    const bump = 2 + Math.floor(rand() * 3);
    rect(b, C.bush, x, waterTop - bump, 3, bump);
    rect(b, C.bushDark, x, waterTop - 1, 3, 1);
  }
  for (let i = 0; i < Math.max(2, Math.floor(W / 30)); i++) {
    const x = Math.floor(rand() * W);
    const tall = 6 + Math.floor(rand() * 5);
    rect(b, C.reed, x, waterTop - tall, 1, tall);
    rect(b, C.cattail, x, waterTop - tall + 1, 1, 3);
  }
  rect(b, C.water, 0, waterTop, W, groundY - waterTop);
  for (let y = waterTop + 3; y < groundY; y += 4) rect(b, C.waterDark, 0, y, W, 1);
  const padCount = Math.max(2, Math.floor(W / 40));
  for (let i = 0; i < padCount; i++) {
    const x = Math.floor(((i + 0.2 + rand() * 0.6) / padCount) * W) - 4;
    const y = waterTop + 2 + Math.floor(rand() * Math.max(1, groundY - waterTop - 6));
    const small = rand() < 0.4;
    const rows = small ? [[1, 4], [0, 6], [1, 4]] : [[2, 5], [0, 9], [0, 9], [2, 5]];
    rows.forEach(([o, w], r) => rect(b, C.pad, x + o, y + r, w, 1));
    rect(b, C.water, x + (small ? 4 : 6), y + 1, small ? 2 : 3, 1);
    const last = rows[rows.length - 1];
    rect(b, C.padDark, x + last[0], y + rows.length - 1, last[1], 1);
  }
  rect(b, C.grass, 0, groundY, W, H - groundY);
  rect(b, C.grassTop, 0, groundY, W, 1);
  for (let y = groundY + 3; y < H; y += 3) {
    for (let x = Math.floor(rand() * 4); x < W; x += 4 + Math.floor(rand() * 5)) rect(b, C.grassDark, x, y);
  }
  for (let x = 1; x < W; x += 2 + Math.floor(rand() * 6)) {
    const tall = 1 + Math.floor(rand() * 3);
    rect(b, C.grassTop, x, groundY - tall, 1, tall);
    if (rand() < 0.12) rect(b, rand() < 0.5 ? C.flowerYellow : C.flowerPink, x, groundY - tall - 1);
  }
  for (let i = 0; i < Math.max(1, Math.floor(W / 60)); i++) {
    const x = Math.floor(rand() * (W - 5));
    const y = groundY + 2 + Math.floor(rand() * Math.max(1, H - groundY - 4));
    rect(b, C.stone, x + 1, y, 3, 1);
    rect(b, C.stone, x, y + 1, 5, 1);
    rect(b, C.stoneDark, x, y + 2, 5, 1);
  }
}

// ── Scene state ───────────────────────────────────────────────────────────

type Pose = 'idle' | 'blink' | 'crouch' | 'jump' | 'eat';

const frog = {
  x: 0,
  y: groundY - 13,
  lift: 0,
  facing: 1 as 1 | -1,
  pose: 'idle' as Pose,
  bubble: false,
  tongue: null as { x: number; y: number } | null,
};
const egg = { x: Math.floor((W - 10) / 2), y: groundY - 11, wobble: false, hatchT: -1 };
let actor: 'egg' | 'frog' = 'egg';
let time = 0;

interface Bug {
  frames: string[][];
  w: number;
  h: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  fromX: number;
  fromY: number;
  t: number;
  phase: number;
  caught: boolean;
  gone: boolean;
}
const bugs: Bug[] = [];

function spawn(frames: string[][], homeX: number, homeY: number, fromLeft: boolean, delay: number): void {
  const fromX = fromLeft ? -8 : W + 2;
  bugs.push({
    frames, w: frames[0][0].length, h: frames[0].length,
    x: fromX, y: homeY, homeX, homeY, fromX, fromY: homeY - 6,
    t: -delay, phase: Math.random() * 6, caught: false, gone: false,
  });
}

function updateBugs(): void {
  for (const b of bugs) {
    b.t += DT;
    if (b.caught || b.t < 0) continue;
    const p = Math.min(1, b.t / 1.6);
    const e = 1 - (1 - p) * (1 - p);
    const wx = Math.sin(b.t * 1.3 + b.phase) * 3 * p;
    const wy = Math.sin(b.t * 2.1 + b.phase) * 2 * p;
    b.x = b.fromX + (b.homeX - b.fromX) * e + wx;
    b.y = b.fromY + (b.homeY - b.fromY) * e + wy;
  }
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
const particles: Particle[] = [];
const CONFETTI = ['#f2d75a', '#f29ab0', '#86cad3', '#9be36a', '#ffffff'];

function burst(x: number, y: number, count: number, palette: string[], speed: number): void {
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const v = speed * (0.5 + Math.random() * 0.7);
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.8 + Math.random() * 0.6, color: palette[Math.floor(Math.random() * palette.length)],
    });
  }
}

function updateParticles(): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += 40 * DT;
    p.x += p.vx * DT;
    p.y += p.vy * DT;
    p.life -= DT;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ── Script (one yield = one frame) ────────────────────────────────────────

const clampX = (x: number) => Math.min(W - 16 - 2, Math.max(2, x));
const mouth = () => ({
  x: frog.facing === 1 ? frog.x + 13 : frog.x + 2,
  y: frog.y - frog.lift + 9,
});

function* wait(seconds: number) {
  for (let t = 0; t < seconds - 1e-9; t += DT) yield;
}

function* during(seconds: number, step: (p: number) => void) {
  for (let t = DT; ; t += DT) {
    const p = Math.min(1, t / seconds);
    step(p);
    yield;
    if (p >= 1) break;
  }
}

function* blink() {
  frog.pose = 'blink';
  yield* wait(0.16);
  frog.pose = 'idle';
}

function* notice() {
  frog.bubble = true;
  yield* wait(0.45);
  frog.bubble = false;
}

function* happy() {
  frog.pose = 'blink';
  yield* during(0.5, (p) => (frog.lift = 3 * Math.sin(Math.PI * p)));
  frog.lift = 0;
  frog.pose = 'idle';
}

function* hopTo(target: number) {
  const tx = clampX(target);
  while (Math.abs(tx - frog.x) >= 1) {
    frog.facing = tx > frog.x ? 1 : -1;
    frog.pose = 'crouch';
    yield* wait(0.12);
    const from = frog.x;
    const to = from + Math.sign(tx - from) * Math.min(10, Math.abs(tx - from));
    frog.pose = 'jump';
    yield* during(0.4, (p) => {
      frog.x = from + (to - from) * p;
      frog.lift = 5 * 4 * p * (1 - p);
    });
    frog.lift = 0;
    frog.pose = 'crouch';
    yield* wait(0.08);
  }
  frog.pose = 'idle';
}

function* approach(bug: Bug) {
  const bugX = bug.homeX + bug.w / 2;
  const spots = [bugX - 13 - 6, bugX + 6 - 2]
    .map((s) => ({ s: clampX(s), fits: clampX(s) === s }))
    .sort((a, b) => Number(b.fits) - Number(a.fits) || Math.abs(a.s - frog.x) - Math.abs(b.s - frog.x));
  yield* hopTo(spots[0].s);
}

function* eat(bug: Bug) {
  const center = () => ({ x: bug.x + bug.w / 2, y: bug.y + bug.h / 2 });
  frog.facing = center().x >= frog.x + 8 ? 1 : -1;
  frog.pose = 'eat';
  let target = center();
  const tip = (f: number) => {
    const m = mouth();
    return { x: m.x + (target.x - m.x) * f, y: m.y + (target.y - m.y) * f };
  };
  yield* during(0.12, (p) => {
    target = center();
    frog.tongue = tip(p);
  });
  bug.caught = true;
  yield* wait(0.08);
  yield* during(0.16, (p) => {
    const t = tip(1 - p);
    frog.tongue = t;
    bug.x = t.x - bug.w / 2;
    bug.y = t.y - bug.h / 2;
  });
  frog.tongue = null;
  bug.gone = true;
  const m = mouth();
  burst(m.x, m.y, 4, ['#ffffff', '#f7f7ea'], 15);
  frog.pose = 'idle';
}

function* celebrate() {
  for (let b = 0; b < 3; b++) {
    if (b > 0) frog.facing = frog.facing === 1 ? -1 : 1;
    burst(frog.x + 8, frog.y, 12, CONFETTI, 35);
    yield* during(0.45, (p) => {
      frog.lift = 7 * 4 * p * (1 - p);
      frog.pose = frog.lift > 1 ? 'jump' : 'crouch';
    });
  }
  frog.lift = 0;
  frog.pose = 'idle';
}

function* script() {
  // Egg wobbles, then hatches.
  yield* wait(0.6);
  egg.wobble = true;
  yield* wait(0.6);
  egg.wobble = false;
  yield* wait(0.4);
  yield* during(1.8, (p) => (egg.hatchT = p * 1.8));
  burst(egg.x + 5, egg.y + 4, 16, ['#f3ecd2', '#d8cba3', '#8fcf6a'], 30);
  actor = 'frog';
  frog.x = clampX(egg.x + 5 - 8);
  yield* happy();
  yield* wait(0.6);

  // Bugs fly in (errors and a warning appear).
  spawn([BEETLE_0, BEETLE_1], 88, groundY - 22, false, 0);
  spawn([GNAT_0, GNAT_1], 28, groundY - 18, true, 0.35);
  spawn([BEETLE_0, BEETLE_1], 108, groundY - 16, false, 0.7);
  yield* wait(0.8);
  yield* notice();
  yield* wait(1.0);
  yield* blink();
  yield* wait(0.4);

  // Each fix: hop over and eat one.
  while (bugs.some((b) => !b.gone)) {
    const next = bugs
      .filter((b) => !b.gone)
      .sort((a, b) => Math.abs(a.homeX - frog.x) - Math.abs(b.homeX - frog.x))[0];
    yield* notice();
    yield* approach(next);
    yield* eat(next);
    yield* happy();
  }

  // All clean!
  yield* celebrate();
  yield* wait(0.8);
  yield* blink();
  yield* wait(1.0);
}

// ── Render ────────────────────────────────────────────────────────────────

function render(): Uint8Array {
  const buf = background.slice();
  if (actor === 'egg') {
    const hatching = egg.hatchT >= 0;
    const shaking = egg.wobble || (hatching && egg.hatchT < 1.2);
    const pattern = [0, 1, 0, -1];
    const offset = shaking ? pattern[Math.floor(time * (hatching ? 20 : 10)) % 4] : 0;
    sprite(buf, hatching && egg.hatchT >= 0.6 ? EGG_CRACKED : EGG, egg.x + offset, egg.y);
  } else {
    const frames: Record<Pose, string[]> = {
      idle: Math.floor(time * 1.5) % 2 ? F.FROG_IDLE_1 : F.FROG_IDLE_0,
      blink: F.FROG_BLINK,
      crouch: F.FROG_CROUCH,
      jump: F.FROG_JUMP,
      eat: F.FROG_EAT,
    };
    sprite(buf, frames[frog.pose], frog.x, frog.y - frog.lift, frog.facing === -1);
    if (frog.tongue) {
      const m = mouth();
      const t = frog.tongue;
      const steps = Math.max(1, Math.round(Math.max(Math.abs(t.x - m.x), Math.abs(t.y - m.y))));
      for (let i = 0; i <= steps; i++) {
        rect(buf, '#e86a7f', Math.round(m.x + ((t.x - m.x) * i) / steps), Math.round(m.y + ((t.y - m.y) * i) / steps));
      }
      rect(buf, '#c94a64', Math.round(t.x) - 1, Math.round(t.y) - 1, 2, 2);
    }
    if (frog.bubble) sprite(buf, NOTICE_BUBBLE, frog.x + 5, frog.y - frog.lift - 9);
  }
  for (const b of bugs) {
    if (b.gone || b.t < 0) continue;
    sprite(buf, b.frames[Math.floor((b.t + b.phase) * 10) % 2], b.x, b.y);
  }
  for (const p of particles) rect(buf, p.color, Math.round(p.x), Math.round(p.y));
  return buf;
}

// ── GIF encoder (LZW, only the changed area of each frame) ────────────────

function lzw(indices: Uint8Array, minCodeSize: number): number[] {
  const out: number[] = [];
  let bits = 0;
  let bitCount = 0;
  const emit = (code: number, size: number) => {
    bits |= code << bitCount;
    bitCount += size;
    while (bitCount >= 8) {
      out.push(bits & 0xff);
      bits >>>= 8;
      bitCount -= 8;
    }
  };
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let next = eoi + 1;
  let table = new Map<number, number>();
  emit(clear, codeSize);
  let current = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (current << 8) | k;
    const found = table.get(key);
    if (found !== undefined) {
      current = found;
      continue;
    }
    emit(current, codeSize);
    if (next === 4096) {
      emit(clear, codeSize);
      table = new Map();
      next = eoi + 1;
      codeSize = minCodeSize + 1;
    } else {
      if (next >= 1 << codeSize) codeSize++;
      table.set(key, next++);
    }
    current = k;
  }
  emit(current, codeSize);
  emit(eoi, codeSize);
  if (bitCount > 0) out.push(bits & 0xff);
  return out;
}

const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];

interface GifFrame { x: number; y: number; w: number; h: number; pixels: Uint8Array; delay: number }

function encodeGif(frames: GifFrame[]): Buffer {
  const tableBits = Math.max(2, Math.ceil(Math.log2(Math.max(colors.length, 2))));
  const out: number[] = [...Buffer.from('GIF89a'), ...u16(W * SCALE), ...u16(H * SCALE), 0x80 | 0x70 | (tableBits - 1), 0, 0];
  for (let i = 0; i < 1 << tableBits; i++) {
    const c = colors[i] ?? '#000000';
    out.push(parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16));
  }
  out.push(0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0'), 0x03, 0x01, 0, 0, 0x00); // loop forever

  for (const f of frames) {
    out.push(0x21, 0xf9, 0x04, 0x04, ...u16(f.delay), 0, 0x00); // keep previous pixels
    out.push(0x2c, ...u16(f.x * SCALE), ...u16(f.y * SCALE), ...u16(f.w * SCALE), ...u16(f.h * SCALE), 0);
    const scaled = new Uint8Array(f.w * SCALE * f.h * SCALE);
    for (let y = 0; y < f.h * SCALE; y++) {
      for (let x = 0; x < f.w * SCALE; x++) {
        scaled[y * f.w * SCALE + x] = f.pixels[Math.floor(y / SCALE) * f.w + Math.floor(x / SCALE)];
      }
    }
    const data = lzw(scaled, tableBits);
    out.push(tableBits);
    for (let i = 0; i < data.length; i += 255) {
      const block = data.slice(i, i + 255);
      out.push(block.length, ...block);
    }
    out.push(0x00);
  }
  out.push(0x3b);
  return Buffer.from(out);
}

// ── Run ───────────────────────────────────────────────────────────────────

const frames: GifFrame[] = [];
let previous: Uint8Array | null = null;
for (const _ of script()) {
  updateBugs();
  updateParticles();
  const buf = render();
  time += DT;

  // Only store the rectangle that changed since the last frame.
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (previous && previous[y * W + x] === buf[y * W + x]) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) {
    frames[frames.length - 1].delay += DELAY_CS;
  } else {
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const pixels = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) pixels.set(buf.subarray((y0 + y) * W + x0, (y0 + y) * W + x0 + w), y * w);
    frames.push({ x: x0, y: y0, w, h, pixels, delay: DELAY_CS });
  }
  previous = buf;
}

mkdirSync('images', { recursive: true });
const gif = encodeGif(frames);
writeFileSync(OUT, gif);
console.log(`${OUT}: ${frames.length} frames, ${colors.length} colors, ${(gif.length / 1024).toFixed(0)} KB`);
