import { createHash, createHmac, randomBytes } from 'node:crypto';
import { db, query } from '@/lib/db';

// Server-side vendor sessions (AUTH.md auth Phase 1). The cookie carries an
// opaque token; the database stores only its hash and owns revocation, sliding
// expiry and the device list. Nothing in this module is wired into the live
// routes yet: the legacy HMAC cookie in lib/vendor-auth.ts remains the source of
// truth until the Phase 1 cutover.

export const VENDOR_SESSION_COOKIE = 'ska_vendor';
export const SESSION_IDLE_DAYS_DEFAULT = 30;
export const SESSION_ABSOLUTE_DAYS = 365;
export const SHARED_DEVICE_IDLE_SECONDS = 12 * 60 * 60;
export const MAX_ACTIVE_SESSIONS = 10;

const TOUCH_INTERVAL_SECONDS = 60 * 60;
const MAX_TOKEN_LENGTH = 200;
const MAX_USER_AGENT_LENGTH = 300;

export type SessionMeta = {
  userAgent?: string | null;
  ip?: string | null;
  deviceLabel?: string | null;
};

export type CreatedSession = {
  id: string;
  token: string;
  expiresAt: Date;
  absoluteExpiresAt: Date;
};

export type FoundSession = {
  id: string;
  vendorId: string;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  lastSeenAt: Date;
};

export type SessionSummary = {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  deviceLabel: string | null;
  userAgent: string | null;
};

export type RevokeReason = 'user' | 'all' | 'cap' | 'admin';

function secret(): string | null {
  const value = process.env.AUTH_SECRET?.trim();
  return value || null;
}

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// IPv4 is enumerable, so a plain SHA-256 of an address is not private. HMAC
// with the server secret keeps the value useful for correlation without making
// the address recoverable from a database dump.
export function hashIp(ip: string | null | undefined): string | null {
  const value = ip?.trim();
  if (!value) return null;
  const key = secret();
  if (!key) return null;
  return createHmac('sha256', key).update(value).digest('hex');
}

export function describeUserAgent(userAgent: string | null | undefined): string | null {
  const ua = userAgent?.trim();
  if (!ua) return null;
  const lower = ua.toLowerCase();

  const device = /iphone/.test(lower)
    ? 'iPhone'
    : /ipad/.test(lower)
      ? 'iPad'
      : /android/.test(lower)
        ? 'Android'
        : /windows/.test(lower)
          ? 'Windows'
          : /mac os|macintosh/.test(lower)
            ? 'Mac'
            : /linux/.test(lower)
              ? 'Linux'
              : null;

  const browser = /edg\//.test(lower)
    ? 'Edge'
    : /chrome|crios/.test(lower)
      ? 'Chrome'
      : /firefox|fxios/.test(lower)
        ? 'Firefox'
        : /safari/.test(lower)
          ? 'Safari'
          : null;

  if (browser && device) return `${browser} on ${device}`;
  return browser ?? device ?? 'Unknown device';
}

async function vendorIdleDays(vendorId: string): Promise<number> {
  const rows = await query<{ session_idle_days: number }>(
    'select session_idle_days from vendors where id = $1 limit 1',
    [vendorId],
  );
  const days = rows[0]?.session_idle_days;
  return typeof days === 'number' && Number.isFinite(days) && days >= 1 && days <= 365
    ? days
    : SESSION_IDLE_DAYS_DEFAULT;
}

// Creates a session row and returns the raw token exactly once. The caller is
// responsible for putting it in an HttpOnly cookie.
//
// idleSeconds overrides the vendor preference (tests and shared-device mode);
// persistent:false caps the session at 12 hours even if the vendor prefers 30
// days, because a shared shop phone should not stay signed in for a month.
export async function createVendorSession(
  vendorId: string,
  meta: SessionMeta = {},
  options: { persistent?: boolean; idleSeconds?: number } = {},
): Promise<CreatedSession> {
  const configuredSeconds =
    options.idleSeconds ??
    (options.persistent === false
      ? SHARED_DEVICE_IDLE_SECONDS
      : (await vendorIdleDays(vendorId)) * 24 * 60 * 60);

  const absoluteSeconds =
    options.persistent === false
      ? SHARED_DEVICE_IDLE_SECONDS
      : SESSION_ABSOLUTE_DAYS * 24 * 60 * 60;
  const idleSeconds = Math.min(Math.max(configuredSeconds, 60), absoluteSeconds);
  const token = newSessionToken();
  const tokenHash = hashSessionToken(token);
  const userAgent = meta.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) ?? null;
  const deviceLabel = meta.deviceLabel?.slice(0, 120) ?? describeUserAgent(userAgent);
  const ipHash = hashIp(meta.ip);

  const client = await db().connect();
  try {
    await client.query('begin');
    const { rows } = await client.query<{
      id: string;
      expires_at: Date;
      absolute_expires_at: Date;
    }>(
      `insert into vendor_session
         (vendor_id, token_hash, expires_at, absolute_expires_at, user_agent, ip_hash, device_label)
       values
         ($1, $2,
          now() + make_interval(secs => $3),
          now() + make_interval(secs => $4),
          $5, $6, $7)
       returning id, expires_at, absolute_expires_at`,
      [vendorId, tokenHash, idleSeconds, absoluteSeconds, userAgent, ipHash, deviceLabel],
    );

    // Bound the device list. The oldest session is revoked, not deleted, so
    // support can still see it until the cleanup job removes it.
    await client.query(
      `update vendor_session
          set revoked_at = now(), revoked_reason = 'cap'
        where id in (
          select id from vendor_session
           where vendor_id = $1 and revoked_at is null
           order by last_seen_at desc
           offset $2
        )`,
      [vendorId, MAX_ACTIVE_SESSIONS],
    );

    await client.query('commit');
    const row = rows[0];
    if (!row) throw new Error('vendor session insert returned no row');
    return {
      id: row.id,
      token,
      expiresAt: row.expires_at,
      absoluteExpiresAt: row.absolute_expires_at,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function findVendorSession(
  token: string | null | undefined,
): Promise<FoundSession | null> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const rows = await query<{
    id: string;
    vendor_id: string;
    expires_at: Date;
    absolute_expires_at: Date;
    last_seen_at: Date;
  }>(
    `select id, vendor_id, expires_at, absolute_expires_at, last_seen_at
       from vendor_session
      where token_hash = $1
        and revoked_at is null
        and expires_at > now()
        and absolute_expires_at > now()
      limit 1`,
    [hashSessionToken(token)],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    vendorId: row.vendor_id,
    expiresAt: row.expires_at,
    absoluteExpiresAt: row.absolute_expires_at,
    lastSeenAt: row.last_seen_at,
  };
}

// Slides the idle expiry, but writes at most once an hour per session so a
// dashboard visit is not a write on every request. Best-effort by design: the
// caller should log a failure and keep serving the page.
export async function touchVendorSession(
  sessionId: string,
  idleSeconds?: number,
): Promise<boolean> {
  if (idleSeconds !== undefined) {
    const seconds = Math.min(
      Math.max(Math.floor(idleSeconds), 60),
      SESSION_ABSOLUTE_DAYS * 24 * 60 * 60,
    );
    const result = await query<{ id: string }>(
      `update vendor_session
          set last_seen_at = now(),
              expires_at = least(now() + make_interval(secs => $2), absolute_expires_at)
        where id = $1
          and revoked_at is null
          and last_seen_at < now() - make_interval(secs => $3)
        returning id`,
      [sessionId, seconds, TOUCH_INTERVAL_SECONDS],
    );
    return result.length > 0;
  }

  // No override: use the vendor's current preference. A shared-device session
  // cannot slide past its absolute expiry (12 hours), so this is still bounded.
  const result = await query<{ id: string }>(
    `update vendor_session vs
        set last_seen_at = now(),
            expires_at = least(
              now() + make_interval(days => coalesce(v.session_idle_days, 30)),
              vs.absolute_expires_at
            )
       from vendors v
      where vs.id = $1
        and v.id = vs.vendor_id
        and vs.revoked_at is null
        and vs.last_seen_at < now() - make_interval(secs => $2)
      returning vs.id`,
    [sessionId, TOUCH_INTERVAL_SECONDS],
  );
  return result.length > 0;
}

export async function listVendorSessions(vendorId: string): Promise<SessionSummary[]> {
  const rows = await query<{
    id: string;
    created_at: Date;
    last_seen_at: Date;
    expires_at: Date;
    device_label: string | null;
    user_agent: string | null;
  }>(
    `select id, created_at, last_seen_at, expires_at, device_label, user_agent
       from vendor_session
      where vendor_id = $1
        and revoked_at is null
        and expires_at > now()
        and absolute_expires_at > now()
      order by last_seen_at desc
      limit 20`,
    [vendorId],
  );
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    deviceLabel: row.device_label,
    userAgent: row.user_agent,
  }));
}

export async function countActiveSessions(vendorId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    `select count(*)::text as count
       from vendor_session
      where vendor_id = $1
        and revoked_at is null
        and expires_at > now()
        and absolute_expires_at > now()`,
    [vendorId],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function revokeVendorSession(
  vendorId: string,
  sessionId: string,
  reason: RevokeReason = 'user',
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `update vendor_session
        set revoked_at = now(), revoked_reason = $3
      where id = $2
        and vendor_id = $1
        and revoked_at is null
      returning id`,
    [vendorId, sessionId, reason],
  );
  return rows.length > 0;
}

export async function revokeAllVendorSessions(
  vendorId: string,
  reason: RevokeReason = 'all',
): Promise<number> {
  const rows = await query<{ id: string }>(
    `update vendor_session
        set revoked_at = now(), revoked_reason = $2
      where vendor_id = $1
        and revoked_at is null
      returning id`,
    [vendorId, reason],
  );
  return rows.length;
}
