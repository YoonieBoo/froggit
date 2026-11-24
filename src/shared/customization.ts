// The frog's look (what it wears) and its pond. Saved by the host, drawn by the webview.
// Pure: no `vscode` import, so it can be unit tested and shared by both sides.
//
// To add an item: add an entry here, then its art (accessories in
// src/webview/sprites/accessories.ts, ponds in src/webview/pondThemes.ts,
// decorations in src/webview/decorations.ts).
// The art tables are keyed by these ids, so missing art is a compile error.
//
// Items with a `collection` show on that collection's own tab in the wardrobe.
// Items marked `paid` are locked until the collection's pack is bought.

/** Packs that can be bought. Each unlocks the paid items of the same collection. */
export const PACKS = [{ id: 'holiday', name: 'Holiday Pack' }] as const;
export type PackId = (typeof PACKS)[number]['id'];

export const HATS = [
  { id: 'mushroom', name: 'Mushroom Hat' },
  { id: 'crown', name: 'Golden Crown' },
  { id: 'wizard', name: 'Wizard Hat' },
  { id: 'cap', name: 'Baseball Cap' },
  { id: 'santa', name: 'Santa Hat', collection: 'holiday' }, // free for everyone
  { id: 'antlers', name: 'Reindeer Antlers', collection: 'holiday', paid: true },
  { id: 'party-hat', name: 'Party Hat', collection: 'holiday', paid: true },
] as const;

export const FACES = [
  { id: 'round-glasses', name: 'Round Glasses' },
  { id: 'sunglasses', name: 'Sunglasses' },
  { id: 'party-glasses', name: 'Party Glasses', collection: 'holiday', paid: true },
] as const;

/** Worn below the face: beards now, maybe scarves or bow ties later. */
export const EXTRAS = [
  { id: 'santa-beard', name: 'Santa Beard', collection: 'holiday', paid: true },
] as const;

export const PONDS = [
  { id: 'classic', name: 'Classic Pond' },
  { id: 'moonlight', name: 'Moonlight Pond' },
  { id: 'sakura', name: 'Sakura Pond' },
  { id: 'autumn', name: 'Autumn Pond' },
  { id: 'snowy', name: 'Snowy Pond', collection: 'holiday', paid: true },
  { id: 'fireworks', name: 'Fireworks Pond', collection: 'holiday', paid: true },
] as const;

/** Each decoration has its own fixed spot in the pond, so they can't overlap. */
export const DECORATIONS = [
  { id: 'flowers', name: 'Flower Patch' },
  { id: 'lantern', name: 'Lantern' },
  { id: 'lily-flower', name: 'Lily Pad Flower' },
  { id: 'rocks', name: 'Shore Rocks' },
  { id: 'mushrooms', name: 'Mushrooms' },
] as const;

export type HatId = (typeof HATS)[number]['id'];
export type FaceId = (typeof FACES)[number]['id'];
export type ExtraId = (typeof EXTRAS)[number]['id'];
export type PondId = (typeof PONDS)[number]['id'];
export type DecorationId = (typeof DECORATIONS)[number]['id'];

/** What every item has in common, whatever its slot. */
export interface ItemInfo {
  id: string;
  name: string;
  collection?: PackId;
  paid?: boolean;
}

const ALL_ITEMS: readonly ItemInfo[] = [...HATS, ...FACES, ...EXTRAS, ...PONDS, ...DECORATIONS];

export function itemInfo(id: string): ItemInfo | undefined {
  return ALL_ITEMS.find((item) => item.id === id);
}

/** True for free items, and for paid ones whose pack has been bought. */
export function isUnlocked(id: string, owned: readonly PackId[]): boolean {
  const item = itemInfo(id);
  return !item?.paid || (!!item.collection && owned.includes(item.collection));
}

export const DEFAULT_POND: PondId = 'classic';

export interface Customization {
  v: 1;
  /** null = no hat */
  hat: HatId | null;
  /** null = nothing on the face */
  face: FaceId | null;
  /** null = no extras */
  extra: ExtraId | null;
  pond: PondId;
  /** Decorations that are switched on, in registry order. */
  decorations: DecorationId[];
}

export function defaultCustomization(): Customization {
  return { v: 1, hat: null, face: null, extra: null, pond: DEFAULT_POND, decorations: [] };
}

/**
 * Turns whatever is in storage (or sent by the webview) into a valid Customization.
 * Unknown item ids, e.g. from a newer version of Froggit, fall back to "none".
 */
export function migrateCustomization(raw: unknown): Customization {
  const fresh = defaultCustomization();
  if (typeof raw !== 'object' || raw === null) return fresh;
  const record = raw as Record<string, unknown>;
  if (record.v !== 1) return fresh;
  return {
    v: 1,
    hat: pickId(HATS, record.hat),
    face: pickId(FACES, record.face),
    extra: pickId(EXTRAS, record.extra),
    pond: pickId(PONDS, record.pond) ?? DEFAULT_POND,
    decorations: pickIds(DECORATIONS, record.decorations),
  };
}

/**
 * Takes off anything that isn't unlocked. The host runs this on every look it
 * loads or receives, so the webview can't wear a paid item it doesn't own.
 */
export function withoutLocked(look: Customization, owned: readonly PackId[]): Customization {
  const keep = <T extends string>(id: T | null) => (id && isUnlocked(id, owned) ? id : null);
  return {
    ...look,
    hat: keep(look.hat),
    face: keep(look.face),
    extra: keep(look.extra),
    pond: isUnlocked(look.pond, owned) ? look.pond : DEFAULT_POND,
    decorations: look.decorations.filter((id) => isUnlocked(id, owned)),
  };
}

/** Turns a stored list of bought packs into a clean one. */
export function migrateOwned(raw: unknown): PackId[] {
  return pickIds(PACKS, raw);
}

/** The valid ids in `value`, once each, in registry order. */
function pickIds<Id extends string>(items: readonly { id: Id }[], value: unknown): Id[] {
  if (!Array.isArray(value)) return [];
  return items.filter((item) => value.includes(item.id)).map((item) => item.id);
}

function pickId<Id extends string>(items: readonly { id: Id }[], value: unknown): Id | null {
  return items.find((item) => item.id === value)?.id ?? null;
}
