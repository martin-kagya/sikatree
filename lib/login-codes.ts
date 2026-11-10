import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { db, query } from '@/lib/db';
import { normalizeGhanaPhone } from '@/lib/phone';
import { hashIp } from '@/lib/session';

// One-time vendor sign-in codes (AUTH.md auth Phase 1). A code is 6 digits,
// single use, expires in 15 minutes, and is stored as an HMAC with a per-row
// salt. Resending a code does not invalidate the previous one: an attacker must
// not be able to burn the code the vendor is reading by requesting another.

export const LOGIN_CODE_LENGTH = 6;
export const LOGIN_CODE_TTL_SECONDS = 15 * 60;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;

const MAX_ACTIVE_CODE_ROWS = 10;

export type LoginCodePurpose = 'login' | 'email_change' | 'phone_change';

export type CreatedLoginCode = {
  code: string;
  expiresAt: Date;
};

export type VerifyLoginCodeResult =
  | { ok: true; vendorId: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'burned' };

function secret(): string {
  const value = process.env.AUTH_SECRET?.trim();
  if (!value) throw new Error('AUTH_SECRET is not set');
  return value;
}

export function normalizeLoginCode(raw: string): string {
  return (raw ?? '').replace(/\D/g, '');
}

export function newLoginCode(): string {
  return randomInt(0, 1_000_000)
    .toString()
    .padStart(LOGIN_CODE_LENGTH, '0');
}

export function hashLoginCode(code: string, salt: string): string {
  return createHmac('sha256', secret())
    .update(`${salt}:${normalizeLoginCode(code)}`)
    .digest('hex');
}

// Spend the same HMAC work when the identifier is unknown or no code is
// active, so response time does not reveal whether an account exists.
function burnHash(code: string): void {
  const salt = randomBytes(16).toString('hex');
  const expected = Buffer.from(hashLoginCode(code, salt));
  timingSafeEqual(expected, expected);
}

type Identifier = { kind: 'email'; value: string } | { kind: 'phone'; value: string };

function normalizeIdentifier(raw: string): Identifier | null {
  const value = (raw ?? '').trim();
  if (!value) return null;

  if (value.includes('@')) {
    const email = value.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? { kind: 'email', value: email } : null;
  }

  const phone = normalizeGhanaPhone(value);
  return phone ? { kind: 'phone', value: phone } : null;
}

export async function createLoginCode(
  vendorId: string,
  purpose: LoginCodePurpose = 'login',
  options: { ip?: string | null } = {},
): Promise<CreatedLoginCode> {
  const code = newLoginCode();
  const salt = randomBytes(16).toString('hex');
  const codeHash = hashLoginCode(code, salt);

  const rows = await query<{ expires_at: Date }>(
    `insert into login_code
       (vendor_id, purpose, code_hash, salt, max_attempts, expires_at, ip_hash)
     values
       ($1, $2, $3, $4, $5, now() + make_interval(secs => $6), $7)
     returning expires_at`,
    [
      vendorId,
      purpose,
      codeHash,
      salt,
      LOGIN_CODE_MAX_ATTEMPTS,
      LOGIN_CODE_TTL_SECONDS,
      hashIp(options.ip),
    ],
  );

  const row = rows[0];
  if (!row) throw new Error('login code insert returned no row');
  return { code, expiresAt: row.expires_at };
}

type CodeRow = {
  id: string;
  code_hash: string;
  salt: string;
  attempts: number;
  max_attempts: number;
  not_expired: boolean;
  unused: boolean;
  used: boolean;
};

export async function verifyLoginCode(
  identifier: string,
  rawCode: string,
): Promise<VerifyLoginCodeResult> {
  const code = normalizeLoginCode(rawCode);
  if (code.length !== LOGIN_CODE_LENGTH) {
    burnHash(code || rawCode);
    return { ok: false, reason: 'invalid' };
  }

  const normalized = normalizeIdentifier(identifier);
  if (!normalized) {
    burnHash(code);
    return { ok: false, reason: 'invalid' };
  }

  const vendors =
    normalized.kind === 'email'
      ? await query<{ id: string }>('select id from vendors where lower(email) = lower($1) limit 1', [
          normalized.value,
        ])
      : await query<{ id: string }>('select id from vendors where phone = $1 limit 1', [
          normalized.value,
        ]);

  const vendor = vendors[0];
  if (!vendor) {
    burnHash(code);
    return { ok: false, reason: 'invalid' };
  }

  const client = await db().connect();
  try {
    await client.query('begin');

    // Lock the candidate rows so two simultaneous guesses cannot both read the
    // same attempt count. Multiple codes can be live; a correct older code is
    // still accepted.
    const { rows } = await client.query<CodeRow>(
      `select id, code_hash, salt, attempts, max_attempts,
              (expires_at > now()) as not_expired,
              (used_at is null) as unused,
              (used_at is not null) as used
         from login_code
        where vendor_id = $1
          and purpose = 'login'
        order by created_at desc
        limit $2
        for update`,
      [vendor.id, MAX_ACTIVE_CODE_ROWS],
    );

    if (!rows.length) {
      await client.query('commit');
      burnHash(code);
      return { ok: false, reason: 'invalid' };
    }

    const active = rows.filter(
      (row) => row.not_expired && row.unused && row.attempts < row.max_attempts,
    );
    let matched: CodeRow | null = null;
    for (const row of active) {
      const expected = Buffer.from(hashLoginCode(code, row.salt));
      const stored = Buffer.from(row.code_hash);
      if (expected.length === stored.length && timingSafeEqual(expected, stored)) {
        matched = row;
        break;
      }
    }

    if (matched) {
      await client.query(
        'update login_code set used_at = now(), attempts = attempts + 1 where id = $1',
        [matched.id],
      );
      await client.query('commit');
      return { ok: true, vendorId: vendor.id };
    }

    if (!active.length) {
      const reason = rows.some((row) => row.unused && !row.not_expired)
        ? 'expired'
        : rows.some((row) => row.used)
          ? 'used'
          : 'invalid';
      await client.query('commit');
      burnHash(code);
      return { ok: false, reason };
    }

    // A wrong guess counts against the newest live code only. Older live codes
    // stay usable, so an attacker cannot burn every code with five guesses.
    const target = active[0];
    const attempts = target.attempts + 1;
    if (attempts >= target.max_attempts) {
      await client.query('update login_code set attempts = $2, used_at = now() where id = $1', [
        target.id,
        attempts,
      ]);
      await client.query('commit');
      burnHash(code);
      return { ok: false, reason: 'burned' };
    }

    await client.query('update login_code set attempts = $2 where id = $1', [target.id, attempts]);
    await client.query('commit');
    burnHash(code);
    return { ok: false, reason: 'invalid' };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
