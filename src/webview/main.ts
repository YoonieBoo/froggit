import { Frog } from './Frog';
import { Pond } from './Pond';
import { Screen } from './renderer';

const FPS = 30;

const canvas = document.getElementById('pond') as HTMLCanvasElement;
const screen = new Screen(canvas);
const pond = new Pond();
const frog = new Frog();

let lastTime = performance.now();
let lastDraw = 0;
let elapsed = 0;

function layout(): void {
  screen.resize();
  pond.build(screen.width, screen.height);
  frog.placeOnGround(pond.groundY, screen.width);
  render();
}

function render(): void {
  screen.begin();
  pond.draw(screen, elapsed);
  frog.draw(screen);
}

function tick(now: number): void {
  requestAnimationFrame(tick);

  // Cap at FPS; pixel art doesn't need 120 Hz.
  if (now - lastDraw < 1000 / FPS) return;
  lastDraw = now;

  // Clamp so a long pause (hidden panel, breakpoint) doesn't jump the frog.
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  elapsed += dt;

  frog.update(dt);
  render();
}

new ResizeObserver(layout).observe(canvas);
document.addEventListener('visibilitychange', () => {
  lastTime = performance.now();
});
requestAnimationFrame(tick);
