// Renders the README's two GIFs: scripted scenes drawn with the real sprites and
// the real pond code.
//   images/demo.gif       the basics: the egg hatches, the frog eats bugs, celebrates
//   images/customize.gif  outfits, pond themes and decorations, and whispers
// Run with: npm run demo-gif

import './canvasShim'; // must come first: lets the pond code draw in Node
import { mkdirSync, writeFileSync } from 'fs';
import type { DecorationId, PondId } from '../src/shared/customization';
import { Pond } from '../src/webview/Pond';
import { FACE_ART, HAT_ART, headAnchor, type AccessoryArt } from '../src/webview/sprites/accessories';
import { BEETLE_0, BEETLE_1, GNAT_0, GNAT_1 } from '../src/webview/sprites/bug';
import { EGG, EGG_CRACKED } from '../src/webview/sprites/egg';
import * as F from '../src/webview/sprites/frog';
import { NOTICE_BUBBLE } from '../src/webview/sprites/fx';
import { PALETTE } from '../src/webview/sprites/palette';
import { WHISPER_TAIL, WHISPER_TAIL_NIGHT } from '../src/webview/sprites/ui';
import type { PixelCanvas } from './canvasShim';

const W = 128;
const H = 64;
const SCALE = 3;
const DT = 0.08; // seconds per frame (12.5 fps)
const DELAY_CS = 8; // the same, in GIF centiseconds

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
// ── Pond (the real one, drawn through the canvas stand-in) ────────────────

function makePond(theme: PondId, decorations: DecorationId[]): Pond {
  const pond = new Pond();
  pond.setLook(theme, decorations);
  pond.build(W, H);
  return pond;
}

function pondPixels(pond: Pond, t: number): Uint8Array {
  const canvas = document.createElement('canvas') as unknown as PixelCanvas;
  canvas.width = W;
  canvas.height = H;
  pond.draw(canvas.getContext() as unknown as CanvasRenderingContext2D, t);
  const buf = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) buf[y * W + x] = idx(canvas.get(x, y) ?? '#000000');
  return buf;
}

let pond = makePond('classic', []);
let nextPond: Pond | null = null;
let wipe = 0; // 0..1 while sliding to nextPond
let night = false;
const groundY = pond.groundY;

// ── Whisper bubble, with a tiny pixel font ────────────────────────────────
// The real bubble uses VS Code's font, which can't be drawn at this pixel size,
// so the demo spells its messages with this font. Row 0 is for ascenders,
// rows 1-4 are the body of the letter, row 5 is for descenders.

const GLYPHS: Record<string, string[]> = {
  ' ': ['..', '..', '..', '..', '..', '..'],
  '!': ['x', 'x', 'x', '.', 'x', '.'],
  '♡': ['.....', '.x.x.', 'x.x.x', 'x...x', '.x.x.', '..x..'],
  b: ['x..', 'x..', 'xx.', 'x.x', 'xx.', '...'],
  c: ['...', '.xx', 'x..', 'x..', '.xx', '...'],
  e: ['...', '.x.', 'xxx', 'x..', '.xx', '...'],
  g: ['...', '.xx', 'x.x', '.xx', '..x', 'xx.'],
  h: ['x..', 'x..', 'xx.', 'x.x', 'x.x', '...'],
  i: ['x', '.', 'x', 'x', 'x', '.'],
  k: ['x..', 'x..', 'x.x', 'xx.', 'x.x', '...'],
  n: ['...', 'xx.', 'x.x', 'x.x', 'x.x', '...'],
  o: ['...', '.x.', 'x.x', 'x.x', '.x.', '...'],
  r: ['...', 'x.x', 'xx.', 'x..', 'x..', '...'],
  s: ['...', '.xx', 'x..', '..x', 'xx.', '...'],
  t: ['.x.', 'xxx', '.x.', '.x.', '..x', '...'],
  u: ['...', 'x.x', 'x.x', 'x.x', '.xx', '...'],
  w: ['.....', 'x...x', 'x...x', 'x.x.x', '.x.x.', '.....'],
  y: ['...', 'x.x', 'x.x', '.xx', '..x', 'xx.'],
};

const textWidth = (text: string) =>
  [...text].reduce((w, ch) => w + GLYPHS[ch][0].length, 0) + text.length - 1;

let whisper: { text: string } | null = null;

function drawWhisper(buf: Uint8Array, centerX: number, topY: number): void {
  if (!whisper) return;
  const fill = night ? '#26315f' : '#fffaf0';
  const line = night ? '#c9d3f5' : '#1f3a24';
  const ink = night ? '#f1f5ff' : '#1f3a24';
  const w = textWidth(whisper.text) + 6;
  const h = 9;
  const tipY = Math.round(topY) - 2;
  const top = Math.max(1, tipY - 2 - h - 1);
  const left = Math.min(W - w - 2, Math.max(1, Math.round(centerX - w / 2)));
  // Box with notched corners: the outline skips the four corner pixels.
  rect(buf, fill, left, top, w, h);
  rect(buf, line, left, top - 1, w, 1);
  rect(buf, line, left, top + h, w, 1);
  rect(buf, line, left - 1, top, 1, h);
  rect(buf, line, left + w, top, 1, h);
  let x = left + 3;
  for (const ch of whisper.text) {
    GLYPHS[ch].forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) if (row[rx] === 'x') rect(buf, ink, x + rx, top + 2 + ry);
    });
    x += GLYPHS[ch][0].length + 1;
  }
  const tailX = Math.min(left + w - 6, Math.max(left + 1, Math.round(centerX) - 2));
  sprite(buf, night ? WHISPER_TAIL_NIGHT : WHISPER_TAIL, tailX, top + h);
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
  hat: null as AccessoryArt | null,
  face: null as AccessoryArt | null,
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

function makeBug(frames: string[][], homeX: number, homeY: number, fromLeft = false, delay = 0): Bug {
  const fromX = fromLeft ? -8 : W + 2;
  return {
    frames, w: frames[0][0].length, h: frames[0].length,
    x: fromX, y: homeY, homeX, homeY, fromX, fromY: homeY - 6,
    t: -delay, phase: Math.random() * 6, caught: false, gone: false,
  };
}

function spawn(frames: string[][], homeX: number, homeY: number, fromLeft: boolean, delay: number): void {
  bugs.push(makeBug(frames, homeX, homeY, fromLeft, delay));
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

/** A sparkle around the head, and the frog is wearing something new. */
function* poof(hat: AccessoryArt | null, face: AccessoryArt | null) {
  burst(frog.x + 8, frog.y - 2, 14, ['#ffffff', '#fff3b0', '#f5c542'], 25);
  yield* wait(0.08);
  frog.hat = hat;
  frog.face = face;
  yield* happy();
}

/** Slides the next pond in from the left. */
function* wipeTo(theme: PondId, decorations: DecorationId[]) {
  nextPond = makePond(theme, decorations);
  yield* during(0.9, (p) => (wipe = p));
  pond = nextPond;
  nextPond = null;
  wipe = 0;
  night = theme === 'moonlight';
}

function* say(text: string, seconds: number) {
  whisper = { text };
  yield* wait(seconds);
  whisper = null;
}

/** The basics: hatch, a swarm of bugs, a clean workspace. */
function* basics() {
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

/** New in 0.2: outfits, ponds and decorations, and whispers. */
function* customize() {
  actor = 'frog';
  frog.x = clampX(Math.floor((W - 16) / 2));
  yield* wait(0.6);
  yield* blink();
  yield* wait(0.3);


  // Trying on outfits.
  yield* poof(HAT_ART.wizard, FACE_ART['round-glasses']);
  yield* wait(0.3);
  yield* poof(HAT_ART.crown, FACE_ART.sunglasses);
  yield* wait(0.3);

  // Moonlight, with a lantern and a lily: a short hop and a whisper.
  yield* wipeTo('moonlight', ['lantern', 'lily-flower']);
  // The bubble stays up while the frog hops, following it.
  whisper = { text: 'you got this ♡' };
  yield* wait(0.6);
  yield* hopTo(frog.x - 10);
  yield* wait(1.0);
  whisper = null;

  // Sakura: one more bug close by, and a little cheer after.
  yield* wipeTo('sakura', ['flowers', 'rocks']);
  const bug = bugs[bugs.push(makeBug([BEETLE_0, BEETLE_1], clampX(frog.x + 22), groundY - 20)) - 1];
  yield* wait(1.2);
  yield* notice();
  yield* approach(bug);
  yield* eat(bug);
  yield* happy();
  yield* say('ribbit! nice work', 1.8);

  // Autumn, with mushrooms, in a different outfit.
  yield* wipeTo('autumn', ['mushrooms', 'flowers']);
  yield* poof(HAT_ART.cap, FACE_ART['round-glasses']);
  yield* blink();
  yield* wait(1.0);
}

// ── Render ────────────────────────────────────────────────────────────────

/** Pins an accessory to the head of the current frame, mirrored with the frog. */
function drawAccessory(buf: Uint8Array, art: AccessoryArt, frame: string[]): void {
  const head = headAnchor(frame);
  const left = head.x + art.dx;
  const flip = frog.facing === -1;
  const x = flip ? frog.x + 16 - left - art.rows[0].length : frog.x + left;
  sprite(buf, art.rows, x, frog.y - frog.lift + head.y + art.dy, flip);
}

function render(): Uint8Array {
  const buf = pondPixels(pond, time);
  if (nextPond) {
    // Wipe: the next pond slides in from the left behind a moving edge.
    const next = pondPixels(nextPond, time);
    const edge = Math.round(wipe * W);
    for (let y = 0; y < H; y++) buf.set(next.subarray(y * W, y * W + edge), y * W);
    rect(buf, '#fffaf0', edge, 0, 1, H);
  }
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
    const frame = frames[frog.pose];
    sprite(buf, frame, frog.x, frog.y - frog.lift, frog.facing === -1);
    if (frog.face) drawAccessory(buf, frog.face, frame);
    if (frog.hat) drawAccessory(buf, frog.hat, frame);
    if (frog.tongue) {
      const m = mouth();
      const t = frog.tongue;
      const steps = Math.max(1, Math.round(Math.max(Math.abs(t.x - m.x), Math.abs(t.y - m.y))));
      for (let i = 0; i <= steps; i++) {
        rect(buf, '#e86a7f', Math.round(m.x + ((t.x - m.x) * i) / steps), Math.round(m.y + ((t.y - m.y) * i) / steps));
      }
      rect(buf, '#c94a64', Math.round(t.x) - 1, Math.round(t.y) - 1, 2, 2);
    }
    const head = headAnchor(frame);
    const hatTop = frog.hat ? frog.hat.dy : 0;
    const topY = frog.y - frog.lift + head.y + Math.min(0, hatTop);
    if (frog.bubble) sprite(buf, NOTICE_BUBBLE, frog.x + 5, topY - 9);
    drawWhisper(buf, frog.x + 8, topY);
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

/** Puts everything back to the opening scene: an egg on the Classic pond. */
function reset(): void {
  Object.assign(frog, {
    x: 0, lift: 0, facing: 1, pose: 'idle', bubble: false, tongue: null, hat: null, face: null,
  });
  Object.assign(egg, { wobble: false, hatchT: -1 });
  actor = 'egg';
  time = 0;
  bugs.length = 0;
  particles.length = 0;
  pond = makePond('classic', []);
  nextPond = null;
  wipe = 0;
  night = false;
  whisper = null;
}

function renderGif(story: () => Generator, out: string): void {
  reset();
  const frames: GifFrame[] = [];
  let previous: Uint8Array | null = null;
  for (const _ of story()) {
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

  if (colors.length > 256) throw new Error(`GIFs hold 256 colors; this one needs ${colors.length}`);
  mkdirSync('images', { recursive: true });
  const gif = encodeGif(frames);
  writeFileSync(out, gif);
  const seconds = (frames.reduce((sum, f) => sum + f.delay, 0) / 100).toFixed(1);
  console.log(`${out}: ${frames.length} frames, ${seconds} s, ${(gif.length / 1024).toFixed(0)} KB`);
}

renderGif(basics, 'images/demo.gif');
renderGif(customize, 'images/customize.gif');
