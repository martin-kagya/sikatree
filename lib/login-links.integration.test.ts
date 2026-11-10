import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import { createLoginLink, peekLoginToken, redeemLoginToken } from '@/lib/login-links';
import { createSessionToken, verifySessionToken } from '@/lib/vendor-auth';

beforeEach(async () => {
  await query('truncate vendors, login_link, wa_conversation, wa_message restart identity cascade');
});

afterAll(async () => {
  await db().end();
});

async function seedVendor(email: string | null = null): Promise<string> {
  const rows = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at, email)
     values ('+233241111111', 'Ama Glow', 'amaglow', 'products', 'live', now(), $1)
     returning id`,
    [email],
  );
  return rows[0].id;
}

describe('login links', () => {
  it('creates a link that redeems exactly once', async () => {
    const vendorId = await seedVendor();
    const { url } = await createLoginLink(vendorId);
    expect(url).toContain('/auth/verify?token=');
    const token = new URL(url).searchParams.get('token');
    expect(token).toBeTruthy();

    const first = await redeemLoginToken(token!);
    expect(first).toEqual({ ok: true, vendorId, nextPath: null });

    const second = await redeemLoginToken(token!);
    expect(second).toEqual({ ok: false, reason: 'used' });
  });

  it('stores a validated next path for deep links', async () => {
    const vendorId = await seedVendor();
    const { url } = await createLoginLink(vendorId, { nextPath: '/dashboard/orders' });
    const token = new URL(url).searchParams.get('token')!;

    expect(await peekLoginToken(token)).toMatchObject({
      ok: true,
      nextPath: '/dashboard/orders',
    });
    expect(await redeemLoginToken(token)).toEqual({
      ok: true,
      vendorId,
      nextPath: '/dashboard/orders',
    });
  });

  it('drops an off-site next path at creation', async () => {
    const vendorId = await seedVendor();
    const { url } = await createLoginLink(vendorId, { nextPath: 'https://evil.example' });
    const token = new URL(url).searchParams.get('token')!;

    expect(await redeemLoginToken(token)).toEqual({
      ok: true,
      vendorId,
      nextPath: null,
    });
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

describe('peek (confirmation page)', () => {
  it('does not consume the token, then redeem still works (scanner simulation)', async () => {
    const vendorId = await seedVendor();
    const { url } = await createLoginLink(vendorId);
    const token = new URL(url).searchParams.get('token')!;

    // A preview or scanner GET peeks repeatedly; none of them burn the link.
    const peek1 = await peekLoginToken(token);
    const peek2 = await peekLoginToken(token);
    expect(peek1.ok).toBe(true);
    expect(peek2.ok).toBe(true);

    // The human then taps Continue (POST) and signs in.
    expect(await redeemLoginToken(token)).toEqual({ ok: true, vendorId, nextPath: null });
  });

  it('masks an email identifier', async () => {
    const vendorId = await seedVendor('ama@gmail.com');
    const { url } = await createLoginLink(vendorId);
    const token = new URL(url).searchParams.get('token')!;

    const peek = await peekLoginToken(token);
    expect(peek).toMatchObject({ ok: true, vendorName: 'Ama Glow', maskedIdentifier: 'a•••@gmail.com' });
  });

  it('falls back to a masked phone when there is no email', async () => {
    const vendorId = await seedVendor();
    const { url } = await createLoginLink(vendorId);
    const token = new URL(url).searchParams.get('token')!;

    const peek = await peekLoginToken(token);
    expect(peek).toMatchObject({ ok: true, maskedIdentifier: '••• ••• 111' });
  });

  it('reports used and invalid without throwing', async () => {
    const vendorId = await seedVendor();
    const { url } = await createLoginLink(vendorId);
    const token = new URL(url).searchParams.get('token')!;

    await redeemLoginToken(token);
    expect(await peekLoginToken(token)).toEqual({ ok: false, reason: 'used' });
    expect(await peekLoginToken('nope')).toEqual({ ok: false, reason: 'invalid' });
    expect(await peekLoginToken('')).toEqual({ ok: false, reason: 'invalid' });
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
