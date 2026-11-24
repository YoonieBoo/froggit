import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  formatLicenseKey,
  licenseMessage,
  parseLicenseKey,
  randomSerial,
  verifyLicenseKey,
} from '../src/host/license';

// A throwaway key pair, standing in for the seller's real one.
function keyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x!, 'base64url').toString('base64');
  const makeKey = (serial = randomSerial(randomBytes)) =>
    formatLicenseKey('holiday', serial, sign(null, licenseMessage('holiday', serial), privateKey));
  return { publicKey: raw, makeKey };
}

describe('license keys', () => {
  const seller = keyPair();

  it('accepts a genuine key', () => {
    assert.equal(verifyLicenseKey(seller.makeKey(), seller.publicKey), 'holiday');
  });

  it('fits Payhip limits and reads cleanly', () => {
    const key = seller.makeKey();
    assert.ok(key.length <= 100, `${key.length} characters`);
    assert.match(key, /^FGH1-[A-Z2-9]{6}-/);
  });

  it('ignores spaces and line breaks from a pasted email', () => {
    const key = seller.makeKey();
    const messy = `  ${key.slice(0, 30)}\n${key.slice(30, 60)} \r\n${key.slice(60)}  `;
    assert.equal(verifyLicenseKey(messy, seller.publicKey), 'holiday');
  });

  it('rejects edited, made-up and other sellers’ keys', () => {
    const key = seller.makeKey('ABCDEF');
    const otherSerial = key.replace('ABCDEF', 'ABCDEG');
    assert.equal(verifyLicenseKey(otherSerial, seller.publicKey), null);
    const middle = 40;
    const flipped = key.slice(0, middle) + (key[middle] === 'A' ? 'B' : 'A') + key.slice(middle + 1);
    assert.equal(verifyLicenseKey(flipped, seller.publicKey), null);
    // The last character only carries 2 bits; other spellings of it are refused too.
    const last = key.at(-1)!;
    const respelled = key.slice(0, -1) + (last === 'A' ? 'B' : String.fromCharCode(last.charCodeAt(0) + 1));
    assert.equal(verifyLicenseKey(respelled, seller.publicKey), null);
    assert.equal(verifyLicenseKey(keyPair().makeKey(), seller.publicKey), null);
  });

  it('rejects junk without throwing', () => {
    for (const junk of ['', 'hello', 'FGH1-ABCDEF-short', 'FGX1-ABCDEF-' + 'A'.repeat(86), '🐸'.repeat(50)]) {
      assert.equal(verifyLicenseKey(junk, seller.publicKey), null, junk);
    }
    assert.equal(verifyLicenseKey(seller.makeKey(), ''), null);
    assert.equal(verifyLicenseKey(seller.makeKey(), 'not-a-key'), null);
  });

  it('reads the pack from the prefix', () => {
    assert.equal(parseLicenseKey(seller.makeKey())?.pack, 'holiday');
  });
});
