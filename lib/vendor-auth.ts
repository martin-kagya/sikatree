import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  createVendorSession,
  findVendorSession,
  revokeVendorSession,
  touchVendorSession,
} from '@/lib/session';

// Vendor sessions are server-side rows in vendor_session (AUTH.md auth Phase 1).
// The cookie carries an opaque 256-bit token; only its hash is stored. The old
// HMAC cookie format is still accepted for one release so the cutover does not
// sign every existing vendor out. AUTH_SECRET is the signing key for the legacy
// format and for hashed IPs. No passwords, per AUTH-01.

export const VENDOR_COOKIE = 'ska_vendor';
const LEGACY_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

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

// Legacy stateless token, kept only so a cookie issued before the cutover keeps
// working until it expires. Do not use it for new sessions.
export function createSessionToken(vendorId: string): string {
  const key = secret();
  if (!key) throw new Error('AUTH_SECRET is not set');
  const expires = Date.now() + LEGACY_SESSION_TTL_MS;
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

function requestMeta(requestHeaders: Headers): { userAgent: string | null; ip: string | null } {
  const forwarded = requestHeaders.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || null;
  return { userAgent: requestHeaders.get('user-agent'), ip };
}

// The single place that creates a session row and writes the cookie, so the
// attributes and lifetime cannot drift between call sites. persist=false is a
// browser-session cookie with a 12-hour server-side idle and absolute cap, for
// shared shop phones.
export async function setVendorSessionCookie(
  vendorId: string,
  options: { persist: boolean },
): Promise<void> {
  const session = await createVendorSession(
    vendorId,
    requestMeta(await headers()),
    { persistent: options.persist },
  );

  const store = await cookies();
  store.set(VENDOR_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(options.persist ? { maxAge: COOKIE_MAX_AGE_SECONDS } : {}),
  });
}

export async function clearVendorSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(VENDOR_COOKIE);
}

export type CurrentVendorSession = {
  vendorId: string;
  // null for a legacy HMAC cookie, which has no server-side row to revoke.
  sessionId: string | null;
};

export async function currentSession(): Promise<CurrentVendorSession | null> {
  const token = (await cookies()).get(VENDOR_COOKIE)?.value;
  if (!token) return null;

  let session: Awaited<ReturnType<typeof findVendorSession>> = null;
  try {
    session = await findVendorSession(token);
  } catch (error) {
    // A database outage must not 500 the dashboard. New opaque tokens cannot be
    // validated without the row, so they fail closed; a legacy token can still
    // be checked and keeps working.
    console.error('[auth] session lookup failed', error);
  }

  if (session) {
    // The row was found and is valid. Slide it at most hourly; a touch failure
    // must not turn a valid dashboard request into a 500.
    if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await touchVendorSession(session.id).catch((error) => {
        console.error('[auth] session touch failed', error);
      });
    }
    return { vendorId: session.vendorId, sessionId: session.id };
  }

  // One-release bridge for cookies issued before auth Phase 1.
  const legacyVendorId = verifySessionToken(token);
  return legacyVendorId ? { vendorId: legacyVendorId, sessionId: null } : null;
}

export async function currentVendorId(): Promise<string | null> {
  const session = await currentSession();
  return session?.vendorId ?? null;
}

export async function revokeCurrentVendorSession(): Promise<void> {
  const session = await currentSession();
  if (session?.sessionId) {
    await revokeVendorSession(session.vendorId, session.sessionId, 'user').catch((error) => {
      console.error('[auth] session revoke failed', error);
    });
  }
  await clearVendorSessionCookie();
}

export async function requireVendor(nextPath?: string): Promise<string> {
  if (!authEnabled()) redirect('/auth/login?disabled=1');
  const id = await currentVendorId();
  if (!id) {
    redirect(nextPath ? `/auth/login?next=${encodeURIComponent(nextPath)}` : '/auth/login');
  }
  return id;
}
