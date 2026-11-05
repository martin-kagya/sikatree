import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Single-operator admin gate. The password lives in ADMIN_PASSWORD; the cookie
// is an HMAC over an expiry, so it cannot be forged and self-expires.
export const ADMIN_COOKIE = 'ska_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function secret(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value ? value : null;
}

export function adminEnabled(): boolean {
  return secret() !== null;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function verifyPassword(input: string): boolean {
  const expected = secret();
  if (!expected) return false;
  // Compare digests so the check does not leak the password length.
  return timingSafeEqual(digest(input), digest(expected));
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export function createSessionToken(): string {
  const key = secret();
  if (!key) throw new Error('ADMIN_PASSWORD is not set');
  const expires = Date.now() + SESSION_TTL_MS;
  return `${expires}.${sign(String(expires), key)}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [expiresRaw, signature] = token.split('.');
  if (!expiresRaw || !signature) return false;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  const expected = Buffer.from(sign(expiresRaw, key));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin(): Promise<void> {
  if (!adminEnabled()) redirect('/admin/login?disabled=1');
  if (!(await isAdmin())) redirect('/admin/login');
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'local';
}
