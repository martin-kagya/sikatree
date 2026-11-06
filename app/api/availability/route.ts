import { NextResponse } from 'next/server';
import { availableSlots, isDateOnly } from '@/lib/availability';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Public read: the open appointment slots for a service vendor on a date.
// Returns nothing for product vendors and for invalid input.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const handle = (url.searchParams.get('handle') ?? '').trim().toLowerCase();
  const date = (url.searchParams.get('date') ?? '').trim();

  if (!/^[a-z0-9-]{3,40}$/.test(handle) || !isDateOnly(date)) {
    return NextResponse.json({ slots: [], reason: 'closed' }, { status: 400 });
  }

  const vendors = await query<{ id: string }>(
    `select id from vendors
      where handle = $1 and status = 'live' and type in ('services', 'both')`,
    [handle],
  );
  const vendor = vendors[0];
  if (!vendor) return NextResponse.json({ slots: [], reason: 'closed' });

  const result = await availableSlots(vendor.id, date);
  return NextResponse.json(result, {
    headers: { 'cache-control': 'no-store' },
  });
}
