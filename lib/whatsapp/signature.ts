import { createHmac, timingSafeEqual } from 'node:crypto';

// Meta signs the raw request body with the app secret. Compare digests without
// leaking length, and reject anything that is not sha256.
export function verifyWhatsappSignature(
  rawBody: string,
  header: string | null,
  appSecret: string | null,
): boolean {
  if (!appSecret || !header?.startsWith('sha256=')) return false;

  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const received = header.slice('sha256='.length);

  if (received.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
}

// WhatsApp numbers arrive as digits with a country code, no plus.
export function toE164(raw: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}
