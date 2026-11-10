import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import {
  LOGIN_CODE_LENGTH,
  createLoginCode,
  hashLoginCode,
  newLoginCode,
  normalizeLoginCode,
  verifyLoginCode,
} from '@/lib/login-codes';

beforeEach(async () => {
  await query(
    'truncate login_code, vendor_session, auth_event, vendors restart identity cascade',
  );
});

afterAll(async () => {
  await db().end();
});

async function seedVendor(email: string | null = 'ama@example.com'): Promise<string> {
  const rows = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at, email)
     values ('+233241111111', 'Ama Glow', 'amaglow', 'products', 'live', now(), $1)
     returning id`,
    [email],
  );
  return rows[0].id;
}

describe('one-time codes', () => {
  it('generates six digits and normalizes spaces', () => {
    for (let index = 0; index < 25; index += 1) {
      expect(newLoginCode()).toMatch(/^\d{6}$/);
    }
    expect(normalizeLoginCode('482 913')).toBe('482913');
    expect(normalizeLoginCode('482-913')).toBe('482913');
    expect(normalizeLoginCode('')).toBe('');
  });

  it('creates a redeemable code and stores only the hash', async () => {
    const vendorId = await seedVendor();
    const created = await createLoginCode(vendorId);

    expect(created.code).toMatch(new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`));
    const rows = await query<{ code_hash: string; salt: string }>(
      'select code_hash, salt from login_code',
    );
    expect(rows[0].code_hash).toBe(hashLoginCode(created.code, rows[0].salt));
    expect(rows[0].code_hash).not.toContain(created.code);
    expect(rows[0].code_hash).toHaveLength(64);

    expect(await verifyLoginCode('ama@example.com', created.code)).toEqual({
      ok: true,
      vendorId,
    });
    expect(await verifyLoginCode('ama@example.com', created.code)).toEqual({
      ok: false,
      reason: 'used',
    });
  });

  it('accepts a code with spaces and a normalized phone identifier', async () => {
    const vendorId = await seedVendor();
    const created = await createLoginCode(vendorId);
    const spaced = `${created.code.slice(0, 3)} ${created.code.slice(3)}`;

    expect(await verifyLoginCode('024 111 1111', spaced)).toEqual({ ok: true, vendorId });
  });

  it('burns a code after five wrong attempts', async () => {
    const vendorId = await seedVendor();
    const created = await createLoginCode(vendorId);
    const wrong = created.code === '000000' ? '111111' : '000000';

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      expect(await verifyLoginCode('ama@example.com', wrong)).toEqual({
        ok: false,
        reason: 'invalid',
      });
    }
    expect(await verifyLoginCode('ama@example.com', wrong)).toEqual({
      ok: false,
      reason: 'burned',
    });
    expect(await verifyLoginCode('ama@example.com', created.code)).toEqual({
      ok: false,
      reason: 'used',
    });
  });

  it('does not invalidate an older valid code when a new one is issued', async () => {
    const vendorId = await seedVendor();
    const first = await createLoginCode(vendorId);
    const second = await createLoginCode(vendorId);

    expect(await verifyLoginCode('ama@example.com', first.code)).toEqual({
      ok: true,
      vendorId,
    });
    expect(await verifyLoginCode('ama@example.com', second.code)).toEqual({
      ok: true,
      vendorId,
    });
  });

  it('keeps an older code usable when the newest is burned', async () => {
    const vendorId = await seedVendor();
    const older = await createLoginCode(vendorId);
    const newer = await createLoginCode(vendorId);
    const wrong = newer.code === '000000' ? '111111' : '000000';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await verifyLoginCode('ama@example.com', wrong);
    }
    expect(await verifyLoginCode('ama@example.com', older.code)).toEqual({
      ok: true,
      vendorId,
    });
  });

  it('reports expired codes', async () => {
    const vendorId = await seedVendor();
    const created = await createLoginCode(vendorId);
    await query("update login_code set expires_at = now() - interval '1 minute'");

    expect(await verifyLoginCode('ama@example.com', created.code)).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('will not authenticate another purpose', async () => {
    const vendorId = await seedVendor();
    const created = await createLoginCode(vendorId, 'email_change');

    expect(await verifyLoginCode('ama@example.com', created.code)).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('returns a generic failure for unknown identifiers and malformed codes', async () => {
    await seedVendor();

    expect(await verifyLoginCode('nobody@example.com', '123456')).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await verifyLoginCode('ama@example.com', 'abc')).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await verifyLoginCode('not-an-identifier', '123456')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });
});
