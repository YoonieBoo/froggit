// Everything about selling packs lives here: where to buy, and how a key is checked.
//
// Keys are checked offline against PUBLIC_KEY (see src/host/license.ts). The
// matching private key stays on the seller's computer (~/.froggit) and is used
// by `npm run license-keys` to make the keys uploaded to Payhip.

import { PACKS, type PackId } from '../shared/customization';
import { verifyLicenseKey } from './license';

export interface PackListing {
  /** The page where the pack is bought. Empty until the product is live. */
  checkoutUrl: string;
}

export const LISTINGS: Record<PackId, PackListing> = {
  holiday: { checkoutUrl: 'https://payhip.com/b/DU13o' },
};

/** The seller's public key: safe to ship. Set by `npm run license-keys -- init`. */
export const PUBLIC_KEY = 'Bfj94BvFmL5w5t1r4lUmSA9oRocnvUqdMErK/bcsAAM=';

export type ActivationResult = { ok: true } | { ok: false; message: string };

/** Checks a license key, offline. Nothing is sent anywhere. */
export async function activateLicense(pack: PackId, key: string): Promise<ActivationResult> {
  const unlocks = verifyLicenseKey(key, PUBLIC_KEY);
  const name = PACKS.find((p) => p.id === pack)!.name;
  if (unlocks === pack) return { ok: true };
  if (unlocks) {
    const other = PACKS.find((p) => p.id === unlocks)!.name;
    return { ok: false, message: `That key is for the ${other}, not the ${name}.` };
  }
  return {
    ok: false,
    message: `That doesn't look like a ${name} key. Copy the whole key from the How to unlock PDF and try again.`,
  };
}
