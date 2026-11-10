import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import type { EmailMessage, EmailProvider } from '@/lib/email/provider';
import { redeemLoginToken } from '@/lib/login-links';
import { requestEmailLogin } from '@/lib/vendor-login';
import { createVendorFromWeb } from '@/lib/vendor-signup';

let sent: EmailMessage[] = [];

const emailer: EmailProvider = {
  name: 'fake',
  async send(message) {
    sent.push(message);
  },
};

const failingEmailer: EmailProvider = {
  name: 'fake',
  async send() {
    throw new Error('smtp down');
  },
};

beforeEach(async () => {
  sent = [];
  await query(
    `truncate ledger_entries, payment_events, payments, login_link, stock_movement,
             order_items, orders, items, item_images, vendor_availability, vendor_blocked_date,
             vendor_categories, reserved_handle, waitlist_signup, vendors, rate_limit
     restart identity cascade`,
  );
});

afterAll(async () => {
  await db().end();
});

function input(overrides: Partial<Parameters<typeof createVendorFromWeb>[0]> = {}) {
  return {
    name: "Ama's Glow Studio",
    type: 'products',
    handle: 'amasglow',
    phone: '024 555 1234',
    email: 'Ama@Example.com',
    consent: true,
    ...overrides,
  };
}

async function seededVendor(): Promise<string> {
  const rows = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at, email)
     values ('+233240000001', 'Existing', 'existing', 'products', 'live', now(), 'existing@example.com')
     returning id`,
  );
  return rows[0].id;
}

describe('web vendor signup', () => {
  it('creates a live shop and emails a working sign-in link', async () => {
    const result = await createVendorFromWeb(input(), { emailProvider: emailer });
    expect(result).toMatchObject({ ok: true, handle: 'amasglow', emailSent: true });

    const vendors = await query<{
      id: string;
      status: string;
      email: string;
      type: string;
      consent_at: Date;
    }>(`select id, status, email, type, consent_at from vendors where handle = 'amasglow'`);
    expect(vendors[0]).toMatchObject({ status: 'live', email: 'ama@example.com', type: 'products' });
    expect(vendors[0].consent_at).toBeInstanceOf(Date);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ama@example.com');
    const token = /token=([A-Za-z0-9_-]+)/.exec(sent[0].text)?.[1] ?? '';
    expect(token).not.toBe('');
    const redeemed = await redeemLoginToken(token);
    expect(redeemed).toMatchObject({ ok: true, vendorId: vendors[0].id });
  });

  it('rejects a number that already has a shop', async () => {
    await createVendorFromWeb(input(), { emailProvider: emailer });
    sent = [];
    const result = await createVendorFromWeb(
      input({ handle: 'anothershop', email: 'other@example.com' }),
      { emailProvider: emailer },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/already has a shop/i);
    expect(sent).toHaveLength(0);
  });

  it('rejects a taken handle and an email already in use', async () => {
    await seededVendor();

    const takenHandle = await createVendorFromWeb(
      input({ handle: 'existing', phone: '024 555 9999' }),
      { emailProvider: emailer },
    );
    expect(takenHandle.ok).toBe(false);

    const takenEmail = await createVendorFromWeb(
      input({ handle: 'newshop', phone: '024 555 8888', email: 'existing@example.com' }),
      { emailProvider: emailer },
    );
    expect(takenEmail.ok).toBe(false);
  });

  it('rejects reserved words, missing consent and bad input', async () => {
    const reserved = await createVendorFromWeb(input({ handle: 'admin' }), {
      emailProvider: emailer,
    });
    expect(reserved.ok).toBe(false);

    const noConsent = await createVendorFromWeb(input({ consent: false }), {
      emailProvider: emailer,
    });
    expect(noConsent.ok).toBe(false);

    const badPhone = await createVendorFromWeb(input({ phone: '123' }), {
      emailProvider: emailer,
    });
    expect(badPhone.ok).toBe(false);

    const badEmail = await createVendorFromWeb(input({ email: 'not-an-email' }), {
      emailProvider: emailer,
    });
    expect(badEmail.ok).toBe(false);

    const empty = await createVendorFromWeb(input({ name: ' ' }), { emailProvider: emailer });
    expect(empty.ok).toBe(false);
  });

  it('claims the waitlist reservation for the same phone', async () => {
    const signup = await query<{ id: string }>(
      `insert into waitlist_signup (phone, business_type, business_name, handle, referral_code, consent_at)
       values ('+233245551234', 'products', 'Ama', 'amasglow', 'ABC123', now())
       returning id`,
    );
    const waitlistId = signup[0].id;
    await query(
      `insert into reserved_handle (handle, signup_id, expires_at)
       values ('amasglow', $1, now() + interval '30 days')`,
      [waitlistId],
    );

    const result = await createVendorFromWeb(input(), { emailProvider: emailer });
    expect(result.ok).toBe(true);

    const reserved = await query<{ status: string }>(
      `select status from reserved_handle where handle = 'amasglow'`,
    );
    expect(reserved[0].status).toBe('claimed');

    const waitlist = await query<{ status: string }>(
      `select status from waitlist_signup where id = $1`,
      [waitlistId],
    );
    expect(waitlist[0].status).toBe('onboarded');

    const vendor = await query<{ waitlist_signup_id: string }>(
      `select waitlist_signup_id from vendors where handle = 'amasglow'`,
    );
    expect(vendor[0].waitlist_signup_id).toBe(waitlistId);
  });

  it('does not let someone else take a reserved handle', async () => {
    const signup = await query<{ id: string }>(
      `insert into waitlist_signup (phone, business_type, business_name, handle, referral_code, consent_at)
       values ('+233240000002', 'products', 'Other', 'amasglow', 'XYZ789', now())
       returning id`,
    );
    await query(
      `insert into reserved_handle (handle, signup_id, expires_at)
       values ('amasglow', $1, now() + interval '30 days')`,
      [signup[0].id],
    );

    const result = await createVendorFromWeb(input(), { emailProvider: emailer });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/held for someone else/i);
  });

  it('keeps the shop when the welcome email fails', async () => {
    const result = await createVendorFromWeb(input(), { emailProvider: failingEmailer });
    expect(result).toMatchObject({ ok: true, emailSent: false });

    const vendors = await query<{ count: string }>(
      `select count(*) from vendors where handle = 'amasglow'`,
    );
    expect(Number(vendors[0].count)).toBe(1);
  });
});

describe('email sign-in', () => {
  it('does not reveal whether an email has a shop', async () => {
    const result = await requestEmailLogin('nobody@example.com', { provider: emailer });
    expect(result).toEqual({ configured: true, sent: false });
    expect(sent).toHaveLength(0);

    const links = await query<{ count: string }>(`select count(*) from login_link`);
    expect(Number(links[0].count)).toBe(0);
  });

  it('emails a redeemable link to a known vendor', async () => {
    await createVendorFromWeb(input(), { emailProvider: emailer });
    sent = [];
    // The welcome link is separate; count only the sign-in link below.
    await query('delete from login_link');

    const result = await requestEmailLogin('ama@example.com', { provider: emailer });
    expect(result).toEqual({ configured: true, sent: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ama@example.com');

    const token = /token=([A-Za-z0-9_-]+)/.exec(sent[0].text)?.[1] ?? '';
    const redeemed = await redeemLoginToken(token);
    expect(redeemed.ok).toBe(true);

    const links = await query<{ count: string }>(`select count(*) from login_link`);
    expect(Number(links[0].count)).toBe(1);
  });

  it('reports when email is not configured', async () => {
    const result = await requestEmailLogin('ama@example.com', { provider: null });
    expect(result).toEqual({ configured: false, sent: false });
  });
});
