import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import {
  MAX_ACTIVE_SESSIONS,
  countActiveSessions,
  createVendorSession,
  describeUserAgent,
  findVendorSession,
  hashSessionToken,
  listVendorSessions,
  revokeAllVendorSessions,
  revokeVendorSession,
  touchVendorSession,
} from '@/lib/session';

beforeEach(async () => {
  await query(
    'truncate login_code, vendor_session, auth_event, vendors restart identity cascade',
  );
});

afterAll(async () => {
  await db().end();
});

async function seedVendor(sessionIdleDays = 30): Promise<string> {
  const rows = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at, session_idle_days)
     values ('+233241111111', 'Ama Glow', 'amaglow', 'products', 'live', now(), $1)
     returning id`,
    [sessionIdleDays],
  );
  return rows[0].id;
}

describe('vendor sessions', () => {
  it('creates a session and stores only the token hash', async () => {
    const vendorId = await seedVendor();
    const created = await createVendorSession(vendorId, {
      userAgent:
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
      ip: '203.0.113.10',
    });

    expect(created.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const rows = await query<{
      token_hash: string;
      user_agent: string | null;
      device_label: string | null;
      ip_hash: string | null;
    }>('select token_hash, user_agent, device_label, ip_hash from vendor_session');
    expect(rows[0].token_hash).toBe(hashSessionToken(created.token));
    expect(rows[0].token_hash).not.toContain(created.token);
    expect(rows[0].device_label).toBe('Chrome on Android');
    expect(rows[0].ip_hash).toHaveLength(64);
    expect(rows[0].ip_hash).not.toContain('203.0.113.10');
    expect(await findVendorSession(created.token)).toMatchObject({ vendorId });
  });

  it('rejects tampered, expired and revoked tokens', async () => {
    const vendorId = await seedVendor();
    const created = await createVendorSession(vendorId);

    expect(await findVendorSession(`${created.token}x`)).toBeNull();
    expect(await findVendorSession('')).toBeNull();

    await query(
      `update vendor_session
          set expires_at = now() - interval '1 minute',
              absolute_expires_at = now() + interval '1 day'
        where id = $1`,
      [created.id],
    );
    expect(await findVendorSession(created.token)).toBeNull();

    await query(
      `update vendor_session
          set expires_at = now() + interval '1 day',
              absolute_expires_at = now() + interval '2 days'
        where id = $1`,
      [created.id],
    );
    expect(await findVendorSession(created.token)).not.toBeNull();

    expect(await revokeVendorSession(vendorId, created.id)).toBe(true);
    expect(await findVendorSession(created.token)).toBeNull();
    expect(await revokeVendorSession(vendorId, created.id)).toBe(false);
  });

  it('caps active sessions at ten and revokes the oldest', async () => {
    const vendorId = await seedVendor();
    for (let index = 0; index < MAX_ACTIVE_SESSIONS + 1; index += 1) {
      await createVendorSession(vendorId);
    }

    expect(await countActiveSessions(vendorId)).toBe(MAX_ACTIVE_SESSIONS);
    expect(await listVendorSessions(vendorId)).toHaveLength(MAX_ACTIVE_SESSIONS);
    const capped = await query<{ count: string }>(
      "select count(*)::text as count from vendor_session where revoked_reason = 'cap'",
    );
    expect(Number(capped[0].count)).toBe(1);
  });

  it('honours the shared-device 12-hour limit', async () => {
    const vendorId = await seedVendor(30);
    const created = await createVendorSession(vendorId, {}, { persistent: false });
    const hours = (created.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
    const absoluteHours = (created.absoluteExpiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
    expect(hours).toBeGreaterThan(11.9);
    expect(hours).toBeLessThan(12.1);
    // The absolute cap must also be 12 hours, or a later touch could slide a
    // shared-shop session back to the vendor's 30-day preference.
    expect(absoluteHours).toBeGreaterThan(11.9);
    expect(absoluteHours).toBeLessThan(12.1);
  });

  it('uses the vendor session_idle_days preference', async () => {
    const vendorId = await seedVendor(7);
    const created = await createVendorSession(vendorId);
    const days = (created.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it('slides expiry at most once an hour', async () => {
    const vendorId = await seedVendor();
    const created = await createVendorSession(vendorId, {}, { idleSeconds: 24 * 60 * 60 });

    await query(
      `update vendor_session
          set last_seen_at = now() - interval '2 hours',
              expires_at = now() + interval '1 hour'
        where id = $1`,
      [created.id],
    );
    expect(await touchVendorSession(created.id, 30 * 24 * 60 * 60)).toBe(true);
    const slid = await query<{ expires_at: Date; last_seen_at: Date }>(
      'select expires_at, last_seen_at from vendor_session where id = $1',
      [created.id],
    );
    expect(slid[0].expires_at.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);

    const before = slid[0].expires_at.getTime();
    expect(await touchVendorSession(created.id, 30 * 24 * 60 * 60)).toBe(false);
    const unchanged = await query<{ expires_at: Date }>(
      'select expires_at from vendor_session where id = $1',
      [created.id],
    );
    expect(unchanged[0].expires_at.getTime()).toBe(before);
  });

  it('uses the vendor preference when sliding without an explicit idle', async () => {
    const vendorId = await seedVendor(7);
    const created = await createVendorSession(vendorId, {}, { idleSeconds: 60 * 60 });
    await query(
      `update vendor_session
          set last_seen_at = now() - interval '2 hours',
              expires_at = now() + interval '1 hour'
        where id = $1`,
      [created.id],
    );

    expect(await touchVendorSession(created.id)).toBe(true);
    const rows = await query<{ expires_at: Date }>(
      'select expires_at from vendor_session where id = $1',
      [created.id],
    );
    const days = (rows[0].expires_at.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it('revokes every session for sign out everywhere', async () => {
    const vendorId = await seedVendor();
    await createVendorSession(vendorId);
    await createVendorSession(vendorId);

    expect(await revokeAllVendorSessions(vendorId)).toBe(2);
    expect(await countActiveSessions(vendorId)).toBe(0);
    expect(await listVendorSessions(vendorId)).toHaveLength(0);
  });
});

describe('device labels', () => {
  it('describes common phones and browsers', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Safari on iPhone');
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120',
      ),
    ).toBe('Edge on Windows');
    expect(describeUserAgent(null)).toBeNull();
  });
});
