import { AnimationPlayer, type Animation } from './animation';
import type { Prey } from './Bugs';
import { CONFETTI, type Particles } from './Particles';
import { makeSprite, type Screen } from './renderer';
import {
  FROG_BLINK,
  FROG_CROUCH,
  FROG_EAT,
  FROG_IDLE_0,
  FROG_IDLE_1,
  FROG_JUMP,
} from './sprites/frog';
import { NOTICE_BUBBLE } from './sprites/fx';

type FrogState =
  | 'idle'
  | 'blink'
  | 'crouch'
  | 'jump'
  | 'land'
  | 'notice'
  | 'eat'
  | 'happy'
  | 'celebrate';

function createAnimations(): Record<FrogState, Animation> {
  const idle0 = makeSprite(FROG_IDLE_0);
  const blink = makeSprite(FROG_BLINK);
  const crouch = makeSprite(FROG_CROUCH);
  return {
    idle: { frames: [idle0, makeSprite(FROG_IDLE_1)], fps: 1.5, loop: true },
    blink: { frames: [blink], fps: 7, loop: false },
    crouch: { frames: [crouch], fps: 8, loop: false },
    jump: { frames: [makeSprite(FROG_JUMP)], fps: 1, loop: true },
    land: { frames: [crouch], fps: 10, loop: false },
    notice: { frames: [idle0], fps: 1, loop: true },
    eat: { frames: [makeSprite(FROG_EAT)], fps: 1, loop: true },
    happy: { frames: [blink], fps: 1, loop: true },
    celebrate: { frames: [crouch], fps: 1, loop: true },
  };
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

// Movement tuning, in logical pixels and seconds.
const HOP_DISTANCE = 10;
const HOP_HEIGHT = 5;
const HOP_DURATION = 0.4;
const EDGE_MARGIN = 2;

// Eating.
const MOUTH = { x: 13, y: 9 }; // mouth position in the right-facing sprite
const TONGUE_GAP = 6; // horizontal distance from mouth to bug when it strikes
const TONGUE_OUT = 0.12;
const TONGUE_HOLD = 0.06;
const TONGUE_IN = 0.16;
const TONGUE_COLOR = '#e86a7f';
const TONGUE_TIP = '#c94a64';
const CRUMBS = ['#ffffff', '#f7f7ea'];

// Reactions.
const NOTICE_TIME = 0.45;
const HAPPY_TIME = 0.5;
const HAPPY_HEIGHT = 3;
const CELEBRATE_BOUNCES = 3;
const BOUNCE_TIME = 0.45;
const BOUNCE_HEIGHT = 7;

/**
 * The frog's state machine. Each state decides when to hand over to the next one.
 *
 * Priority when the frog is free: eat queued bugs → celebrate → ambient behavior.
 */
export class Frog {
  x = 0;
  y = 0;
  facing: 1 | -1 = 1;

  readonly width = 16;
  readonly height = 14;

  private state: FrogState = 'idle';
  private stateTime = 0;
  private readonly anims = createAnimations();
  private readonly bubble = makeSprite(NOTICE_BUBBLE);
  private readonly player = new AnimationPlayer();
  private sceneWidth = 0;

  private nextBlinkIn = randomBetween(2, 5);
  private nextActionIn = randomBetween(2, 4);

  // Hop in progress.
  private targetX: number | null = null;
  private hopFromX = 0;
  private hopToX = 0;
  private lift = 0; // pixels above the ground

  // Hunting.
  private meals: Prey[] = [];
  private prey: Prey | null = null;
  private tongue = 0; // 0 = in the mouth, 1 = fully out
  private tongueTarget = { x: 0, y: 0 };
  private celebratePending = false;
  private lastBounce = -1;

  /** @param onSwallow Called when a bug has been eaten, so the swarm can drop it. */
  constructor(
    private readonly particles: Particles,
    private readonly onSwallow: (prey: Prey) => void,
  ) {
    this.player.play(this.anims.idle);
  }

  get centerX(): number {
    return this.x + this.width / 2;
  }

  /** Puts the frog on the ground line, keeping it inside the scene. */
  placeOnGround(groundY: number, sceneWidth: number): void {
    this.sceneWidth = sceneWidth;
    this.y = groundY - this.height + 1;
    const first = this.x === 0;
    this.x = first ? Math.floor((sceneWidth - this.width) / 2) : this.clampX(this.x);
    if (this.targetX !== null) this.targetX = this.clampX(this.targetX);
  }

  /** Bugs to hunt down, in order. */
  addMeals(prey: Prey[]): void {
    this.meals.push(...prey);
  }

  /** Celebrate once the current meals are finished. */
  queueCelebration(): void {
    this.celebratePending = true;
  }

  /** A quick "!" when new problems appear. Ignored if the frog is busy. */
  noticeSomething(): void {
    if (this.state === 'idle' || this.state === 'blink') this.enter('notice');
  }

  update(dt: number): void {
    this.player.update(dt);
    this.stateTime += dt;

    switch (this.state) {
      case 'idle':
        if (this.startNextTask()) break;
        this.nextBlinkIn -= dt;
        this.nextActionIn -= dt;
        if (this.nextActionIn <= 0) this.pickAmbientAction();
        else if (this.nextBlinkIn <= 0) this.enter('blink');
        break;

      case 'blink':
        if (this.startNextTask()) break;
        if (this.player.done) {
          this.nextBlinkIn = randomBetween(2, 6);
          this.enter('idle');
        }
        break;

      case 'crouch':
        if (this.player.done) {
          const remaining = this.targetX! - this.x;
          this.hopFromX = this.x;
          this.hopToX = this.x + Math.sign(remaining) * Math.min(HOP_DISTANCE, Math.abs(remaining));
          this.enter('jump');
        }
        break;

      case 'jump': {
        const t = Math.min(1, this.stateTime / HOP_DURATION);
        this.x = this.hopFromX + (this.hopToX - this.hopFromX) * t;
        this.lift = HOP_HEIGHT * 4 * t * (1 - t); // simple parabola
        if (t >= 1) {
          this.lift = 0;
          this.enter('land');
        }
        break;
      }

      case 'land':
        if (!this.player.done) break;
        // A wander gets cut short if there's food or a party waiting.
        if (!this.prey && this.startNextTask()) {
          this.targetX = null;
          break;
        }
        if (this.targetX !== null && Math.abs(this.targetX - this.x) >= 1) {
          this.enter('crouch');
          break;
        }
        this.targetX = null;
        if (this.prey) this.beginEating();
        else this.enter('idle');
        break;

      case 'notice':
        if (this.stateTime < NOTICE_TIME) break;
        if (this.prey) this.approachPrey();
        else this.enter('idle');
        break;

      case 'eat':
        this.updateEating();
        break;

      case 'happy': {
        const t = Math.min(1, this.stateTime / HAPPY_TIME);
        this.lift = HAPPY_HEIGHT * Math.sin(Math.PI * t);
        if (t >= 1) {
          this.lift = 0;
          if (!this.startNextTask(true)) this.enter('idle');
        }
        break;
      }

      case 'celebrate':
        this.updateCelebration();
        break;
    }
  }

  draw(screen: Screen): void {
    screen.drawSprite(this.player.frame, this.x, this.y - this.lift, this.facing === -1);

    if (this.state === 'eat' && this.tongue > 0) this.drawTongue(screen);
    if (this.state === 'notice') {
      screen.drawSprite(this.bubble, this.x + this.width / 2 - 3, this.y - this.lift - 9);
    }
  }

  // ── Tasks ────────────────────────────────────────────────────────────────

  /** Starts the next meal or a queued celebration. Returns true if it started something. */
  private startNextTask(skipNotice = false): boolean {
    const next = this.meals.shift();
    if (next) {
      this.prey = next;
      if (skipNotice) this.approachPrey();
      else this.enter('notice');
      return true;
    }
    if (this.celebratePending) {
      this.celebratePending = false;
      this.enter('celebrate');
      return true;
    }
    return false;
  }

  /** Hops to a spot where the bug is just within tongue reach. */
  private approachPrey(): void {
    const prey = this.prey!;
    const bugX = prey.x + prey.w / 2;
    const options = [
      bugX - MOUTH.x - TONGUE_GAP, // stand left of it, facing right
      bugX + TONGUE_GAP - (this.width - 1 - MOUTH.x), // stand right of it, facing left
    ];
    // Prefer spots that fit in the scene, then whichever is closer.
    const best = options
      .map((spot) => ({ spot: this.clampX(spot), fits: this.clampX(spot) === spot }))
      .sort((a, b) => Number(b.fits) - Number(a.fits) || Math.abs(a.spot - this.x) - Math.abs(b.spot - this.x))[0];

    if (Math.abs(best.spot - this.x) < 1) this.beginEating();
    else this.hopTo(best.spot);
  }

  private beginEating(): void {
    const prey = this.prey!;
    this.facing = prey.x + prey.w / 2 >= this.centerX ? 1 : -1;
    this.tongue = 0;
    this.enter('eat');
  }

  private updateEating(): void {
    const prey = this.prey!;
    const t = this.stateTime;

    if (!prey.caught) {
      // Aim at wherever the bug is right now.
      this.tongueTarget = { x: prey.x + prey.w / 2, y: prey.y + prey.h / 2 };
    }

    if (t < TONGUE_OUT) {
      this.tongue = t / TONGUE_OUT;
    } else if (t < TONGUE_OUT + TONGUE_HOLD) {
      this.tongue = 1;
      prey.caught = true;
    } else if (t < TONGUE_OUT + TONGUE_HOLD + TONGUE_IN) {
      this.tongue = 1 - (t - TONGUE_OUT - TONGUE_HOLD) / TONGUE_IN;
    } else {
      this.tongue = 0;
      const mouth = this.mouth();
      this.particles.burst(mouth.x, mouth.y, 4, CRUMBS, 15);
      this.onSwallow(prey);
      this.prey = null;
      this.enter('happy');
      return;
    }

    if (prey.caught) {
      // The bug rides the tip of the tongue back to the mouth.
      const tip = this.tongueTip();
      prey.x = tip.x - prey.w / 2;
      prey.y = tip.y - prey.h / 2;
    }
  }

  private updateCelebration(): void {
    const bounce = Math.floor(this.stateTime / BOUNCE_TIME);
    if (bounce >= CELEBRATE_BOUNCES) {
      this.lift = 0;
      if (!this.startNextTask()) this.enter('idle');
      return;
    }
    if (bounce !== this.lastBounce) {
      this.lastBounce = bounce;
      if (bounce > 0) this.facing = this.facing === 1 ? -1 : 1;
      this.particles.burst(this.centerX, this.y, 12, CONFETTI, 35);
    }
    const local = (this.stateTime % BOUNCE_TIME) / BOUNCE_TIME;
    this.lift = BOUNCE_HEIGHT * 4 * local * (1 - local);
    this.player.play(this.lift > 1 ? this.anims.jump : this.anims.crouch);
  }

  // ── Movement ─────────────────────────────────────────────────────────────

  /** Hops (possibly several times) until it reaches x. */
  private hopTo(x: number): void {
    this.targetX = this.clampX(x);
    if (Math.abs(this.targetX - this.x) < 1) {
      this.targetX = null;
      return;
    }
    this.facing = this.targetX > this.x ? 1 : -1;
    this.enter('crouch');
  }

  /** Something small and natural to do when nothing is happening. */
  private pickAmbientAction(): void {
    this.nextActionIn = randomBetween(3, 8);
    const roll = Math.random();

    if (roll < 0.55) {
      // Wander to a spot at least a hop away.
      const span = this.sceneWidth - this.width - EDGE_MARGIN * 2;
      let x = EDGE_MARGIN + Math.random() * span;
      if (Math.abs(x - this.x) < HOP_DISTANCE) x = this.x + HOP_DISTANCE * (x < this.x ? -1 : 1);
      this.hopTo(x);
    } else if (roll < 0.8) {
      this.facing = this.facing === 1 ? -1 : 1;
    }
    // Otherwise: just keep sitting.
  }

  private clampX(x: number): number {
    const max = Math.max(EDGE_MARGIN, this.sceneWidth - this.width - EDGE_MARGIN);
    return Math.min(max, Math.max(EDGE_MARGIN, x));
  }

  // ── Drawing helpers ──────────────────────────────────────────────────────

  private mouth(): { x: number; y: number } {
    const x = this.facing === 1 ? this.x + MOUTH.x : this.x + this.width - 1 - MOUTH.x;
    return { x, y: this.y - this.lift + MOUTH.y };
  }

  private tongueTip(): { x: number; y: number } {
    const m = this.mouth();
    return {
      x: m.x + (this.tongueTarget.x - m.x) * this.tongue,
      y: m.y + (this.tongueTarget.y - m.y) * this.tongue,
    };
  }

  private drawTongue(screen: Screen): void {
    const from = this.mouth();
    const to = this.tongueTip();
    const steps = Math.max(1, Math.round(Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y))));
    const ctx = screen.ctx;

    ctx.fillStyle = TONGUE_COLOR;
    for (let i = 0; i <= steps; i++) {
      const px = Math.round(from.x + ((to.x - from.x) * i) / steps);
      const py = Math.round(from.y + ((to.y - from.y) * i) / steps);
      ctx.fillRect(px, py, 1, 1);
    }
    ctx.fillStyle = TONGUE_TIP;
    ctx.fillRect(Math.round(to.x) - 1, Math.round(to.y) - 1, 2, 2);
  }

  private enter(state: FrogState): void {
    this.state = state;
    this.stateTime = 0;
    if (state === 'celebrate') this.lastBounce = -1;
    this.player.play(this.anims[state], true);
  }
}
