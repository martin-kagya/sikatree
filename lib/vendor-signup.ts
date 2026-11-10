import { db, query } from '@/lib/db';
import { getEmailProvider, type EmailProvider } from '@/lib/email/provider';
import { magicLinkEmail } from '@/lib/email/templates';
import { checkHandle, normalizeHandle } from '@/lib/handle';
import { createLoginLink } from '@/lib/login-links';
import { normalizeGhanaPhone } from '@/lib/phone';
import { hitRateLimit } from '@/lib/rate-limit';

// Web signup: the same shop a vendor would get from the bot, without needing a
// WhatsApp Business account. Phone stays the unique identity.

export const VENDOR_TYPES = ['products', 'services', 'both'] as const;
export type VendorType = (typeof VENDOR_TYPES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type VendorSignupInput = {
  name: string;
  type: string;
  handle: string;
  phone: string;
  email: string;
  consent: boolean;
};

export type VendorSignupResult =
  | { ok: true; handle: string; emailSent: boolean }
  | { ok: false; error: string };

function handleError(status: ReturnType<typeof checkHandle>): string | null {
  switch (status) {
    case 'too-short':
      return 'Your link needs at least 3 characters.';
    case 'invalid':
      return 'Use lowercase letters, numbers and hyphens only.';
    case 'reserved':
      return 'That link is reserved. Try another one.';
    case 'blocked':
      return 'That link is not available. Try another one.';
    default:
      return null;
  }
}

export async function createVendorFromWeb(
  input: VendorSignupInput,
  options: { emailProvider?: EmailProvider | null } = {},
): Promise<VendorSignupResult> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: 'Enter your business name (2 to 80 characters).' };
  }

  const type = input.type as VendorType;
  if (!VENDOR_TYPES.includes(type)) {
    return { ok: false, error: 'Choose what you sell.' };
  }

  const handle = normalizeHandle(input.handle);
  const handleProblem = handleError(checkHandle(handle));
  if (handleProblem) return { ok: false, error: handleProblem };

  const phone = normalizeGhanaPhone(input.phone);
  if (!phone) {
    return { ok: false, error: 'Enter a Ghana mobile number, like 024 123 4567.' };
  }

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  if (!input.consent) {
    return { ok: false, error: 'Agree to the terms and privacy notice to continue.' };
  }

  const emailProvider =
    options.emailProvider === undefined ? getEmailProvider() : options.emailProvider;
  if (!emailProvider) {
    return { ok: false, error: 'Email sign-up is not configured yet. Please try again later.' };
  }

  const phoneLimit = await hitRateLimit(`signup:phone:${phone}`, 3, 3600).catch(() => null);
  if (phoneLimit && !phoneLimit.allowed) {
    return { ok: false, error: 'Too many attempts for that number. Try again later.' };
  }
  const emailLimit = await hitRateLimit(`signup:email:${email}`, 3, 3600).catch(() => null);
  if (emailLimit && !emailLimit.allowed) {
    return { ok: false, error: 'Too many attempts for that email. Try again later.' };
  }

  const waitlist = await query<{ id: string }>(
    'select id from waitlist_signup where phone = $1 limit 1',
    [phone],
  );
  const waitlistId = waitlist[0]?.id ?? null;

  const taken = await query<{ one: number }>('select 1 as one from vendors where handle = $1', [
    handle,
  ]);
  if (taken.length) return { ok: false, error: 'That link is already taken. Try another one.' };

  const reserved = await query<{ one: number }>(
    `select 1 as one from reserved_handle
      where handle = $1 and status = 'reserved' and expires_at > now()
        and signup_id is distinct from $2`,
    [handle, waitlistId],
  );
  if (reserved.length) {
    return { ok: false, error: 'That link is held for someone else. Try another one.' };
  }

  const client = await db().connect();
  let vendorId = '';
  try {
    await client.query('begin');
    const inserted = await client.query<{ id: string }>(
      `insert into vendors (phone, name, handle, type, status, consent_at, email, waitlist_signup_id)
       values ($1, $2, $3, $4, 'live', now(), $5, $6)
       returning id`,
      [phone, name, handle, type, email, waitlistId],
    );
    vendorId = inserted.rows[0].id;

    if (waitlistId) {
      // The shop is live now, so the waitlist reservation has done its job.
      await client.query(
        `update reserved_handle
            set status = 'released', expires_at = now()
          where signup_id = $1 and status = 'reserved' and handle <> $2`,
        [waitlistId, handle],
      );
      await client.query(
        `update reserved_handle set status = 'claimed' where handle = $1 and signup_id = $2`,
        [handle, waitlistId],
      );
      await client.query(`update waitlist_signup set status = 'onboarded' where id = $1`, [
        waitlistId,
      ]);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    const details = error as { code?: string; constraint?: string };
    if (details.code === '23505') {
      if (details.constraint?.includes('email')) {
        return { ok: false, error: 'That email is already used by another shop.' };
      }
      if (details.constraint?.includes('phone')) {
        return {
          ok: false,
          error: 'That number already has a shop. Sign in with your email instead.',
        };
      }
      if (details.constraint?.includes('handle')) {
        return { ok: false, error: 'That link is already taken. Try another one.' };
      }
    }
    throw error;
  } finally {
    client.release();
  }

  const { url } = await createLoginLink(vendorId);
  try {
    await emailProvider.send(
      magicLinkEmail({ to: email, url, vendorName: name, handle, kind: 'welcome' }),
    );
  } catch (error) {
    // The shop exists; the sign-in page can send another link once the mail
    // path recovers. Never fail the signup after the row is committed.
    console.error('[signup] welcome email failed', error);
    return { ok: true, handle, emailSent: false };
  }

  return { ok: true, handle, emailSent: true };
}
