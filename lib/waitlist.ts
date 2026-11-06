import { db, query } from '@/lib/db';
import { checkHandle, suggestHandleVariant } from '@/lib/handle';
import { newReferralCode, parseReferralCode } from '@/lib/referral';
import { type OrderBand, isOrderBand } from '@/lib/waitlist-bands';

export { ORDER_BANDS, orderBandLabel, type OrderBand } from '@/lib/waitlist-bands';

export const BUSINESS_TYPES = ['products', 'services', 'both'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export type SignupStatus = 'waiting' | 'invited' | 'onboarded' | 'unsubscribed';

export type WaitlistEntry = {
  id: string;
  phone: string;
  businessType: BusinessType | null;
  businessName: string | null;
  monthlyOrders: OrderBand | null;
  handle: string | null;
  referralCode: string;
  status: SignupStatus;
  position: number;
  createdAt: string;
};

type EntryRow = {
  id: string;
  phone: string;
  business_type: BusinessType | null;
  business_name: string | null;
  monthly_orders: OrderBand | null;
  handle: string | null;
  referral_code: string;
  status: SignupStatus;
  position: string | number;
  created_at: Date;
};

// Position in line counts live signups that arrived earlier, minus the spots
// earned from referrals. Never below 1.
const ENTRY_COLUMNS = `
  w.id, w.phone, w.business_type, w.business_name, w.monthly_orders, w.handle,
  w.referral_code,
  w.status, w.created_at,
  greatest(1, (
    select count(*) from waitlist_signup x
    where x.status <> 'unsubscribed'
      and (x.created_at, x.id) <= (w.created_at, w.id)
  ) - w.bumps) as position
`;

function toEntry(row: EntryRow): WaitlistEntry {
  return {
    id: row.id,
    phone: row.phone,
    businessType: row.business_type,
    businessName: row.business_name,
    monthlyOrders: row.monthly_orders,
    handle: row.handle,
    referralCode: row.referral_code,
    status: row.status,
    position: Number(row.position),
    createdAt: row.created_at.toISOString(),
  };
}

export async function findByPhone(phone: string): Promise<WaitlistEntry | null> {
  const rows = await query<EntryRow>(
    `select ${ENTRY_COLUMNS} from waitlist_signup w where w.phone = $1`,
    [phone],
  );
  return rows[0] ? toEntry(rows[0]) : null;
}

export async function findById(id: string): Promise<WaitlistEntry | null> {
  const rows = await query<EntryRow>(
    `select ${ENTRY_COLUMNS} from waitlist_signup w where w.id = $1`,
    [id],
  );
  return rows[0] ? toEntry(rows[0]) : null;
}

export type HandleTakenReason = 'reserved' | 'blocked' | 'too-short' | 'invalid' | 'taken';

export type HandleCheck =
  | { available: true }
  | { available: false; reason: HandleTakenReason; suggestion?: string };

// Pure rules first, then the real reservation table. Expired holds are free.
export async function checkHandleAvailability(handle: string): Promise<HandleCheck> {
  const status = checkHandle(handle);
  if (status === 'too-short' || status === 'invalid') {
    return { available: false, reason: status };
  }
  if (status === 'reserved' || status === 'blocked') {
    return { available: false, reason: status };
  }

  const rows = await query<{ status: string; expires_at: Date }>(
    'select status, expires_at from reserved_handle where handle = $1',
    [handle],
  );
  const row = rows[0];
  const held = row && (row.status === 'claimed' || row.expires_at.getTime() > Date.now());
  if (held) {
    return { available: false, reason: 'taken' };
  }
  return { available: true };
}

export async function suggestAvailable(handle: string): Promise<string | undefined> {
  for (let attempt = 0; attempt <= 12; attempt++) {
    const candidate = attempt === 0 ? handle : suggestHandleVariant(handle, attempt);
    if (candidate.length < 3) continue;
    const check = await checkHandleAvailability(candidate);
    if (check.available) return candidate;
  }
  return undefined;
}

export type ReserveResult =
  | { ok: true; handle: string }
  | { ok: false; reason: HandleTakenReason | 'taken'; suggestion?: string };

// Reservations are soft claims with an expiry. The advisory lock makes two
// simultaneous claims of the same handle serialize; the primary key is the
// final guard.
export async function reserveHandle(signupId: string, handle: string): Promise<ReserveResult> {
  const client = await db().connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [handle]);

    const existing = await client.query<{ status: string; expires_at: Date }>(
      'select status, expires_at from reserved_handle where handle = $1 for update',
      [handle],
    );
    const row = existing.rows[0];
    if (row && (row.status === 'claimed' || row.expires_at.getTime() > Date.now())) {
      await client.query('rollback');
      return { ok: false, reason: 'taken', suggestion: await suggestAvailable(handle) };
    }

    await client.query(
      `insert into reserved_handle (handle, signup_id, reserved_at, expires_at, status)
       values ($1, $2, now(), now() + ($3 || ' days')::interval, 'reserved')
       on conflict (handle) do update
         set signup_id = excluded.signup_id,
             reserved_at = now(),
             expires_at = excluded.expires_at,
             status = 'reserved'`,
      [handle, signupId, String(Number(process.env.RESERVATION_DAYS) || 30)],
    );
    await client.query('update waitlist_signup set handle = $1 where id = $2', [handle, signupId]);
    await client.query('commit');
    return { ok: true, handle };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export type CreateSignupInput = {
  phone: string;
  businessType: BusinessType | null;
  businessName: string | null;
  monthlyOrders: OrderBand | null;
  handle: string | null;
  referralCode: string | null;
  source: string | null;
  utm: { source?: string | null; medium?: string | null; campaign?: string | null };
  consent: boolean;
};

export type CreateSignupResult = {
  entry: WaitlistEntry;
  created: boolean;
  handleResult?: ReserveResult;
};

export async function createSignup(input: CreateSignupInput): Promise<CreateSignupResult> {
  const existing = await findByPhone(input.phone);

  // Duplicate number: show the position they already have, never a new row.
  if (existing) {
    return { entry: existing, created: false };
  }

  const referrerCode = parseReferralCode(input.referralCode);
  let referrerId: string | null = null;
  if (referrerCode) {
    const rows = await query<{ id: string; phone: string }>(
      'select id, phone from waitlist_signup where referral_code = $1 and status <> $2',
      [referrerCode, 'unsubscribed'],
    );
    if (rows[0] && rows[0].phone !== input.phone) referrerId = rows[0].id;
  }

  const inserted = await query<{ id: string }>(
    `insert into waitlist_signup
       (phone, business_type, business_name, monthly_orders, referral_code, referred_by,
        source, utm_source, utm_medium, utm_campaign, consent_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     on conflict (phone) do nothing
     returning id`,
    [
      input.phone,
      input.businessType,
      input.businessName,
      input.monthlyOrders,
      newReferralCode(),
      referrerId,
      input.source,
      input.utm.source ?? null,
      input.utm.medium ?? null,
      input.utm.campaign ?? null,
    ],
  );

  // Lost a race with another request for the same number.
  if (!inserted[0]) {
    const raced = await findByPhone(input.phone);
    if (!raced) throw new Error('signup insert conflicted but no row exists');
    return { entry: raced, created: false };
  }

  const id = inserted[0].id;

  if (referrerId) {
    await query('update waitlist_signup set bumps = bumps + 1 where id = $1', [referrerId]);
  }

  // A handle is a bonus, not a reason to fail the signup. If the claim loses a
  // race the vendor still gets their spot, and the UI explains the handle went.
  let handleResult: ReserveResult | undefined;
  if (input.handle) {
    handleResult = await reserveHandle(id, input.handle);
  }

  const entry = await findById(id);
  if (!entry) throw new Error('signup vanished after insert');
  return { entry, created: true, handleResult };
}

export async function updateDetails(
  phone: string,
  details: {
    businessType: BusinessType | null;
    businessName: string | null;
    monthlyOrders: OrderBand | null;
  },
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `update waitlist_signup
        set business_type = coalesce($2, business_type),
            business_name = coalesce($3, business_name),
            monthly_orders = coalesce($4, monthly_orders)
      where phone = $1
      returning id`,
    [phone, details.businessType, details.businessName, details.monthlyOrders],
  );
  return rows.length > 0;
}

export type AdminFilters = {
  q?: string;
  status?: string;
  type?: string;
};

export type AdminEntry = WaitlistEntry & {
  notes: string | null;
  referrerPhone: string | null;
  referrerName: string | null;
};

export async function listForAdmin(filters: AdminFilters, limit = 200): Promise<AdminEntry[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.q) {
    params.push(`%${filters.q}%`);
    clauses.push(
      `(w.phone ilike $${params.length} or w.business_name ilike $${params.length} or w.handle ilike $${params.length})`,
    );
  }
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`w.status = $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    clauses.push(`w.business_type = $${params.length}`);
  }

  const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
  params.push(limit);

  const rows = await query<
    EntryRow & {
      notes: string | null;
      referrer_phone: string | null;
      referrer_name: string | null;
    }
  >(
    `select ${ENTRY_COLUMNS}, w.notes,
            r.phone as referrer_phone, r.business_name as referrer_name
       from waitlist_signup w
       left join waitlist_signup r on r.id = w.referred_by
       ${where}
      order by w.created_at desc
      limit $${params.length}`,
    params,
  );
  return rows.map((row) => ({
    ...toEntry(row),
    notes: row.notes,
    referrerPhone: row.referrer_phone,
    referrerName: row.referrer_name,
  }));
}

export async function statusCounts(): Promise<Record<string, number>> {
  const rows = await query<{ status: string; count: string }>(
    'select status, count(*)::text as count from waitlist_signup group by status',
  );
  return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
}

export async function setStatus(id: string, status: SignupStatus, notes?: string) {
  const client = await db().connect();
  try {
    await client.query('begin');
    await client.query(
      `update waitlist_signup
          set status = $2,
              notes = coalesce($3, notes)
        where id = $1`,
      [id, status, notes ?? null],
    );

    // Unsubscribing frees the reserved handle (LP-23).
    if (status === 'unsubscribed') {
      await client.query(
        `update reserved_handle
            set status = 'released', expires_at = now()
          where signup_id = $1 and status = 'reserved'`,
        [id],
      );
      await client.query('update waitlist_signup set handle = null where id = $1', [id]);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function updateNotes(id: string, notes: string) {
  await query('update waitlist_signup set notes = $2 where id = $1', [id, notes]);
}
