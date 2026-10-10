// The frog's look (what it wears) and its pond. Saved by the host, drawn by the webview.
// Pure: no `vscode` import, so it can be unit tested and shared by both sides.
//
// To add an item: add an entry here, then its art (accessories in
// src/webview/sprites/accessories.ts, ponds in src/webview/pondThemes.ts,
// decorations in src/webview/decorations.ts).
// The art tables are keyed by these ids, so missing art is a compile error.

export const HATS = [
  { id: 'mushroom', name: 'Mushroom Hat' },
  { id: 'crown', name: 'Golden Crown' },
  { id: 'wizard', name: 'Wizard Hat' },
  { id: 'cap', name: 'Baseball Cap' },
] as const;

export const FACES = [
  { id: 'round-glasses', name: 'Round Glasses' },
  { id: 'sunglasses', name: 'Sunglasses' },
] as const;

export const PONDS = [
  { id: 'classic', name: 'Classic Pond' },
  { id: 'moonlight', name: 'Moonlight Pond' },
  { id: 'sakura', name: 'Sakura Pond' },
  { id: 'autumn', name: 'Autumn Pond' },
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
export type PondId = (typeof PONDS)[number]['id'];
export type DecorationId = (typeof DECORATIONS)[number]['id'];

export const DEFAULT_POND: PondId = 'classic';

export interface Customization {
  v: 1;
  /** null = no hat */
  hat: HatId | null;
  /** null = nothing on the face */
  face: FaceId | null;
  pond: PondId;
  /** Decorations that are switched on, in registry order. */
  decorations: DecorationId[];
}

export function defaultCustomization(): Customization {
  return { v: 1, hat: null, face: null, pond: DEFAULT_POND, decorations: [] };
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
    pond: pickId(PONDS, record.pond) ?? DEFAULT_POND,
    decorations: pickIds(DECORATIONS, record.decorations),
  };
}

/** The valid ids in `value`, once each, in registry order. */
function pickIds<Id extends string>(items: readonly { id: Id }[], value: unknown): Id[] {
  if (!Array.isArray(value)) return [];
  return items.filter((item) => value.includes(item.id)).map((item) => item.id);
}

function pickId<Id extends string>(items: readonly { id: Id }[], value: unknown): Id | null {
  return items.find((item) => item.id === value)?.id ?? null;
}
