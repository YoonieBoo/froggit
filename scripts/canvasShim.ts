// A tiny stand-in for the browser's <canvas>, so scripts can run the real pond
// code (src/webview/Pond.ts) in Node. It only does what the pond uses:
// fillRect, drawImage and globalAlpha. Import it before anything from src/webview.

type Pixel = string | null;

/** Blends `top` over `bottom` (both #rrggbb). */
function blend(top: string, bottom: string, alpha: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  let out = '#';
  for (let i = 0; i < 3; i++) {
    const v = Math.round(channel(top, i) * alpha + channel(bottom, i) * (1 - alpha));
    out += v.toString(16).padStart(2, '0');
  }
  return out;
}

class PixelContext {
  fillStyle = '#000000';
  globalAlpha = 1;
  imageSmoothingEnabled = false;

  constructor(private readonly canvas: PixelCanvas) {}

  fillRect(x: number, y: number, w: number, h: number): void {
    // GIFs hold 256 colors, so translucent fills are rounded to quarter steps
    // to keep the number of blended colors small.
    const alpha = Math.round(this.globalAlpha * 4) / 4;
    if (alpha <= 0) return;
    for (let j = Math.round(y); j < Math.round(y + h); j++) {
      for (let i = Math.round(x); i < Math.round(x + w); i++) {
        const below = this.canvas.get(i, j);
        const color = alpha >= 1 || !below ? this.fillStyle : blend(this.fillStyle, below, alpha);
        this.canvas.set(i, j, color);
      }
    }
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.canvas.set(i, j, null);
  }

  drawImage(image: PixelCanvas, x: number, y: number): void {
    for (let j = 0; j < image.height; j++) {
      for (let i = 0; i < image.width; i++) {
        const color = image.get(i, j);
        if (color) this.canvas.set(Math.round(x) + i, Math.round(y) + j, color);
      }
    }
  }

  setTransform(): void {}
}

export class PixelCanvas {
  private w = 0;
  private h = 0;
  private pixels: Pixel[] = [];
  private readonly context = new PixelContext(this);

  get width(): number {
    return this.w;
  }
  set width(value: number) {
    this.w = value;
    this.pixels = new Array(this.w * this.h).fill(null);
  }
  get height(): number {
    return this.h;
  }
  set height(value: number) {
    this.h = value;
    this.pixels = new Array(this.w * this.h).fill(null);
  }

  getContext(): PixelContext {
    return this.context;
  }

  get(x: number, y: number): Pixel {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.pixels[y * this.w + x];
  }

  set(x: number, y: number, color: Pixel): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.pixels[y * this.w + x] = color;
  }
}

const globals = globalThis as Record<string, unknown>;
globals.document = { createElement: () => new PixelCanvas() };
globals.window = { matchMedia: () => ({ matches: false }) };
