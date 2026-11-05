import { randomBytes } from 'node:crypto';

// Crockford-style base32 without I, L, O and U: short, uppercase, no ambiguous
// characters, and easy to read back over WhatsApp. Same scheme will be used for
// order and booking codes (ORD-, BKG-).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{6}$/;

export function newReferralCode(): string {
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

// Typed-in codes are forgiving: lowercase, spaces and ambiguous characters
// (I/L -> 1, O -> 0) are accepted. Returns null when it cannot be a code.
export function parseReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
  return CODE_RE.test(cleaned) ? cleaned : null;
}

export function isValidReferralCode(code: string): boolean {
  return CODE_RE.test(code);
}
