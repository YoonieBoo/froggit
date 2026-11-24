// License keys for paid packs. No `vscode` import, so it can be unit tested and
// shared with the key-making script (scripts/license-keys.ts).
//
// A key is a short serial plus an Ed25519 signature over it, made with a private
// key that only the seller has. Froggit checks the signature offline with the
// matching public key, so nothing is sent anywhere and keys can't be made up.
//
// Format: FG<pack letter>1-<serial>-<signature>
//   FGH1-AB3XK7-<86 characters>   (98 characters in all, under Payhip's 100 limit)

import { createPublicKey, verify } from 'crypto';
import type { PackId } from '../shared/customization';

/** One letter per pack, used in the key prefix. Never reuse a letter. */
export const PACK_LETTERS: Record<PackId, string> = { holiday: 'H' };

const SERIAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
export const SERIAL_LENGTH = 6;
const KEY_PATTERN = /^FG([A-Z])1-([A-Z2-9]{6})-([A-Za-z0-9_-]{86})$/;

export interface ParsedKey {
  pack: PackId;
  serial: string;
  signature: Uint8Array;
}

/** What gets signed. Includes the pack, so a key for one pack can't unlock another. */
export function licenseMessage(pack: PackId, serial: string): Uint8Array {
  return new TextEncoder().encode(`froggit-license:v1:${pack}:${serial}`);
}

/** Reads a key as pasted: spaces and line breaks from an email are ignored. */
export function parseLicenseKey(text: string): ParsedKey | null {
  const match = KEY_PATTERN.exec(text.replace(/\s+/g, ''));
  if (!match) return null;
  const pack = (Object.keys(PACK_LETTERS) as PackId[]).find((p) => PACK_LETTERS[p] === match[1]);
  if (!pack) return null;
  const signature = fromBase64Url(match[3]);
  // Only the standard spelling: otherwise one key could be written several ways.
  if (toBase64Url(signature) !== match[3]) return null;
  return { pack, serial: match[2], signature };
}

export function formatLicenseKey(pack: PackId, serial: string, signature: Uint8Array): string {
  return `FG${PACK_LETTERS[pack]}1-${serial}-${toBase64Url(signature)}`;
}

/** A random serial for a new key. */
export function randomSerial(randomBytes: (n: number) => Uint8Array): string {
  return [...randomBytes(SERIAL_LENGTH)].map((b) => SERIAL_ALPHABET[b % SERIAL_ALPHABET.length]).join('');
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function fromBase64Url(text: string): Uint8Array {
  return new Uint8Array(Buffer.from(text, 'base64url'));
}

/**
 * Checks a pasted key against the seller's public key (32 raw bytes, base64).
 * Returns the pack it unlocks, or null if the key isn't genuine.
 */
export function verifyLicenseKey(text: string, publicKeyBase64: string): PackId | null {
  const key = parseLicenseKey(text);
  if (!key || !publicKeyBase64) return null;
  try {
    // Wrap the raw Ed25519 key in the standard header Node expects.
    const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKeyBase64, 'base64')]);
    const publicKey = createPublicKey({ key: spki, format: 'der', type: 'spki' });
    return verify(null, licenseMessage(key.pack, key.serial), publicKey, key.signature) ? key.pack : null;
  } catch {
    return null;
  }
}
