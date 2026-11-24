import type { Customization } from '../shared/customization';
import type { HostMessage, PondSettings, WebviewMessage } from '../shared/protocol';
import type { StageId } from '../shared/stages';
import { Bugs } from './Bugs';
import { Egg } from './Egg';
import { Frog } from './Frog';
import { Hud } from './Hud';
import { NewYearParty } from './NewYearParty';
import { motion, setReducedMotionSetting } from './motion';
import { Particles } from './Particles';
import { Pond } from './Pond';
import { FIREWORK_COLORS } from './pondThemes';
import { Screen } from './renderer';
import { Wardrobe } from './Wardrobe';
import { WhisperBubble } from './WhisperBubble';
import { pickWhisper } from './whispers';

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
const party = new NewYearParty(particles);
/** During the party, the frog smiles along every few seconds. */
const PARTY_CHEER_EVERY = 8;
let partyCheers = 0;
const wardrobe = new Wardrobe({
  change(look) {
    applyLook(look);
    vscode.postMessage({ type: 'customize', customization: look });
  },
  buy: (pack) => vscode.postMessage({ type: 'buy', pack }),
});

const whisperBubble = new WhisperBubble();
let lastWhisper: string | null = null;
/** Which finale the pond's ambient layer is on; the frog cheers when it changes. */
let finaleCount = -1;

function applySettings(settings: PondSettings): void {
  setReducedMotionSetting(settings.reducedMotion);
  document.body.classList.toggle('calm', motion.reduced);
}

function whisper(): void {
  lastWhisper = pickWhisper(lastWhisper);
  whisperBubble.show(lastWhisper);
  placeWhisper();
}

/** Keeps the bubble above the frog's head (or hat) as it moves. */
function placeWhisper(): void {
  const pos = screen.toCss(frog.centerX, frog.topY);
  whisperBubble.place(pos.x, pos.y);
}

/** Keeps the bubble up for its few seconds, unless a bug hunt needs the space. */
function updateWhispers(dt: number): void {
  // Bug hunting comes first: make way for the "!" and the tongue.
  if (whisperBubble.showing && (frog.hunting || showEgg())) whisperBubble.hide();
  whisperBubble.update(dt);
  if (whisperBubble.showing) placeWhisper();
}

function applyLook(look: Customization): void {
  frog.setOutfit(look);
  party.setUserHat(look.hat);
  pond.setLook(look.pond, look.decorations);
  document.body.dataset.hud = pond.theme.hud;
  render();
}

/** null until the host's first snapshot arrives. */
let stage: StageId | null = null;
/** The welcome hatch: seconds the egg has been showing, or null when it isn't. */
let welcome: number | null = null;
// The egg sits for a moment, wobbles once, then hatches (Egg adds its own ~2s crack).
const WELCOME_WOBBLE_AT = 0.8;
const WELCOME_HATCH_AT = 1.6;

let lastTime = performance.now();
let lastDraw = 0;
let elapsed = 0;

const showEgg = () => welcome !== null;

/** Plays the welcome: the egg cracks open and the frog jumps out. */
function updateWelcome(dt: number): void {
  if (welcome === null || welcome < 0) return;
  const before = welcome;
  welcome += dt;
  if (before < WELCOME_WOBBLE_AT && welcome >= WELCOME_WOBBLE_AT) egg.wobble();
  if (before < WELCOME_HATCH_AT && welcome >= WELCOME_HATCH_AT) {
    welcome = -1; // hatching; Egg calls back when it's done
    egg.hatch(() => {
      welcome = null;
      frog.moveTo(egg.centerX - frog.width / 2);
      frog.queueCelebration();
      floatText('hello!', true);
      vscode.postMessage({ type: 'hatched' });
    });
  }
}

/** Lets the pond's extras (holiday messages) keep clear of the XP plank. */
function syncHudBox(): void {
  const box = hud.box;
  if (!box) return pond.setHud(undefined);
  const corner = screen.toLogical(box.right, box.bottom);
  pond.setHud({ right: corner.x, bottom: corner.y });
}

function layout(): void {
  screen.resize();
  pond.build(screen.width, screen.height);
  syncHudBox();
  egg.placeOnGround(pond.groundY, screen.width);
  frog.placeOnGround(pond.groundY, screen.width);
  bugs.setBounds(screen.width, pond.groundY);
  render();
}

function render(): void {
  screen.begin();
  pond.draw(screen.ctx, elapsed);
  party.draw(screen, pond.scene, elapsed, showEgg() ? egg.centerX : frog.centerX);
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

  updateWelcome(dt);
  if (showEgg()) egg.update(dt);
  else frog.update(dt);
  bugs.update(dt);
  particles.update(dt);
  if (stage !== null) updateWhispers(dt);
  updateParty();
  updateFinale();
  render();
}

/** Starts the New Year party at midnight, and keeps the frog celebrating through it. */
function updateParty(): void {
  if (party.update(elapsed) && !showEgg()) frog.queueCelebration();
  if (!party.active || showEgg() || motion.reduced) return;
  const cheers = Math.floor(elapsed / PARTY_CHEER_EVERY);
  if (cheers !== partyCheers) frog.cheer(FIREWORK_COLORS);
  partyCheers = cheers;
}

/** Smiles along with themed ponds' big moments, like the holiday messages. */
function updateFinale(): void {
  const finale = pond.theme.finale;
  if (!finale || motion.reduced) return;
  const count = Math.floor(elapsed / finale.every);
  if (count !== finaleCount && elapsed % finale.every < 0.5 && !showEgg() && stage !== null) {
    frog.cheer(finale.colors);
  }
  finaleCount = count;
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

    case 'newYearNow':
      party.startNow(elapsed);
      if (!showEgg()) frog.queueCelebration();
      break;

    case 'customization':
      applyLook(message.customization);
      wardrobe.sync(message.customization);
      break;

    case 'owned':
      wardrobe.syncOwned(message.owned);
      break;

    case 'snapshot':
      applySettings(message.settings);
      applyLook(message.customization);
      wardrobe.syncOwned(message.owned);
      wardrobe.sync(message.customization);
      stage = message.progress.stage;
      hud.show(message.progress);
      syncHudBox();
      bugs.setCounts(message.bugs);
      // A brand-new (or reset) frog gets the welcome hatch, once.
      if (message.hatch && welcome === null) welcome = 0;
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
      syncHudBox(); // the plank's width can change with the numbers
      floatText(`+${message.gained} XP`);
      if (!message.stageUp) break;

      stage = message.progress.stage;
      if (!showEgg()) frog.queueCelebration();
      floatText(`${message.progress.stageName}!`, true);
      break;
    }
  }
}

/** Where a mouse event lands in the pond, in logical pixels. */
function pondPoint(event: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return screen.fromCss(event.clientX - rect.left, event.clientY - rect.top);
}

function onCreature(event: MouseEvent): 'frog' | 'egg' | null {
  if (stage === null) return null;
  const { x, y } = pondPoint(event);
  if (showEgg()) return egg.contains(x, y) ? 'egg' : null;
  return frog.contains(x, y) ? 'frog' : null;
}

// Click the frog and it says something nice. Click the egg and it wobbles.
canvas.addEventListener('click', (event) => {
  const hit = onCreature(event);
  if (hit === 'egg') egg.wobble();
  if (hit !== 'frog' || frog.hunting) return;
  frog.poke();
  whisper();
});
canvas.addEventListener('mousemove', (event) => {
  canvas.style.cursor = onCreature(event) ? 'pointer' : '';
});

window.addEventListener('message', (event: MessageEvent<HostMessage>) => handleMessage(event.data));
new ResizeObserver(layout).observe(canvas);
document.addEventListener('visibilitychange', () => {
  lastTime = performance.now();
});
requestAnimationFrame(tick);
vscode.postMessage({ type: 'ready' });
