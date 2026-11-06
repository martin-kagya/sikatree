import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  availableSlots,
  bookingAllowed,
  minuteToTime,
  readAvailability,
  saveAvailability,
  timeToMinute,
} from '@/lib/availability';
import { db, query } from '@/lib/db';

let vendorId = '';

beforeEach(async () => {
  await query('truncate orders, order_items, items, vendors, rate_limit restart identity cascade');
  const vendor = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at)
     values ('+233241234567', 'Naa Glow', 'naasglow', 'services', 'live', now())
     returning id`,
  );
  vendorId = vendor[0].id;
});

afterAll(async () => {
  await db().end();
});

// A future date (at least a week out) that falls on `weekday`.
function dateForWeekday(weekday: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + 7);
  while (date.getUTCDay() !== weekday) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function insertAppointment(bookingAt: string): Promise<void> {
  await query(
    `insert into orders
       (code, vendor_id, customer_name, customer_phone, customer_email, fulfilment,
        booking_at, subtotal_pesewas, delivery_pesewas, total_pesewas, eta_text)
     values ($1, $2, 'Test', '+233241234567', 'test@example.com', 'appointment', $3, 10000, 0, 10000, 'Appointment')`,
    [`ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, vendorId, bookingAt],
  );
}

describe('availability helpers', () => {
  it('formats and parses minutes', () => {
    expect(minuteToTime(9 * 60)).toBe('09:00');
    expect(minuteToTime(18 * 60 + 30)).toBe('18:30');
    expect(timeToMinute('09:00')).toBe(540);
    expect(timeToMinute('9:00')).toBeNull();
    expect(timeToMinute('24:00')).toBeNull();
  });
});

describe('availableSlots', () => {
  it('generates slots from the weekly window', async () => {
    const monday = dateForWeekday(1);
    await saveAvailability(vendorId, {
      windows: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }],
      blockedDates: [],
      slotMinutes: 60,
      weeklyCap: null,
    });

    const result = await availableSlots(vendorId, monday);
    expect(result.reason).toBe('ok');
    expect(result.slots).toEqual(['09:00', '10:00', '11:00']);
  });

  it('closes days with no window', async () => {
    const tuesday = dateForWeekday(2);
    await saveAvailability(vendorId, {
      windows: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }],
      blockedDates: [],
      slotMinutes: 60,
      weeklyCap: null,
    });

    expect(await availableSlots(vendorId, tuesday)).toEqual({ slots: [], reason: 'closed' });
  });

  it('reports a blocked date as fully booked', async () => {
    const monday = dateForWeekday(1);
    await saveAvailability(vendorId, {
      windows: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }],
      blockedDates: [monday],
      slotMinutes: 60,
      weeklyCap: null,
    });

    expect(await availableSlots(vendorId, monday)).toEqual({ slots: [], reason: 'blocked' });
  });

  it('removes slots that are already taken', async () => {
    const monday = dateForWeekday(1);
    await saveAvailability(vendorId, {
      windows: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }],
      blockedDates: [],
      slotMinutes: 60,
      weeklyCap: null,
    });
    await insertAppointment(`${monday}T10:00:00Z`);

    const result = await availableSlots(vendorId, monday);
    expect(result.slots).toEqual(['09:00', '11:00']);
  });

  it('closes the week once the weekly cap is reached', async () => {
    const monday = dateForWeekday(1);
    await saveAvailability(vendorId, {
      windows: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }],
      blockedDates: [],
      slotMinutes: 60,
      weeklyCap: 2,
    });
    await insertAppointment(`${monday}T09:00:00Z`);
    await insertAppointment(`${monday}T10:00:00Z`);

    expect(await availableSlots(vendorId, monday)).toEqual({ slots: [], reason: 'full' });
    const state = await readAvailability(vendorId);
    expect(state.weeklyCap).toBe(2);
  });

  it('rejects a slot that is no longer bookable', async () => {
    const monday = dateForWeekday(1);
    await saveAvailability(vendorId, {
      windows: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }],
      blockedDates: [],
      slotMinutes: 60,
      weeklyCap: null,
    });
    await insertAppointment(`${monday}T10:00:00Z`);

    expect((await bookingAllowed(vendorId, monday, '10:00')).ok).toBe(false);
    expect((await bookingAllowed(vendorId, monday, '11:00')).ok).toBe(true);
  });
});
