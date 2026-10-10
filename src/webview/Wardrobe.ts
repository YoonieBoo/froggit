import {
  DECORATIONS,
  defaultCustomization,
  DEFAULT_POND,
  FACES,
  HATS,
  PONDS,
  type Customization,
  type DecorationId,
  type PondId,
} from '../shared/customization';
import { DECORATION_ART, decorationBase } from './decorations';
import { outfitFor } from './outfit';
import { Pond } from './Pond';
import { POND_THEMES, type Paint, type SceneBox } from './pondThemes';
import { makeSprite, type Sprite } from './renderer';
import { headAnchor } from './sprites/accessories';
import { FROG_IDLE_0 } from './sprites/frog';
import { CLOSE_ICON, HANGER_ICON, woodButton } from './sprites/ui';

type Slot = 'hat' | 'face' | 'pond' | 'decoration';
type Tab = 'outfit' | 'pond';

interface Tile {
  slot: Slot;
  id: string | null;
  button: HTMLButtonElement;
  canvas: HTMLCanvasElement;
}

// CSS pixels per art pixel. Fixed rather than following the pond's zoom,
// so the menu stays compact in a tall sidebar.
const UI_PX = 2;
const PREVIEW_PX = 3;

// Room around the frog for the widest and tallest accessories.
const FROG_AT = { x: 1, y: 7 };
const FRAME_W = 20;
const MIRROR_H = 21; // the whole frog
const TILE_H = 16; // head and shoulders: where the accessories are
const THUMB = { w: 28, h: 22 }; // a pond in miniature
// A slice of sky, water and grass to show one decoration on.
const SWATCH: SceneBox = { width: FRAME_W, height: TILE_H, waterTop: 4, groundY: 10 };

let frogSprite: Sprite | undefined;

/** Draws the idle frog wearing `look` into a small canvas. */
function drawDressedFrog(canvas: HTMLCanvasElement, look: Customization): void {
  frogSprite ??= makeSprite(FROG_IDLE_0);
  const head = headAnchor(FROG_IDLE_0);
  const g = canvas.getContext('2d')!;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.drawImage(frogSprite.image, FROG_AT.x, FROG_AT.y);
  const { hat, face } = outfitFor(look);
  for (const item of [face, hat]) {
    if (!item) continue;
    g.drawImage(item.sprite.image, FROG_AT.x + head.x + item.dx, FROG_AT.y + head.y + item.dy);
  }
}

function pixelCanvas(width: number, height: number, px: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width * px}px`;
  canvas.style.height = `${height * px}px`;
  return canvas;
}

/** Gives a <button> the wooden pixel look, with a pressed-in state while clicked. */
function skinWoodButton(button: HTMLElement, icon: string[]): void {
  const up = makeSprite(woodButton(icon));
  const down = makeSprite(woodButton(icon, true));
  button.style.setProperty('--wood-up', `url("${up.image.toDataURL()}")`);
  button.style.setProperty('--wood-down', `url("${down.image.toDataURL()}")`);
  button.style.width = `${up.w * UI_PX}px`;
  button.style.height = `${up.h * UI_PX}px`;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * The wooden wardrobe button and the board it opens, with an Outfit tab and a
 * Pond tab. Picking an item applies it immediately; the host saves it and
 * echoes it back through `sync`.
 */
export class Wardrobe {
  private look = defaultCustomization();
  private tab: Tab = 'outfit';
  private readonly openButton = document.getElementById('wardrobe-button') as HTMLButtonElement;
  private readonly board = document.getElementById('wardrobe')!;
  private readonly mirror = element('div', 'mirror');
  private readonly preview = pixelCanvas(FRAME_W, MIRROR_H, PREVIEW_PX);
  private readonly caption = element('span', 'board-caption');
  private readonly tabs = new Map<Tab, { tab: HTMLButtonElement; panel: HTMLElement }>();
  private readonly tiles: Tile[] = [];

  constructor(private readonly onChange: (look: Customization) => void) {
    skinWoodButton(this.openButton, HANGER_ICON);
    this.openButton.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
    this.buildBoard();
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  /** Shows the saved look. The button appears once the first look arrives. */
  sync(look: Customization): void {
    this.look = look;
    this.openButton.hidden = false;
    this.refresh();
  }

  get isOpen(): boolean {
    return !this.board.hidden;
  }

  private open(): void {
    this.board.hidden = false;
    this.openButton.setAttribute('aria-expanded', 'true');
    this.refresh();
    this.focusSelected();
  }

  private close(): void {
    this.board.hidden = true;
    this.openButton.setAttribute('aria-expanded', 'false');
    this.openButton.focus();
  }

  private showTab(tab: Tab): void {
    this.tab = tab;
    for (const [id, { tab: button, panel }] of this.tabs) {
      button.setAttribute('aria-selected', String(id === tab));
      button.tabIndex = id === tab ? 0 : -1;
      panel.hidden = id !== tab;
    }
    this.refresh();
  }

  private focusSelected(): void {
    const panel = this.tabs.get(this.tab)!.panel;
    panel.querySelector<HTMLButtonElement>('.tile[aria-pressed="true"]')?.focus();
  }

  private choose(slot: 'hat' | 'face' | 'pond', id: string | null): void {
    this.update({ ...this.look, [slot]: id });
  }

  private toggleDecoration(id: DecorationId): void {
    const on = new Set(this.look.decorations);
    if (on.has(id)) on.delete(id);
    else on.add(id);
    // Keep registry order so the saved list is stable.
    this.update({ ...this.look, decorations: DECORATIONS.map((d) => d.id).filter((d) => on.has(d)) });
  }

  private update(look: Customization): void {
    this.look = look;
    this.refresh();
    this.onChange(look);
  }

  // ── Building ─────────────────────────────────────────────────────────────

  private buildBoard(): void {
    const header = element('div', 'board-header');
    this.caption.setAttribute('aria-live', 'polite');
    const closeButton = element('button', 'wood-button');
    closeButton.title = 'Close';
    closeButton.setAttribute('aria-label', 'Close wardrobe');
    skinWoodButton(closeButton, CLOSE_ICON);
    closeButton.addEventListener('click', () => this.close());
    header.append(element('span', 'board-title', 'Wardrobe'), this.caption, closeButton);

    const tabList = element('div', 'tabs');
    tabList.setAttribute('role', 'tablist');
    const panels = element('div', 'panels');

    const outfit = element('div', 'shelves');
    outfit.append(
      this.buildShelf('Hats', 'hat', TILE_H, [{ id: null, name: 'No hat' }, ...HATS]),
      this.buildShelf('Face', 'face', TILE_H, [{ id: null, name: 'Nothing on the face' }, ...FACES]),
    );

    const pond = element('div', 'shelves');
    const reset = element('button', 'wood-text-button', 'Reset pond');
    reset.title = 'Back to the Classic Pond with no decorations';
    reset.addEventListener('click', () =>
      this.update({ ...this.look, pond: DEFAULT_POND, decorations: [] }),
    );
    pond.append(
      this.buildShelf('Ponds', 'pond', THUMB.h, PONDS),
      this.buildShelf('Decorations', 'decoration', TILE_H, DECORATIONS),
      reset,
    );

    for (const [id, label, panel] of [
      ['outfit', 'Outfit', outfit],
      ['pond', 'Pond', pond],
    ] as const) {
      const tab = element('button', 'tab', label);
      tab.id = `tab-${id}`;
      panel.id = `panel-${id}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      tab.addEventListener('click', () => this.showTab(id));
      tabList.append(tab);
      panels.append(panel);
      this.tabs.set(id, { tab, panel });
    }

    this.mirror.append(this.preview);
    const body = element('div', 'board-body');
    body.append(this.mirror, panels);
    this.board.append(header, tabList, body);
    this.showTab('outfit');
  }

  private buildShelf(
    label: string,
    slot: Slot,
    height: number,
    items: readonly { id: string | null; name: string }[],
  ): HTMLElement {
    const shelf = element('div', 'shelf');
    shelf.setAttribute('role', 'group');
    shelf.setAttribute('aria-label', label);

    const row = element('div', 'shelf-row');
    for (const { id, name } of items) {
      const button = element('button', id === null ? 'tile none' : 'tile');
      button.title = name;
      button.setAttribute('aria-label', name);
      const canvas = pixelCanvas(slot === 'pond' ? THUMB.w : FRAME_W, height, UI_PX);
      button.append(canvas);
      button.addEventListener('click', () =>
        slot === 'decoration' ? this.toggleDecoration(id as DecorationId) : this.choose(slot, id),
      );
      row.append(button);
      this.tiles.push({ slot, id, button, canvas });
    }

    shelf.append(element('div', 'shelf-label', label), row);
    return shelf;
  }

  // ── Updating ─────────────────────────────────────────────────────────────

  private refresh(): void {
    drawDressedFrog(this.preview, this.look);
    const { skyLow, grassTop } = POND_THEMES[this.look.pond].colors;
    this.mirror.style.background = skyLow;
    this.mirror.style.boxShadow = `inset 0 -${UI_PX}px 0 ${grassTop}`;

    for (const tile of this.tiles) {
      const { slot, id, canvas } = tile;
      if (slot === 'decoration') {
        const on = this.look.decorations.includes(id as DecorationId);
        tile.button.setAttribute('aria-pressed', String(on));
        drawDecorationSwatch(canvas, id as DecorationId, this.look.pond);
      } else if (slot === 'pond') {
        tile.button.setAttribute('aria-pressed', String(this.look.pond === id));
        // Each pond is previewed with the decorations you've picked.
        drawPondThumbnail(canvas, id as PondId, this.look.decorations);
      } else {
        tile.button.setAttribute('aria-pressed', String(this.look[slot] === id));
        // Outfit tiles show the item with the rest of the current outfit.
        drawDressedFrog(canvas, { ...this.look, [slot]: id });
      }
    }

    const names =
      this.tab === 'pond'
        ? [PONDS.find((p) => p.id === this.look.pond)?.name]
        : [
            HATS.find((h) => h.id === this.look.hat)?.name,
            FACES.find((f) => f.id === this.look.face)?.name,
          ];
    const shown = names.filter(Boolean);
    this.caption.textContent = shown.length ? shown.join(' · ') : 'Just the frog';
  }
}

/** A still of the whole pond, built with the same code as the real one. */
function drawPondThumbnail(
  canvas: HTMLCanvasElement,
  id: PondId,
  decorations: readonly DecorationId[],
): void {
  const pond = new Pond();
  pond.setLook(id, decorations);
  pond.build(canvas.width, canvas.height);
  pond.draw(canvas.getContext('2d')!, 0);
}

/** One decoration on a slice of the current pond's sky, water and grass. */
function drawDecorationSwatch(canvas: HTMLCanvasElement, id: DecorationId, pond: PondId): void {
  const colors = POND_THEMES[pond].colors;
  const g = canvas.getContext('2d')!;
  const paint: Paint = (color, x, y, w = 1, h = 1) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  const { width, height, waterTop, groundY } = SWATCH;
  paint(colors.skyLow, 0, 0, width, waterTop);
  paint(colors.water, 0, waterTop, width, groundY - waterTop);
  paint(colors.grass, 0, groundY, width, height - groundY);
  paint(colors.grassTop, 0, groundY, width, 1);
  const art = DECORATION_ART[id];
  art.draw(paint, Math.floor(width / 2), decorationBase(art.placement, SWATCH), colors, g);
}
