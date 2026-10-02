import type { Particles } from './Particles';
import { makeSprite, type Screen } from './renderer';
import { EGG, EGG_CRACKED } from './sprites/egg';

const WOBBLE_PATTERN = [0, 1, 0, -1];
const WOBBLE_FPS = 10;
const WOBBLE_TIME = 0.6;
const HATCH_SHAKE_TIME = 1.2;
const HATCH_CRACK_TIME = 0.6;
const SHELL_COLORS = ['#f3ecd2', '#d8cba3', '#8fcf6a'];

/** The first stage: an egg that wobbles now and then, and hatches on level-up. */
export class Egg {
  x = 0;
  y = 0;
  readonly width = 10;
  readonly height = 12;

  private readonly whole = makeSprite(EGG);
  private readonly cracked = makeSprite(EGG_CRACKED);
  private wobbleLeft = 0;
  private nextWobbleIn = 3;
  private hatchTime = -1; // -1 = not hatching
  private onHatched?: () => void;

  constructor(private readonly particles: Particles) {}

  get centerX(): number {
    return this.x + this.width / 2;
  }

  placeOnGround(groundY: number, sceneWidth: number): void {
    this.y = groundY - this.height + 1;
    this.x = Math.floor((sceneWidth - this.width) / 2);
  }

  /** A little excited shake, e.g. when the developer fixes something. */
  wobble(): void {
    this.wobbleLeft = WOBBLE_TIME;
  }

  hatch(onHatched: () => void): void {
    this.hatchTime = 0;
    this.onHatched = onHatched;
  }

  update(dt: number): void {
    if (this.hatchTime >= 0) {
      this.hatchTime += dt;
      if (this.hatchTime >= HATCH_SHAKE_TIME + HATCH_CRACK_TIME) {
        this.particles.burst(this.centerX, this.y + 4, 16, SHELL_COLORS, 30);
        this.hatchTime = -1;
        this.onHatched?.();
      }
      return;
    }

    this.wobbleLeft = Math.max(0, this.wobbleLeft - dt);
    this.nextWobbleIn -= dt;
    if (this.nextWobbleIn <= 0) {
      this.wobble();
      this.nextWobbleIn = 4 + Math.random() * 5;
    }
  }

  draw(screen: Screen, time: number): void {
    const hatching = this.hatchTime >= 0;
    const shaking = this.wobbleLeft > 0 || (hatching && this.hatchTime < HATCH_SHAKE_TIME);
    const fps = hatching ? WOBBLE_FPS * 2 : WOBBLE_FPS;
    const offset = shaking ? WOBBLE_PATTERN[Math.floor(time * fps) % WOBBLE_PATTERN.length] : 0;
    const sprite = hatching && this.hatchTime >= HATCH_SHAKE_TIME * 0.5 ? this.cracked : this.whole;
    screen.drawSprite(sprite, this.x + offset, this.y);
  }
}
