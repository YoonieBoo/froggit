import { AnimationPlayer, type Animation } from './animation';
import { makeSprite, type Screen } from './renderer';
import {
  FROG_BLINK,
  FROG_CROUCH,
  FROG_IDLE_0,
  FROG_IDLE_1,
  FROG_JUMP,
} from './sprites/frog';

type FrogState = 'idle' | 'blink' | 'crouch' | 'jump' | 'land';

type FrogAnimations = Record<FrogState, Animation>;

function createAnimations(): FrogAnimations {
  const crouch = makeSprite(FROG_CROUCH);
  return {
    idle: { frames: [makeSprite(FROG_IDLE_0), makeSprite(FROG_IDLE_1)], fps: 1.5, loop: true },
    blink: { frames: [makeSprite(FROG_BLINK)], fps: 7, loop: false },
    crouch: { frames: [crouch], fps: 8, loop: false },
    jump: { frames: [makeSprite(FROG_JUMP)], fps: 1, loop: true },
    land: { frames: [crouch], fps: 10, loop: false },
  };
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

// Hop tuning, in logical pixels and seconds.
const HOP_DISTANCE = 10;
const HOP_HEIGHT = 5;
const HOP_DURATION = 0.4;
const EDGE_MARGIN = 2;

/**
 * The frog's state machine. Each state decides when to hand over to the next one.
 * New behaviors (chase, eat, celebrate…) are added as new states here.
 */
export class Frog {
  x = 0;
  y = 0;
  facing: 1 | -1 = 1;

  readonly width = 16;
  readonly height = 14;

  private state: FrogState = 'idle';
  private readonly anims = createAnimations();
  private readonly player = new AnimationPlayer();
  private sceneWidth = 0;

  private nextBlinkIn = randomBetween(2, 5);
  private nextActionIn = randomBetween(2, 4);

  // Hop in progress.
  private targetX: number | null = null;
  private hopFromX = 0;
  private hopToX = 0;
  private hopTime = 0;
  private lift = 0; // pixels above the ground

  constructor() {
    this.player.play(this.anims.idle);
  }

  /** Puts the frog on the ground line, keeping it inside the scene. */
  placeOnGround(groundY: number, sceneWidth: number): void {
    this.sceneWidth = sceneWidth;
    this.y = groundY - this.height + 1;
    const first = this.x === 0;
    this.x = first ? Math.floor((sceneWidth - this.width) / 2) : this.clampX(this.x);
    if (this.targetX !== null) this.targetX = this.clampX(this.targetX);
  }

  /** Hops (possibly several times) until it reaches x. */
  hopTo(x: number): void {
    this.targetX = this.clampX(x);
    if (Math.abs(this.targetX - this.x) < 1) {
      this.targetX = null;
      return;
    }
    this.facing = this.targetX > this.x ? 1 : -1;
    this.enter('crouch');
  }

  update(dt: number): void {
    this.player.update(dt);

    switch (this.state) {
      case 'idle':
        this.nextBlinkIn -= dt;
        this.nextActionIn -= dt;
        if (this.nextActionIn <= 0) this.pickAmbientAction();
        else if (this.nextBlinkIn <= 0) this.enter('blink');
        break;

      case 'blink':
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
          this.hopTime = 0;
          this.enter('jump');
        }
        break;

      case 'jump': {
        this.hopTime += dt;
        const t = Math.min(1, this.hopTime / HOP_DURATION);
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
        if (this.targetX !== null && Math.abs(this.targetX - this.x) >= 1) {
          this.enter('crouch');
        } else {
          this.targetX = null;
          this.enter('idle');
        }
        break;
    }
  }

  draw(screen: Screen): void {
    screen.drawSprite(this.player.frame, this.x, this.y - this.lift, this.facing === -1);
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

  private enter(state: FrogState): void {
    this.state = state;
    this.player.play(this.anims[state], true);
  }
}
