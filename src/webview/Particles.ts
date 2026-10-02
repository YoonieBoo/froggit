import type { Screen } from './renderer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds left
  color: string;
}

const GRAVITY = 40;

export const CONFETTI = ['#f2d75a', '#f29ab0', '#86cad3', '#9be36a', '#ffffff'];

/** Single-pixel particles: confetti, crumbs, sparkles. */
export class Particles {
  private list: Particle[] = [];

  burst(x: number, y: number, count: number, colors: readonly string[], speed = 30): void {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const v = speed * (0.5 + Math.random() * 0.7);
      this.list.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 0.8 + Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(screen: Screen): void {
    for (const p of this.list) {
      screen.ctx.fillStyle = p.color;
      screen.ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }
}
