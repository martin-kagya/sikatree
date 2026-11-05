import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import {
  checkHandleAvailability,
  createSignup,
  findByPhone,
  reserveHandle,
} from '@/lib/waitlist';

const base = {
  businessType: 'products' as const,
  businessName: 'Ama Glow',
  handle: null,
  referralCode: null,
  source: 'test',
  utm: {},
  consent: true,
};

beforeEach(async () => {
  await query(
    'truncate waitlist_signup, reserved_handle, rate_limit, analytics_event restart identity cascade',
  );
});

afterAll(async () => {
  await db().end();
});

describe('createSignup', () => {
  it('creates one row and reports position 1 for the first vendor', async () => {
    const { entry, created } = await createSignup({ ...base, phone: '+233241111111' });
    expect(created).toBe(true);
    expect(entry.position).toBe(1);
    expect(entry.phone).toBe('+233241111111');
    expect(entry.referralCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/);
  });

  it('returns the existing entry for a duplicate phone instead of a second row', async () => {
    const first = await createSignup({ ...base, phone: '+233241111111' });
    const second = await createSignup({
      ...base,
      phone: '+233241111111',
      businessName: 'Different name',
    });

    expect(second.created).toBe(false);
    expect(second.entry.id).toBe(first.entry.id);
    expect(second.entry.businessName).toBe('Ama Glow');

    const rows = await query<{ count: string }>('select count(*)::text from waitlist_signup');
    expect(Number(rows[0].count)).toBe(1);
  });

  it('numbers the queue in arrival order', async () => {
    const a = await createSignup({ ...base, phone: '+233241111111' });
    const b = await createSignup({ ...base, phone: '+233242222222' });
    const c = await createSignup({ ...base, phone: '+233243333333' });

    expect([a.entry.position, b.entry.position, c.entry.position]).toEqual([1, 2, 3]);
  });

  it('moves the referrer up when a referred vendor joins', async () => {
    const referrer = await createSignup({ ...base, phone: '+233241111111' });
    const second = await createSignup({ ...base, phone: '+233242222222' });
    expect(second.entry.position).toBe(2);

    await createSignup({
      ...base,
      phone: '+233243333333',
      referralCode: referrer.entry.referralCode,
    });

    const after = await findByPhone('+233241111111');
    expect(after?.position).toBe(1);

    // The referral is recorded on the new row.
    const rows = await query<{ referred_by: string | null }>(
      "select referred_by from waitlist_signup where phone = '+233243333333'",
    );
    expect(rows[0].referred_by).toBe(referrer.entry.id);
  });

  it('ignores a referral code that does not exist', async () => {
    const { entry } = await createSignup({ ...base, phone: '+233241111111', referralCode: 'ZZZZZZ' });
    expect(entry.position).toBe(1);
  });
});

describe('handles', () => {
  it('reserves a free handle and blocks a second claim', async () => {
    const first = await createSignup({ ...base, phone: '+233241111111', handle: 'amasglow' });
    expect(first.handleResult?.ok).toBe(true);
    expect(first.entry.handle).toBe('amasglow');

    const check = await checkHandleAvailability('amasglow');
    expect(check.available).toBe(false);

    const second = await createSignup({ ...base, phone: '+233242222222', handle: 'amasglow' });
    expect(second.handleResult?.ok).toBe(false);
    expect(second.entry.handle).toBeNull();
  });

  it('treats reserved words as unavailable without touching the database', async () => {
    const check = await checkHandleAvailability('admin');
    expect(check).toEqual({ available: false, reason: 'reserved' });
  });

  it('frees a handle after its reservation expires', async () => {
    const signup = await createSignup({ ...base, phone: '+233241111111' });

    await reserveHandle(signup.entry.id, 'expiring');
    await query("update reserved_handle set expires_at = now() - interval '1 day' where handle = 'expiring'");

    expect((await checkHandleAvailability('expiring')).available).toBe(true);

    const reclaimer = await createSignup({ ...base, phone: '+233242222222', handle: 'expiring' });
    expect(reclaimer.handleResult?.ok).toBe(true);
    expect(reclaimer.entry.handle).toBe('expiring');
  });

  it('refuses to reserve a handle for a signup that does not exist', async () => {
    await expect(reserveHandle('00000000-0000-0000-0000-000000000000', 'ghost')).rejects.toThrow();
  });
});
