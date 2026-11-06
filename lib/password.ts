import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// scrypt with the Node defaults (N=16384, r=8, p=1) and a per-password salt.
// Stored as `scrypt$<salt hex>$<hash hex>` so the format is self-describing.
const SALT_BYTES = 16;
const KEY_BYTES = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(password, salt, KEY_BYTES);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length === 0) return false;
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
