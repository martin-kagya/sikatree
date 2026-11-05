import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { site } from '@/lib/brand';

// Single-use, short-lived login links (ONB-20, AUTH-01). The raw token lives in
// the URL; only its hash is stored, so a database read cannot forge a link.

const LINK_TTL_MINUTES = 15;

export function hashLoginToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function newLoginToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createLoginLink(vendorId: string): Promise<{ url: string }> {
  const raw = newLoginToken();
  const hash = hashLoginToken(raw);
  await db().query(
    `insert into login_link (vendor_id, token_hash, expires_at)
     values ($1, $2, now() + make_interval(mins => $3))`,
    [vendorId, hash, LINK_TTL_MINUTES],
  );
  return { url: `${site.url}/auth/login?token=${raw}` };
}

export type RedeemResult =
  | { ok: true; vendorId: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' };

export async function redeemLoginToken(raw: string): Promise<RedeemResult> {
  if (!raw || raw.length > 200) return { ok: false, reason: 'invalid' };
  const hash = hashLoginToken(raw);

  const client = await db().connect();
  try {
    await client.query('begin');
    const { rows } = await client.query<{ vendor_id: string; expires_at: Date; used_at: Date | null }>(
      'select vendor_id, expires_at, used_at from login_link where token_hash = $1 for update',
      [hash],
    );
    const row = rows[0];

    if (!row) {
      await client.query('commit');
      return { ok: false, reason: 'invalid' };
    }
    if (row.used_at) {
      await client.query('commit');
      return { ok: false, reason: 'used' };
    }
    if (row.expires_at.getTime() < Date.now()) {
      await client.query('commit');
      return { ok: false, reason: 'expired' };
    }

    await client.query('update login_link set used_at = now() where token_hash = $1', [hash]);
    await client.query('commit');
    return { ok: true, vendorId: row.vendor_id };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
