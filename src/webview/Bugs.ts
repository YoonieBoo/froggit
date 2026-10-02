import { visibleBeetles, visibleGnats } from '../shared/bugMapping';
import type { BugCounts } from '../shared/protocol';
import { motion } from './motion';
import { makeSprite, type Screen, type Sprite } from './renderer';
import { BEETLE_0, BEETLE_1, GNAT_0, GNAT_1 } from './sprites/bug';

type BugKind = 'beetle' | 'gnat';
type BugState = 'arriving' | 'hovering' | 'leaving';

/** What the frog needs to know about a bug it is hunting. */
export interface Prey {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Set by the frog once the tongue has it; the bug then stops moving on its own. */
  caught: boolean;
}

interface Bug extends Prey {
  kind: BugKind;
  state: BugState;
  /** Promised to the frog: it stays put and no longer counts toward the visible total. */
  doomed: boolean;
  homeX: number;
  homeY: number;
  fromX: number;
  fromY: number;
  t: number; // seconds in current state
  phase: number; // desynchronizes wobble and wing flaps
}

const ARRIVE_TIME = 1.6;
const SPAWN_INTERVAL = 0.35;
const LEAVE_SPEED = 25;
const WING_FPS = 10;

const easeOut = (p: number) => 1 - (1 - p) * (1 - p);

/** The swarm of bugs hovering over the pond. Fly in when problems appear, fly away when they go. */
export class Bugs {
  private list: Bug[] = [];
  private target: Record<BugKind, number> = { beetle: 0, gnat: 0 };
  private spawnCooldown = 0;
  private width = 0;
  private top = 0;
  private bottom = 0;

  private readonly sprites: Record<BugKind, Sprite[]> = {
    beetle: [makeSprite(BEETLE_0), makeSprite(BEETLE_1)],
    gnat: [makeSprite(GNAT_0), makeSprite(GNAT_1)],
  };

  /** Bugs hover in a band just above the frog, so its tongue can reach them. */
  setBounds(width: number, groundY: number): void {
    this.width = width;
    this.bottom = groundY - 10;
    this.top = Math.max(2, groundY - 26);
    for (const bug of this.list) {
      bug.homeX = Math.min(bug.homeX, Math.max(2, width - 10));
      bug.homeY = Math.min(Math.max(bug.homeY, this.top), this.bottom);
    }
  }

  setCounts(counts: BugCounts): void {
    this.target.beetle = visibleBeetles(counts.errors);
    this.target.gnat = visibleGnats(counts.warnings);
  }

  /**
   * Hands up to `count` bugs to the frog, nearest first. Call before setCounts():
   * claimed bugs stop counting, so the swarm doesn't also send one flying away.
   */
  claim(count: number, nearX: number): Prey[] {
    const claimed = this.list
      .filter((b) => b.state !== 'leaving' && !b.doomed)
      .sort((a, b) => Math.abs(a.x - nearX) - Math.abs(b.x - nearX))
      .slice(0, count);
    for (const bug of claimed) bug.doomed = true;
    return claimed;
  }

  /** Called by the frog when a bug has been swallowed. */
  remove(prey: Prey): void {
    this.list = this.list.filter((b) => b !== prey);
  }

  update(dt: number): void {
    this.spawnCooldown -= dt;

    for (const kind of ['beetle', 'gnat'] as const) {
      const active = this.list.filter((b) => b.kind === kind && b.state !== 'leaving' && !b.doomed);
      if (active.length > this.target[kind]) {
        this.leave(active[active.length - 1]);
      } else if (active.length < this.target[kind] && this.spawnCooldown <= 0) {
        this.spawn(kind);
        this.spawnCooldown = SPAWN_INTERVAL;
      }
    }

    for (const bug of this.list) this.move(bug, dt);
    this.list = this.list.filter((b) => !(b.state === 'leaving' && b.y < -10));
  }

  draw(screen: Screen): void {
    for (const bug of this.list) {
      const frames = this.sprites[bug.kind];
      const frame = frames[Math.floor((bug.t + bug.phase) * WING_FPS) % frames.length];
      screen.drawSprite(frame, bug.x, bug.y);
    }
  }

  private move(bug: Bug, dt: number): void {
    bug.t += dt;
    if (bug.caught) return; // the frog's tongue is moving it

    // Gentle figure-of-eight hover around the base position (smaller with reduced motion).
    const amount = motion.reduced ? 0.3 : 1;
    const wobbleX = Math.sin(bug.t * 1.3 + bug.phase) * 3 * amount;
    const wobbleY = Math.sin(bug.t * 2.1 + bug.phase) * 2 * amount;

    switch (bug.state) {
      case 'arriving': {
        const p = Math.min(1, bug.t / ARRIVE_TIME);
        const e = easeOut(p);
        bug.x = bug.fromX + (bug.homeX - bug.fromX) * e + wobbleX * p;
        bug.y = bug.fromY + (bug.homeY - bug.fromY) * e + wobbleY * p;
        if (p >= 1) bug.state = 'hovering'; // keep t running so the wobble stays smooth
        break;
      }
      case 'hovering':
        bug.x = bug.homeX + wobbleX;
        bug.y = bug.homeY + wobbleY;
        break;
      case 'leaving':
        bug.x = bug.fromX + Math.sin(bug.t * 5 + bug.phase) * 2;
        bug.y = bug.fromY - LEAVE_SPEED * bug.t;
        break;
    }
  }

  private spawn(kind: BugKind): void {
    const fromLeft = Math.random() < 0.5;
    const home = this.pickHome();
    const sprite = this.sprites[kind][0];
    const fromX = fromLeft ? -8 : this.width + 2;
    const fromY = this.top + Math.random() * (this.bottom - this.top);
    this.list.push({
      kind,
      state: 'arriving',
      doomed: false,
      caught: false,
      x: fromX,
      y: fromY,
      w: sprite.w,
      h: sprite.h,
      fromX,
      fromY,
      homeX: home.x,
      homeY: home.y,
      t: 0,
      phase: Math.random() * Math.PI * 2,
    });
  }

  private leave(bug: Bug): void {
    bug.state = 'leaving';
    bug.fromX = bug.x;
    bug.fromY = bug.y;
    bug.t = 0;
  }

  /** Tries a few random spots and keeps the one furthest from other bugs. */
  private pickHome(): { x: number; y: number } {
    let best = { x: 0, y: 0 };
    let bestDistance = -1;
    for (let i = 0; i < 6; i++) {
      const candidate = {
        x: 4 + Math.random() * Math.max(1, this.width - 14),
        y: this.top + Math.random() * Math.max(1, this.bottom - this.top),
      };
      const nearest = Math.min(
        Infinity,
        ...this.list.map((b) => Math.hypot(b.homeX - candidate.x, b.homeY - candidate.y)),
      );
      if (nearest > bestDistance) {
        best = candidate;
        bestDistance = nearest;
      }
    }
    return best;
  }
}
