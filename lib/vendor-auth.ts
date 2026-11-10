import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Vendor sessions are stateless: an HMAC over the vendor id and an expiry.
// AUTH_SECRET is the signing key. No passwords, per AUTH-01.
export const VENDOR_COOKIE = 'ska_vendor';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string | null {
  const value = process.env.AUTH_SECRET?.trim();
  return value || null;
}

export function authEnabled(): boolean {
  return secret() !== null;
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export function createSessionToken(vendorId: string): string {
  const key = secret();
  if (!key) throw new Error('AUTH_SECRET is not set');
  const expires = Date.now() + SESSION_TTL_MS;
  const signature = sign(`${vendorId}.${expires}`, key);
  return `${vendorId}.${expires}.${signature}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  const key = secret();
  if (!key || !token) return null;

  const [vendorId, expiresRaw, signature] = token.split('.');
  if (!vendorId || !expiresRaw || !signature) return null;

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;

  const expected = Buffer.from(sign(`${vendorId}.${expiresRaw}`, key));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return vendorId;
}

// The single place that writes the vendor session cookie, so the attributes and
// lifetime cannot drift between call sites. maxAge is derived from
// SESSION_TTL_MS so the cookie never outlives (or dies before) the signed token.
// persist=false yields a session cookie that dies on browser close, for the
// shared-device case.
export async function setVendorSessionCookie(
  vendorId: string,
  options: { persist: boolean },
): Promise<void> {
  const store = await cookies();
  store.set(VENDOR_COOKIE, createSessionToken(vendorId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(options.persist ? { maxAge: SESSION_TTL_MS / 1000 } : {}),
  });
}

export async function currentVendorId(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(VENDOR_COOKIE)?.value);
}

export async function requireVendor(): Promise<string> {
  if (!authEnabled()) redirect('/auth/login?disabled=1');
  const id = await currentVendorId();
  if (!id) redirect('/auth/login');
  return id;
}
