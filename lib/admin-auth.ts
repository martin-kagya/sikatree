import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { verifyPasswordHash } from '@/lib/password';

// Single-operator admin gate. The credential lives in the admin_credential table
// as a salted scrypt hash; the cookie is an HMAC over an expiry keyed by that
// hash, so it cannot be forged and self-expires.
export const ADMIN_COOKIE = 'ska_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type Credential = { passwordHash: string };

async function readCredential(): Promise<Credential | null> {
  const rows = await query<{ password_hash: string }>(
    'select password_hash from admin_credential where id = 1 limit 1',
  ).catch(() => []);
  const stored = rows[0]?.password_hash;
  return stored ? { passwordHash: stored } : null;
}

export async function adminEnabled(): Promise<boolean> {
  return (await readCredential()) !== null;
}

export async function verifyPassword(input: string): Promise<boolean> {
  const credential = await readCredential();
  if (!credential) return false;
  return verifyPasswordHash(input, credential.passwordHash);
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export async function createSessionToken(): Promise<string> {
  const credential = await readCredential();
  if (!credential) throw new Error('Admin credential is not set');
  const expires = Date.now() + SESSION_TTL_MS;
  return `${expires}.${sign(String(expires), credential.passwordHash)}`;
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const credential = await readCredential();
  if (!credential) return false;
  const [expiresRaw, signature] = token.split('.');
  if (!expiresRaw || !signature) return false;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  const expected = Buffer.from(sign(expiresRaw, credential.passwordHash));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin(): Promise<void> {
  if (!(await adminEnabled())) redirect('/admin/login?disabled=1');
  if (!(await isAdmin())) redirect('/admin/login');
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'local';
}
