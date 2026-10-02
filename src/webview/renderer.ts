import { PALETTE } from './sprites/palette';

export interface Sprite {
  image: HTMLCanvasElement;
  w: number;
  h: number;
}

/** Turns a palette-coded grid ('.' = transparent) into a small offscreen canvas. */
export function makeSprite(rows: string[]): Sprite {
  const h = rows.length;
  const w = rows[0].length;
  const image = document.createElement('canvas');
  image.width = w;
  image.height = h;
  const g = image.getContext('2d')!;

  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const code = row[x];
      if (code === '.' || code === undefined) continue;
      const color = PALETTE[code];
      if (!color) throw new Error(`Unknown palette code "${code}"`);
      g.fillStyle = color;
      g.fillRect(x, y, 1, 1);
    }
  });

  return { image, w, h };
}

/**
 * Owns the visible canvas. Everything is drawn in "logical pixels" which are
 * scaled up by a whole number so the pixel art stays crisp at any panel size.
 */
export class Screen {
  readonly ctx: CanvasRenderingContext2D;
  scale = 1;
  width = 0; // logical pixels
  height = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** Matches the canvas to its CSS size. Returns true if the logical size changed. */
  resize(): boolean {
    const dpr = window.devicePixelRatio || 1;
    const deviceW = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const deviceH = Math.max(1, Math.round(this.canvas.clientHeight * dpr));

    let scale = Math.min(10, Math.max(2, Math.floor(deviceH / 56)));
    while (scale > 2 && deviceW / scale < 96) scale--;

    const width = Math.ceil(deviceW / scale);
    const height = Math.ceil(deviceH / scale);
    const changed = width !== this.width || height !== this.height || scale !== this.scale;

    this.canvas.width = deviceW;
    this.canvas.height = deviceH;
    this.scale = scale;
    this.width = width;
    this.height = height;
    return changed;
  }

  /** Call once per frame before drawing. */
  begin(): void {
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  drawSprite(sprite: Sprite, x: number, y: number, flip = false): void {
    const px = Math.round(x);
    const py = Math.round(y);
    if (!flip) {
      this.ctx.drawImage(sprite.image, px, py);
      return;
    }
    this.ctx.save();
    this.ctx.translate(px + sprite.w, py);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(sprite.image, 0, 0);
    this.ctx.restore();
  }
}
