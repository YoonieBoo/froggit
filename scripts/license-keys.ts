// Makes license keys for paid packs. Run from the project folder:
//
//   npm run license-keys -- init                        once: create the signing key
//   npm run license-keys -- make holiday 1000           a batch of keys for Payhip
//
// Everything secret lives in ~/.froggit, outside the project, so it can never be
// committed. Back up ~/.froggit/license-signing-key.pem somewhere safe: without
// it you can't make more keys, and anyone who has it can make keys.

import { createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, sign } from 'crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { formatLicenseKey, licenseMessage, parseLicenseKey, randomSerial } from '../src/host/license';
import { PACKS, type PackId } from '../src/shared/customization';

const HOME = join(homedir(), '.froggit');
const SIGNING_KEY = join(HOME, 'license-signing-key.pem');
const KEYS_DIR = join(HOME, 'keys');
const PAYHIP_MAX_PER_UPLOAD = 10_000;

function publicKeyBase64(privatePem: string): string {
  const jwk = createPublicKey(createPrivateKey(privatePem)).export({ format: 'jwk' });
  return Buffer.from(jwk.x!, 'base64url').toString('base64');
}

function init(): void {
  if (existsSync(SIGNING_KEY)) {
    console.log(`A signing key already exists at ${SIGNING_KEY}. Not replacing it.`);
    console.log(`Its public key: ${publicKeyBase64(readFileSync(SIGNING_KEY, 'utf8'))}`);
    return;
  }
  mkdirSync(HOME, { recursive: true, mode: 0o700 });
  const { privateKey } = generateKeyPairSync('ed25519');
  const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  writeFileSync(SIGNING_KEY, pem, { mode: 0o600 });
  chmodSync(SIGNING_KEY, 0o600);
  console.log(`Signing key saved to ${SIGNING_KEY} (only your user can read it).`);
  console.log('Back it up somewhere safe, like a password manager. Never share or commit it.');
  console.log(`Public key for src/host/store.ts: ${publicKeyBase64(pem)}`);
}

/** Serials already handed out, so a new batch never repeats a key. */
function issuedSerials(): Set<string> {
  const seen = new Set<string>();
  if (!existsSync(KEYS_DIR)) return seen;
  for (const file of readdirSync(KEYS_DIR).filter((f) => f.endsWith('.txt'))) {
    for (const line of readFileSync(join(KEYS_DIR, file), 'utf8').split('\n')) {
      const key = parseLicenseKey(line);
      if (key) seen.add(`${key.pack}:${key.serial}`);
    }
  }
  return seen;
}

function make(pack: PackId, count: number): void {
  if (!existsSync(SIGNING_KEY)) throw new Error('No signing key yet. Run: npm run license-keys -- init');
  const privateKey = createPrivateKey(readFileSync(SIGNING_KEY, 'utf8'));
  const seen = issuedSerials();
  const keys: string[] = [];
  while (keys.length < count) {
    const serial = randomSerial(randomBytes);
    if (seen.has(`${pack}:${serial}`)) continue;
    seen.add(`${pack}:${serial}`);
    keys.push(formatLicenseKey(pack, serial, sign(null, licenseMessage(pack, serial), privateKey)));
  }
  mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const file = join(KEYS_DIR, `${pack}-${stamp}-${count}.txt`);
  writeFileSync(file, keys.join('\n') + '\n', { mode: 0o600 });
  console.log(`${count} ${pack} keys saved to ${file}`);
  console.log('Upload that file to the product on Payhip ("From a list"). Keep the file: it is your record of keys sold.');
}

const [command, packArg, countArg] = process.argv.slice(2);
if (command === 'init') {
  init();
} else if (command === 'make') {
  const pack = PACKS.find((p) => p.id === packArg)?.id;
  const count = Number(countArg);
  if (!pack) throw new Error(`Unknown pack "${packArg}". Packs: ${PACKS.map((p) => p.id).join(', ')}`);
  if (!Number.isInteger(count) || count < 1 || count > PAYHIP_MAX_PER_UPLOAD) {
    throw new Error(`Count must be a whole number from 1 to ${PAYHIP_MAX_PER_UPLOAD} (Payhip's limit per upload).`);
  }
  make(pack, count);
} else {
  console.log('Usage: npm run license-keys -- init | make <pack> <count>');
}
