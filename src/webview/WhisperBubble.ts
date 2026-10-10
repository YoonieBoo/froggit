import { makeSprite } from './renderer';
import { WHISPER_TAIL, WHISPER_TAIL_NIGHT } from './sprites/ui';

const SHOW_SECONDS = 5;
const UI_PX = 2; // CSS pixels per art pixel, as in the wardrobe
const TAIL_W = 5 * UI_PX;
const TAIL_H = 3 * UI_PX;
const GAP = 2; // between the tail's tip and the frog (or its hat)
const MARGIN = 4; // keep this far from the pond's edges

/**
 * The speech bubble for Froggit Whispers. Plain HTML over the canvas, like the
 * "+XP" text, so the words stay sharp; it's moved every frame to stay above
 * the frog's head.
 */
export class WhisperBubble {
  private readonly el = document.getElementById('whisper')!;
  private readonly text = document.createElement('span');
  private readonly tail = document.createElement('span');
  private remaining = 0;
  private size = { w: 0, h: 0 };

  constructor() {
    this.tail.className = 'whisper-tail';
    this.tail.style.width = `${TAIL_W}px`;
    this.tail.style.height = `${TAIL_H}px`;
    const day = makeSprite(WHISPER_TAIL).image.toDataURL();
    const night = makeSprite(WHISPER_TAIL_NIGHT).image.toDataURL();
    this.tail.style.setProperty('--tail-day', `url("${day}")`);
    this.tail.style.setProperty('--tail-night', `url("${night}")`);
    this.el.style.animationDuration = `${SHOW_SECONDS}s`;
    this.el.append(this.text, this.tail);
    this.el.addEventListener('animationend', () => this.hide());
  }

  get showing(): boolean {
    return this.remaining > 0;
  }

  show(message: string): void {
    this.text.textContent = message;
    this.el.hidden = false;
    // Restart the pop-in animation.
    this.el.classList.remove('speaking');
    void this.el.offsetWidth;
    this.el.classList.add('speaking');
    this.size = { w: this.el.offsetWidth, h: this.el.offsetHeight };
    this.remaining = SHOW_SECONDS;
  }

  hide(): void {
    this.remaining = 0;
    this.el.hidden = true;
    this.el.classList.remove('speaking');
  }

  update(dt: number): void {
    if (!this.showing) return;
    this.remaining -= dt;
    if (this.remaining <= 0) this.hide();
  }

  /** Points the tail at (x, y): the top-center of the frog, in CSS pixels. */
  place(x: number, y: number): void {
    const { w, h } = this.size;
    const maxLeft = Math.max(MARGIN, window.innerWidth - w - MARGIN);
    const left = Math.round(Math.min(maxLeft, Math.max(MARGIN, x - w / 2)));
    const top = Math.round(Math.max(MARGIN, y - GAP - TAIL_H - h));
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
    // The tail slides along the bottom to keep pointing at the frog when the
    // bubble is pushed in from an edge, but stays clear of the corners.
    const tailLeft = Math.min(w - TAIL_W - UI_PX * 2, Math.max(UI_PX * 2, x - left - TAIL_W / 2));
    this.tail.style.left = `${Math.round(tailLeft)}px`;
  }
}
