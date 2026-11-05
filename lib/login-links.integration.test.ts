import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import { createLoginLink, redeemLoginToken } from '@/lib/login-links';
import { createSessionToken, verifySessionToken } from '@/lib/vendor-auth';

beforeEach(async () => {
  await query('truncate vendors, login_link, wa_conversation, wa_message restart identity cascade');
});

afterAll(async () => {
  await db().end();
});

async function seedVendor(): Promise<string> {
  const rows = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at)
     values ('+233241111111', 'Ama Glow', 'amaglow', 'products', 'live', now())
     returning id`,
  );
  return rows[0].id;
}

describe('login links', () => {
  it('creates a link that redeems exactly once', async () => {
    const vendorId = await seedVendor();
    const { url } = await createLoginLink(vendorId);
    const token = new URL(url).searchParams.get('token');
    expect(token).toBeTruthy();

    const first = await redeemLoginToken(token!);
    expect(first).toEqual({ ok: true, vendorId });

    const second = await redeemLoginToken(token!);
    expect(second).toEqual({ ok: false, reason: 'used' });
  });

  it('rejects unknown and malformed tokens', async () => {
    await expect(redeemLoginToken('not-a-real-token')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
    await expect(redeemLoginToken('')).resolves.toEqual({ ok: false, reason: 'invalid' });
  });

  it('stores only a hash of the token', async () => {
    const vendorId = await seedVendor();
    const { url } = await createLoginLink(vendorId);
    const token = new URL(url).searchParams.get('token')!;

    const rows = await query<{ token_hash: string }>('select token_hash from login_link');
    expect(rows[0].token_hash).not.toContain(token);
    expect(rows[0].token_hash).toHaveLength(64); // sha256 hex
  });
});

describe('vendor sessions', () => {
  it('signs and verifies a session for a vendor', async () => {
    const vendorId = await seedVendor();
    const token = createSessionToken(vendorId);
    expect(verifySessionToken(token)).toBe(vendorId);
  });

  it('rejects a tampered session', async () => {
    const vendorId = await seedVendor();
    const token = createSessionToken(vendorId);
    const [id, expires, signature] = token.split('.');
    const tampered = `${id}.${expires}.${signature === 'x' ? 'y' : 'x'}`;
    expect(verifySessionToken(tampered)).toBeNull();
  });
});
