import { db } from '@/lib/db';
import {
  SLOT_MINUTES_OPTIONS,
  isDateOnly,
  minuteToTime,
  type AvailabilityInput,
  type AvailabilityState,
  type SaveAvailabilityResult,
  type SlotsResult,
} from '@/lib/availability-shared';

// Service vendors publish a weekly availability and the dates they are fully
// booked. Customers only ever see slots that are open and still free.

export * from '@/lib/availability-shared';

export async function readAvailability(vendorId: string): Promise<AvailabilityState> {
  const [windows, blocked, vendor] = await Promise.all([
    db().query<{ weekday: number; start_minute: number; end_minute: number }>(
      `select weekday, start_minute, end_minute
         from vendor_availability
        where vendor_id = $1
        order by weekday, start_minute`,
      [vendorId],
    ),
    db().query<{ blocked_date: string }>(
      `select blocked_date::text as blocked_date
         from vendor_blocked_date
        where vendor_id = $1
        order by blocked_date`,
      [vendorId],
    ),
    db().query<{ slot_minutes: number; weekly_booking_cap: number | null }>(
      `select booking_slot_minutes as slot_minutes, weekly_booking_cap
         from vendors where id = $1`,
      [vendorId],
    ),
  ]);

  return {
    windows: windows.rows.map((row) => ({
      weekday: row.weekday,
      startMinute: row.start_minute,
      endMinute: row.end_minute,
    })),
    blockedDates: blocked.rows.map((row) => row.blocked_date),
    slotMinutes: vendor.rows[0]?.slot_minutes ?? 60,
    weeklyCap: vendor.rows[0]?.weekly_booking_cap ?? null,
  };
}

export async function saveAvailability(
  vendorId: string,
  input: AvailabilityInput,
): Promise<SaveAvailabilityResult> {
  const seen = new Set<string>();
  for (const window of input.windows) {
    if (!Number.isInteger(window.weekday) || window.weekday < 0 || window.weekday > 6) {
      return { ok: false, error: 'Pick a valid weekday.' };
    }
    if (!Number.isInteger(window.startMinute) || !Number.isInteger(window.endMinute)) {
      return { ok: false, error: 'Pick valid start and end times.' };
    }
    if (
      window.startMinute < 0 ||
      window.endMinute > 1440 ||
      window.endMinute <= window.startMinute
    ) {
      return { ok: false, error: 'End time must be after the start time.' };
    }
    const key = `${window.weekday}:${window.startMinute}`;
    if (seen.has(key)) return { ok: false, error: 'Two windows start at the same time.' };
    seen.add(key);
  }

  if (!SLOT_MINUTES_OPTIONS.includes(input.slotMinutes as (typeof SLOT_MINUTES_OPTIONS)[number])) {
    return { ok: false, error: 'Pick a valid slot length.' };
  }
  if (
    input.weeklyCap !== null &&
    (!Number.isInteger(input.weeklyCap) || input.weeklyCap < 1 || input.weeklyCap > 500)
  ) {
    return { ok: false, error: 'Set a weekly cap from 1 to 500, or leave it off.' };
  }
  for (const date of input.blockedDates) {
    if (!isDateOnly(date)) return { ok: false, error: 'Blocked days must be real dates.' };
  }

  const client = await db().connect();
  try {
    await client.query('begin');
    await client.query('delete from vendor_availability where vendor_id = $1', [vendorId]);
    for (const window of input.windows) {
      await client.query(
        `insert into vendor_availability (vendor_id, weekday, start_minute, end_minute)
         values ($1, $2, $3, $4)`,
        [vendorId, window.weekday, window.startMinute, window.endMinute],
      );
    }
    await client.query('delete from vendor_blocked_date where vendor_id = $1', [vendorId]);
    for (const date of input.blockedDates) {
      await client.query(
        `insert into vendor_blocked_date (vendor_id, blocked_date) values ($1, $2)
         on conflict do nothing`,
        [vendorId, date],
      );
    }
    await client.query(
      `update vendors
          set booking_slot_minutes = $2, weekly_booking_cap = $3, updated_at = now()
        where id = $1`,
      [vendorId, input.slotMinutes, input.weeklyCap],
    );
    await client.query('commit');
    return { ok: true };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    console.error('[availability] save failed', error);
    return { ok: false, error: 'Could not save availability. Try again.' };
  } finally {
    client.release();
  }
}

function startOfWeekUtc(day: Date): Date {
  const date = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const offset = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - offset);
  return date;
}

async function weeklyCount(vendorId: string, day: Date): Promise<number> {
  const start = startOfWeekUtc(day);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const result = await db().query<{ count: number }>(
    `select count(*)::int as count
       from orders
      where vendor_id = $1 and fulfilment = 'appointment' and status <> 'cancelled'
        and booking_at >= $2 and booking_at < $3`,
    [vendorId, start.toISOString(), end.toISOString()],
  );
  return result.rows[0]?.count ?? 0;
}

async function bookedTimes(vendorId: string, dateIso: string): Promise<Set<string>> {
  const start = `${dateIso}T00:00:00Z`;
  const end = new Date(new Date(`${dateIso}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const result = await db().query<{ time: string }>(
    `select to_char(booking_at at time zone 'UTC', 'HH24:MI') as time
       from orders
      where vendor_id = $1 and fulfilment = 'appointment' and status <> 'cancelled'
        and booking_at >= $2 and booking_at < $3`,
    [vendorId, start, end],
  );
  return new Set(result.rows.map((row) => row.time));
}

export async function availableSlots(vendorId: string, dateIso: string): Promise<SlotsResult> {
  if (!isDateOnly(dateIso)) return { slots: [], reason: 'closed' };
  const day = new Date(`${dateIso}T00:00:00Z`);
  const weekday = day.getUTCDay();

  const state = await readAvailability(vendorId);
  if (state.blockedDates.includes(dateIso)) return { slots: [], reason: 'blocked' };

  const windows = state.windows.filter((window) => window.weekday === weekday);
  if (!windows.length) return { slots: [], reason: 'closed' };

  if (state.weeklyCap !== null && (await weeklyCount(vendorId, day)) >= state.weeklyCap) {
    return { slots: [], reason: 'full' };
  }

  const booked = await bookedTimes(vendorId, dateIso);
  const slots: string[] = [];
  for (const window of windows) {
    for (
      let minute = window.startMinute;
      minute + state.slotMinutes <= window.endMinute;
      minute += state.slotMinutes
    ) {
      const time = minuteToTime(minute);
      if (!booked.has(time)) slots.push(time);
    }
  }
  return { slots, reason: 'ok' };
}

// Placement guard: the customer can only book a slot that is still open.
export async function bookingAllowed(
  vendorId: string,
  dateIso: string,
  time: string,
): Promise<SaveAvailabilityResult> {
  const result = await availableSlots(vendorId, dateIso);
  if (result.reason === 'blocked') {
    return { ok: false, error: 'The vendor is away on this date. Pick another day.' };
  }
  if (result.reason === 'closed') {
    return { ok: false, error: 'The vendor is not open on this day. Pick another day.' };
  }
  if (result.reason === 'full') {
    return { ok: false, error: 'This week is fully booked. Pick another week.' };
  }
  if (!result.slots.includes(time)) {
    return { ok: false, error: 'That time is no longer available. Pick another slot.' };
  }
  return { ok: true };
}
