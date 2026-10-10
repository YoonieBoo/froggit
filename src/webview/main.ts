import type { Customization } from '../shared/customization';
import type { HostMessage, PondSettings, WebviewMessage } from '../shared/protocol';
import type { StageId } from '../shared/stages';
import { Bugs } from './Bugs';
import { Egg } from './Egg';
import { Frog } from './Frog';
import { Hud } from './Hud';
import { motion, setReducedMotionSetting } from './motion';
import { Particles } from './Particles';
import { Pond } from './Pond';
import { Screen } from './renderer';
import { Wardrobe } from './Wardrobe';
import { WhisperBubble } from './WhisperBubble';
import { pickWhisper, WhisperClock } from './whispers';

// Provided by VS Code inside webviews. Can only be called once.
declare function acquireVsCodeApi(): { postMessage(message: WebviewMessage): void };

const FPS = 30;
// Even if many problems are fixed at once, the frog eats at most this many in a row.
const MAX_MEALS_PER_UPDATE = 4;

const vscode = acquireVsCodeApi();
const canvas = document.getElementById('pond') as HTMLCanvasElement;
const screen = new Screen(canvas);
const hud = new Hud();
const pond = new Pond();
const particles = new Particles();
const bugs = new Bugs();
const egg = new Egg(particles);
const frog = new Frog(particles, (prey) => bugs.remove(prey));
const wardrobe = new Wardrobe((look) => {
  applyLook(look);
  vscode.postMessage({ type: 'customize', customization: look });
});

const whisperBubble = new WhisperBubble();
const whisperClock = new WhisperClock(10 * 60);
let whispersOn = true;
let lastWhisper: string | null = null;

function applySettings(settings: PondSettings): void {
  setReducedMotionSetting(settings.reducedMotion);
  document.body.classList.toggle('calm', motion.reduced);
  whispersOn = settings.whispers;
  whisperClock.setInterval(settings.whisperMinutes * 60);
  if (!whispersOn) {
    whisperBubble.hide();
    whisperClock.restart();
  }
}

function whisper(): void {
  lastWhisper = pickWhisper(lastWhisper);
  whisperBubble.show(lastWhisper);
  whisperClock.restart();
  placeWhisper();
}

/** Keeps the bubble above the frog's head (or hat) as it moves. */
function placeWhisper(): void {
  const pos = screen.toCss(frog.centerX, frog.topY);
  whisperBubble.place(pos.x, pos.y);
}

/** Speaks when a message is due, and only if nothing else is going on. */
function updateWhispers(dt: number): void {
  // Bug hunting comes first: make way for the "!" and the tongue.
  if (whisperBubble.showing && (frog.busy || showEgg())) whisperBubble.hide();
  if (whispersOn) {
    const free = !showEgg() && !frog.busy && !wardrobe.isOpen && !whisperBubble.showing;
    if (whisperClock.update(dt, free)) whisper();
  }
  whisperBubble.update(dt);
  if (whisperBubble.showing) placeWhisper();
}

function applyLook(look: Customization): void {
  frog.setOutfit(look);
  pond.setLook(look.pond, look.decorations);
  document.body.dataset.hud = pond.theme.hud;
  render();
}

/** null until the host's first snapshot arrives. */
let stage: StageId | null = null;
let hatching = false;

let lastTime = performance.now();
let lastDraw = 0;
let elapsed = 0;

const showEgg = () => stage === 'egg' || hatching;

function layout(): void {
  screen.resize();
  pond.build(screen.width, screen.height);
  egg.placeOnGround(pond.groundY, screen.width);
  frog.placeOnGround(pond.groundY, screen.width);
  bugs.setBounds(screen.width, pond.groundY);
  render();
}

function render(): void {
  screen.begin();
  pond.draw(screen.ctx, elapsed);
  if (stage !== null) {
    if (showEgg()) egg.draw(screen, elapsed);
    else frog.draw(screen);
  }
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

  if (showEgg()) egg.update(dt);
  else frog.update(dt);
  bugs.update(dt);
  particles.update(dt);
  if (stage !== null) updateWhispers(dt);
  render();
}

/** Floating text above whichever creature is on screen. */
function floatText(message: string, big = false): void {
  const actor = showEgg() ? egg : frog;
  const pos = screen.toCss(actor.centerX, actor.y - (big ? 10 : 2));
  hud.float(message, pos.x, pos.y, big);
}

function handleMessage(message: HostMessage): void {
  switch (message.type) {
    case 'settings':
      applySettings(message.settings);
      break;

    case 'whisperNow':
      if (!showEgg()) whisper();
      break;

    case 'customization':
      applyLook(message.customization);
      wardrobe.sync(message.customization);
      break;

    case 'snapshot':
      applySettings(message.settings);
      applyLook(message.customization);
      wardrobe.sync(message.customization);
      stage = message.progress.stage;
      hud.show(message.progress);
      bugs.setCounts(message.bugs);
      break;

    case 'bugsChanged': {
      if (showEgg()) {
        // An egg can't eat; it just gets excited, and fixed bugs fly away.
        if (message.fixed > 0 || message.added > 0) egg.wobble();
        bugs.setCounts(message.bugs);
        break;
      }
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

    case 'progress': {
      hud.show(message.progress);
      floatText(`+${message.gained} XP`);
      if (!message.stageUp) break;

      const wasEgg = stage === 'egg';
      stage = message.progress.stage;
      const name = message.progress.stageName;
      if (wasEgg) {
        hatching = true;
        egg.hatch(() => {
          hatching = false;
          frog.moveTo(egg.centerX - frog.width / 2);
          frog.queueCelebration();
          floatText(`${name}!`, true);
        });
      } else {
        frog.queueCelebration();
        floatText(`${name}!`, true);
      }
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
