import { motion } from './motion';
import { isNewYearMinute } from './newYear';
import { hatAccessory, type Accessory } from './outfit';
import type { Particles } from './Particles';
import { FIREWORK_COLORS, newYearFireworks, newYearMessage, type SceneBox } from './pondThemes';
import { makeSprite, type Screen, type Sprite } from './renderer';
import { headAnchor } from './sprites/accessories';
import { FROG_CROUCH, FROG_IDLE_0, FROG_JUMP } from './sprites/frog';
import type { HatId } from '../shared/customization';

const PARTY_SECONDS = 60;
// Guests are full-size frogs, as many as fit along the bank, never fewer than 5.
const MIN_GUESTS = 5;
const GUEST_SPACING = 18; // a frog is 16 pixels wide, plus a little room
// The guests leave this much room around the user's frog, so it never blends into one.
const HOST_ROOM = 2 * GUEST_SPACING; // a full spacing on each side of it
const HOP_HEIGHT = 6;
const CONFETTI_EVERY = 1.5;
// The sky dims to night for the party, so fireworks show on daytime ponds too.
const NIGHT = '#0b1030';
const NIGHT_ALPHA = 0.5;
const DUSK_IN = 1.5;
const DAWN_OUT = 2;
// What the guests wear, in order: mostly party hats, plus a few others.
const GUEST_HATS: (HatId | null)[] = ['party-hat', 'santa', 'party-hat', 'crown', null, 'party-hat', 'wizard', 'cap'];

interface Pose {
  sprite: Sprite;
  head: { x: number; y: number };
}

const pose = (rows: string[]): Pose => ({ sprite: makeSprite(rows), head: headAnchor(rows) });

/**
 * The New Year party: for one minute from midnight on January 1st (local
 * time), ten guest frogs hop along the bank under fireworks and a
 * "happy new year" message, on whatever pond is showing. Free for everyone.
 */
export class NewYearParty {
  private startedAt: number | null = null;
  private poses?: { idle: Pose; crouch: Pose; jump: Pose };
  private hats?: (Accessory | null)[];
  private userHat: HatId | null = null;
  private sky?: {
    key: string;
    fireworks: (ctx: CanvasRenderingContext2D, time: number) => void;
    message: (ctx: CanvasRenderingContext2D, time: number) => void;
  };
  private lastConfetti = 0;

  constructor(private readonly particles: Particles) {}

  get active(): boolean {
    return this.startedAt !== null;
  }

  /** The guests leave the user's own hat to the user's frog, so it stands out. */
  setUserHat(hat: HatId | null): void {
    if (hat === this.userHat) return;
    this.userHat = hat;
    this.hats = undefined;
  }

  /** Starts the party right away, for testing. */
  startNow(time: number): void {
    this.begin(time);
  }

  private begin(startedAt: number): void {
    this.startedAt = startedAt;
    this.lastConfetti = 0;
  }

  /**
   * Checks the clock. Returns true on the frame the party starts, so the
   * frog can join in.
   */
  update(time: number, now = new Date()): boolean {
    if (this.startedAt !== null && time - this.startedAt > PARTY_SECONDS) this.startedAt = null;
    if (this.startedAt === null && isNewYearMinute(now)) {
      // Opened partway through the minute? Join the party where it is.
      this.begin(time - now.getSeconds());
      return true;
    }
    return false;
  }

  /**
   * Fireworks and guests, drawn over the pond and behind the user's own frog.
   * `hostX` is the center of the user's frog; the guests make room around it.
   */
  draw(screen: Screen, scene: SceneBox, time: number, hostX: number): void {
    if (this.startedAt === null) return;
    const t = time - this.startedAt;
    this.drawNight(screen.ctx, scene, t);
    const sky = this.skyFor(scene);
    // Reduced motion keeps the words but skips the fireworks.
    if (!motion.reduced) sky.fireworks(screen.ctx, t);
    sky.message(screen.ctx, t);
    this.drawGuests(screen, scene, t, hostX);

    if (!motion.reduced && t - this.lastConfetti >= CONFETTI_EVERY) {
      this.lastConfetti = t;
      const x = Math.round(((Math.floor(t) * 37) % 100) / 100 * scene.width);
      this.particles.burst(x, scene.groundY - 6, 10, FIREWORK_COLORS, 30);
    }
  }

  private skyFor(scene: SceneBox): NonNullable<NewYearParty['sky']> {
    const key = [scene.width, scene.height, scene.hud?.right, scene.hud?.bottom].join();
    if (this.sky?.key !== key) {
      this.sky = { key, fireworks: newYearFireworks(scene, Math.random), message: newYearMessage(scene, Math.random) };
    }
    return this.sky;
  }

  /** Dims the whole pond to night, fading in at the start and out at the end. */
  private drawNight(ctx: CanvasRenderingContext2D, { width, height }: SceneBox, t: number): void {
    const fade = Math.min(1, t / DUSK_IN, Math.max(0, (PARTY_SECONDS - t) / DAWN_OUT));
    ctx.globalAlpha = NIGHT_ALPHA * fade;
    ctx.fillStyle = NIGHT;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  /**
   * A row of guests along the bank, each hopping to its own beat. They spread
   * evenly over the bank minus a gap around the user's frog, so when the frog
   * moves they shuffle over to make room instead of standing on it.
   */
  private drawGuests(screen: Screen, { width, groundY }: SceneBox, t: number, hostX: number): void {
    this.poses ??= { idle: pose(FROG_IDLE_0), crouch: pose(FROG_CROUCH), jump: pose(FROG_JUMP) };
    this.hats ??= GUEST_HATS.filter((id) => !id || id !== this.userHat).map((id) =>
      id ? hatAccessory(id) : null,
    );
    const room = Math.max(0, width - HOST_ROOM);
    const count = Math.max(MIN_GUESTS, Math.floor(room / GUEST_SPACING));
    const gapStart = Math.min(room, Math.max(0, hostX - HOST_ROOM / 2));
    for (let i = 0; i < count; i++) {
      const along = ((i + 0.5) / count) * room;
      const x = Math.round(along < gapStart ? along : along + HOST_ROOM) - 8;
      const feet = groundY - 1;
      const period = 0.9 + (i % 4) * 0.15;
      const cycle = t / period + i * 0.37;
      const phase = cycle % 1;
      const facing = Math.floor(cycle / 2) % 2 === i % 2 ? 1 : -1;

      let lift = 0;
      let current = this.poses.idle;
      if (!motion.reduced) {
        if (phase < 0.12 || (phase > 0.72 && phase < 0.82)) current = this.poses.crouch;
        else if (phase < 0.72) {
          const u = (phase - 0.12) / 0.6;
          lift = HOP_HEIGHT * 4 * u * (1 - u);
          current = this.poses.jump;
        }
      }
      const top = feet - current.sprite.h + 1 - lift;
      screen.drawSprite(current.sprite, x, top, facing === -1);
      const hat = this.hats[i % this.hats.length];
      if (hat) this.drawHat(screen, hat, current, x, top, facing);
    }
  }

  private drawHat(screen: Screen, hat: Accessory, current: Pose, x: number, top: number, facing: number): void {
    const left = current.head.x + hat.dx;
    const hx = facing === 1 ? x + left : x + current.sprite.w - left - hat.sprite.w;
    screen.drawSprite(hat.sprite, hx, top + current.head.y + hat.dy, facing === -1);
  }
}
