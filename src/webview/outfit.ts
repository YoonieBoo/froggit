import type { Customization, FaceId, HatId } from '../shared/customization';
import { makeSprite, type Sprite } from './renderer';
import { FACE_ART, HAT_ART, type AccessoryArt } from './sprites/accessories';

export interface Accessory {
  sprite: Sprite;
  /** Offset of the sprite's top-left from the frog's head anchor. */
  dx: number;
  dy: number;
}

export interface Outfit {
  hat: Accessory | null;
  face: Accessory | null;
}

const cache = new Map<AccessoryArt, Accessory>();

function toAccessory(art: AccessoryArt): Accessory {
  let accessory = cache.get(art);
  if (!accessory) {
    accessory = { sprite: makeSprite(art.rows), dx: art.dx, dy: art.dy };
    cache.set(art, accessory);
  }
  return accessory;
}

export const hatAccessory = (id: HatId): Accessory => toAccessory(HAT_ART[id]);
export const faceAccessory = (id: FaceId): Accessory => toAccessory(FACE_ART[id]);

export function outfitFor(look: Customization): Outfit {
  return {
    hat: look.hat ? hatAccessory(look.hat) : null,
    face: look.face ? faceAccessory(look.face) : null,
  };
}
