import type { HostMessage, WebviewMessage } from '../shared/protocol';
import { Bugs } from './Bugs';
import { Frog } from './Frog';
import { Particles } from './Particles';
import { Pond } from './Pond';
import { Screen } from './renderer';

// Provided by VS Code inside webviews. Can only be called once.
declare function acquireVsCodeApi(): { postMessage(message: WebviewMessage): void };

const FPS = 30;
// Even if many problems are fixed at once, the frog eats at most this many in a row.
const MAX_MEALS_PER_UPDATE = 4;

const vscode = acquireVsCodeApi();
const canvas = document.getElementById('pond') as HTMLCanvasElement;
const screen = new Screen(canvas);
const pond = new Pond();
const particles = new Particles();
const bugs = new Bugs();
const frog = new Frog(particles, (prey) => bugs.remove(prey));

let lastTime = performance.now();
let lastDraw = 0;
let elapsed = 0;

function layout(): void {
  screen.resize();
  pond.build(screen.width, screen.height);
  frog.placeOnGround(pond.groundY, screen.width);
  bugs.setBounds(screen.width, pond.groundY);
  render();
}

function render(): void {
  screen.begin();
  pond.draw(screen, elapsed);
  frog.draw(screen);
  bugs.draw(screen);
  particles.draw(screen);
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
  bugs.update(dt);
  particles.update(dt);
  render();
}

function handleMessage(message: HostMessage): void {
  switch (message.type) {
    case 'snapshot':
      bugs.setCounts(message.bugs);
      break;

    case 'bugsChanged': {
      // Claim prey before updating counts, so fixed bugs get eaten rather than fly off.
      if (message.fixed > 0) {
        frog.addMeals(bugs.claim(Math.min(message.fixed, MAX_MEALS_PER_UPDATE), frog.centerX));
      }
      bugs.setCounts(message.bugs);

      const clean = message.bugs.errors + message.bugs.warnings === 0;
      if (message.fixed > 0 && clean) frog.queueCelebration();
      else if (message.added > 0) frog.noticeSomething();
      break;
    }
  }
}

window.addEventListener('message', (event: MessageEvent<HostMessage>) => handleMessage(event.data));
new ResizeObserver(layout).observe(canvas);
document.addEventListener('visibilitychange', () => {
  lastTime = performance.now();
});
requestAnimationFrame(tick);
vscode.postMessage({ type: 'ready' });
