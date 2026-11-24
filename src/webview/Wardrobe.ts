import {
  DECORATIONS,
  defaultCustomization,
  DEFAULT_POND,
  EXTRAS,
  FACES,
  HATS,
  isUnlocked,
  itemInfo,
  PONDS,
  type Customization,
  type DecorationId,
  type ItemInfo,
  type PackId,
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

type WearSlot = 'hat' | 'face' | 'extra' | 'pond';
type Slot = WearSlot | 'decoration';
type Tab = 'outfit' | 'pond' | 'holiday';

// A small gold padlock for locked tiles.
const LOCK_ICON = ['.KKK.', 'K...K', 'K...K', 'KOOOK', 'KOKOK', 'KOOOK'];
// A twinkling star on the Holiday tab, so the new pack gets noticed.
const STAR_ICON = [
  '...O...',
  '..OuO..',
  'OOOuOOO',
  '.OOOOq.',
  '..OOq..',
  '.Oq.Oq.',
  'Oq...Oq',
];

/** Everyday items; collection items live on their own tab. */
const everyday = <T extends ItemInfo>(items: readonly T[]) => items.filter((item) => !item.collection);
const inPack = <T extends ItemInfo>(items: readonly T[], pack: PackId) =>
  items.filter((item) => item.collection === pack);

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
const TILE_H = 16; // head and shoulders: where the hats and glasses are
const EXTRA_TILE_H = MIRROR_H - 1; // extras hang lower, so show down to the feet
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
  const { hat, face, extra } = outfitFor(look);
  for (const item of [extra, face, hat]) {
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

/** What the wardrobe asks the host to do. */
export interface WardrobeActions {
  /** A new look was picked: show it and save it. */
  change(look: Customization): void;
  buy(pack: PackId): void;
}

/**
 * The wooden wardrobe button and the board it opens: Outfit and Pond tabs for
 * everyday items, and a Holiday tab for the Holiday Pack. Picking an item
 * applies it immediately; the host saves it and echoes it back through `sync`.
 * Locked items can't be worn, but clicking one tries it on in the mirror.
 */
export class Wardrobe {
  private look = defaultCustomization();
  private owned: PackId[] = [];
  /** A locked item being tried on in the mirror, not worn. */
  private trying: { slot: WearSlot; id: string } | null = null;
  private tab: Tab = 'outfit';
  private readonly openButton = document.getElementById('wardrobe-button') as HTMLButtonElement;
  private readonly board = document.getElementById('wardrobe')!;
  private readonly mirror = element('div', 'mirror');
  private readonly preview = pixelCanvas(FRAME_W, MIRROR_H, PREVIEW_PX);
  private readonly caption = element('span', 'board-caption');
  private readonly packStatus = element('span', 'pack-status');
  private readonly packButtons = element('div', 'pack-buttons');
  private readonly tabs = new Map<Tab, { tab: HTMLButtonElement; panel: HTMLElement }>();
  private readonly tiles: Tile[] = [];

  constructor(private readonly actions: WardrobeActions) {
    skinWoodButton(this.openButton, HANGER_ICON);
    this.board.style.setProperty('--lock', `url("${makeSprite(LOCK_ICON).image.toDataURL()}")`);
    this.board.style.setProperty('--star', `url("${makeSprite(STAR_ICON).image.toDataURL()}")`);
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

  /** Shows which packs are bought, unlocking their items. */
  syncOwned(owned: PackId[]): void {
    this.owned = owned;
    if (this.trying && isUnlocked(this.trying.id, owned)) this.trying = null;
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
    this.trying = null;
    this.openButton.setAttribute('aria-expanded', 'false');
    this.openButton.focus();
  }

  private showTab(tab: Tab): void {
    this.tab = tab;
    this.trying = null;
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

  /** A tile was clicked: wear it, take it off, or (if locked) try it on. */
  private pick(slot: Slot, id: string | null): void {
    if (id !== null && slot !== 'decoration' && !isUnlocked(id, this.owned)) {
      this.trying = this.trying?.id === id ? null : { slot, id };
      this.refresh();
      return;
    }
    this.trying = null;
    if (slot === 'decoration') {
      this.toggleDecoration(id as DecorationId);
      return;
    }
    // The Holiday tab has no "none" tiles, so clicking what's worn takes it off.
    if (this.tab === 'holiday' && id !== null && this.look[slot] === id) {
      id = slot === 'pond' ? DEFAULT_POND : null;
    }
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
    this.actions.change(look);
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
      this.buildShelf('Hats', 'hat', TILE_H, [{ id: null, name: 'No hat' }, ...everyday(HATS)]),
      this.buildShelf('Face', 'face', TILE_H, [{ id: null, name: 'Nothing on the face' }, ...everyday(FACES)]),
    );
    // Every extra so far is in a pack, so this shelf would only hold "No extras".
    // Pack items come off again by clicking them on their own tab.
    if (everyday(EXTRAS).length > 0) {
      outfit.append(
        this.buildShelf('Extras', 'extra', EXTRA_TILE_H, [{ id: null, name: 'No extras' }, ...everyday(EXTRAS)]),
      );
    }

    const pond = element('div', 'shelves');
    const reset = element('button', 'wood-text-button', 'Reset pond');
    reset.title = 'Back to the Classic Pond with no decorations';
    reset.addEventListener('click', () =>
      this.update({ ...this.look, pond: DEFAULT_POND, decorations: [] }),
    );
    pond.append(
      this.buildShelf('Ponds', 'pond', THUMB.h, everyday(PONDS)),
      this.buildShelf('Decorations', 'decoration', TILE_H, DECORATIONS),
      reset,
    );

    const holiday = element('div', 'shelves');
    const pack = element('div', 'pack');
    const buyButton = element('button', 'wood-text-button', 'Buy');
    buyButton.addEventListener('click', () => this.actions.buy('holiday'));
    this.packButtons.append(buyButton);
    pack.append(element('span', 'pack-title', 'Holiday Pack'), this.packStatus, this.packButtons);
    // The pack is small, so its hats, glasses and extras share one shelf.
    holiday.append(
      pack,
      this.buildShelf('Outfits', 'hat', EXTRA_TILE_H, [
        ...inPack(HATS, 'holiday'),
        ...inPack(FACES, 'holiday').map((item) => ({ ...item, slot: 'face' as const })),
        ...inPack(EXTRAS, 'holiday').map((item) => ({ ...item, slot: 'extra' as const })),
      ]),
      this.buildShelf('Ponds', 'pond', THUMB.h, inPack(PONDS, 'holiday')),
    );

    for (const [id, label, panel] of [
      ['outfit', 'Outfit', outfit],
      ['pond', 'Pond', pond],
      ['holiday', 'Holiday', holiday],
    ] as const) {
      const tab = element('button', id === 'holiday' ? 'tab new' : 'tab', label);
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

  /** A labelled row of tiles. Items go in `slot` unless they name their own. */
  private buildShelf(
    label: string,
    shelfSlot: Slot,
    height: number,
    items: readonly { id: string | null; name: string; paid?: boolean; slot?: Slot }[],
  ): HTMLElement {
    const shelf = element('div', 'shelf');
    shelf.setAttribute('role', 'group');
    shelf.setAttribute('aria-label', label);

    const row = element('div', 'shelf-row');
    for (const { id, name, paid, slot = shelfSlot } of items) {
      const button = element('button', id === null ? 'tile none' : 'tile');
      button.title = paid ? `${name} (Holiday Pack)` : name;
      button.setAttribute('aria-label', button.title);
      const canvas = pixelCanvas(slot === 'pond' ? THUMB.w : FRAME_W, height, UI_PX);
      button.append(canvas);
      button.addEventListener('click', () => this.pick(slot, id));
      row.append(button);
      this.tiles.push({ slot, id, button, canvas });
    }

    shelf.append(element('div', 'shelf-label', label), row);
    return shelf;
  }

  // ── Updating ─────────────────────────────────────────────────────────────

  private refresh(): void {
    // The mirror shows what's being tried on, if anything, over the real look.
    const shown = this.trying ? { ...this.look, [this.trying.slot]: this.trying.id } : this.look;
    drawDressedFrog(this.preview, shown);
    const { skyLow, grassTop } = POND_THEMES[shown.pond].colors;
    this.mirror.style.background = skyLow;
    this.mirror.style.boxShadow = `inset 0 -${UI_PX}px 0 ${grassTop}`;

    for (const tile of this.tiles) {
      const { slot, id, canvas, button } = tile;
      const info = id === null ? undefined : itemInfo(id);
      const locked = id !== null && !isUnlocked(id, this.owned);
      button.classList.toggle('locked', locked);
      button.classList.toggle('previewing', this.trying?.id === id);
      button.classList.toggle('free', !!info?.collection && !info.paid);
      if (slot === 'decoration') {
        const on = this.look.decorations.includes(id as DecorationId);
        button.setAttribute('aria-pressed', String(on));
        drawDecorationSwatch(canvas, id as DecorationId, this.look.pond);
      } else if (slot === 'pond') {
        button.setAttribute('aria-pressed', String(this.look.pond === id));
        // Each pond is previewed with the decorations you've picked.
        drawPondThumbnail(canvas, id as PondId, this.look.decorations);
      } else {
        button.setAttribute('aria-pressed', String(this.look[slot] === id));
        // Outfit tiles show the item with the rest of the current outfit.
        drawDressedFrog(canvas, { ...this.look, [slot]: id });
      }
    }

    const owns = this.owned.includes('holiday');
    this.packStatus.textContent = owns ? 'Unlocked. Thank you!' : 'Tap an item to try it on.';
    this.packButtons.hidden = owns;

    this.caption.textContent = this.describe();
  }

  private describe(): string {
    if (this.trying) return `Trying on: ${itemInfo(this.trying.id)?.name}`;
    if (this.tab === 'pond') return itemInfo(this.look.pond)?.name ?? '';
    const names = [this.look.hat, this.look.face, this.look.extra]
      .map((id) => (id ? itemInfo(id)?.name : undefined))
      .filter(Boolean);
    return names.length ? names.join(' · ') : 'Just the frog';
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
