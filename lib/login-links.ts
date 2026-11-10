import { createHash, randomBytes } from 'node:crypto';
import { db, query } from '@/lib/db';
import { appUrl } from '@/lib/brand';

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
  return { url: `${appUrl()}/auth/verify?token=${raw}` };
}

// Mask the identifier shown on the confirmation page: enough for the vendor to
// recognise their own shop, not enough to leak a full address or number.
function maskIdentifier(email: string | null, phone: string): string {
  if (email) {
    const [local, domain] = email.split('@');
    return `${local.slice(0, 1)}•••@${domain ?? ''}`;
  }
  const tail = phone.replace(/\D/g, '').slice(-3);
  return `••• ••• ${tail}`;
}

export type PeekResult =
  | { ok: true; vendorName: string; maskedIdentifier: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' };

// Validate a token WITHOUT consuming it, so an email preview or scanner GET
// cannot burn the link. The confirmation page shows the shop identity (to stop
// login CSRF); only the POST in verifyLinkAction redeems.
export async function peekLoginToken(raw: string): Promise<PeekResult> {
  if (!raw || raw.length > 200) return { ok: false, reason: 'invalid' };
  const hash = hashLoginToken(raw);

  const rows = await query<{
    expires_at: Date;
    used_at: Date | null;
    name: string;
    email: string | null;
    phone: string;
  }>(
    `select l.expires_at, l.used_at, v.name, v.email, v.phone
       from login_link l
       join vendors v on v.id = l.vendor_id
      where l.token_hash = $1
      limit 1`,
    [hash],
  );
  const row = rows[0];

  if (!row) return { ok: false, reason: 'invalid' };
  if (row.used_at) return { ok: false, reason: 'used' };
  if (row.expires_at.getTime() < Date.now()) return { ok: false, reason: 'expired' };

  return { ok: true, vendorName: row.name, maskedIdentifier: maskIdentifier(row.email, row.phone) };
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
