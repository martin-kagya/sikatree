import { NextResponse } from 'next/server';
import { clientIp } from '@/lib/admin-auth';
import { normalizeHandle } from '@/lib/handle';
import { hitRateLimit } from '@/lib/rate-limit';
import { checkHandleAvailability, suggestAvailable } from '@/lib/waitlist';

// Real-time handle availability for the signup form (LP-11). The server action
// re-checks before reserving, so this endpoint is only a hint.
export async function GET(request: Request) {
  const ip = clientIp(request.headers);
  const limit = await hitRateLimit(`handles:ip:${ip}`, 240, 60);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const raw = new URL(request.url).searchParams.get('handle') ?? '';
  const handle = normalizeHandle(raw);

  if (!handle) {
    return NextResponse.json({ handle, available: false, reason: 'invalid' }, { status: 200 });
  }

  try {
    const result = await checkHandleAvailability(handle);
    const suggestion =
      !result.available && result.reason === 'taken' ? await suggestAvailable(handle) : undefined;
    return NextResponse.json(
      { handle, ...result, suggestion },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    console.error('[handles] check failed', error);
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
}
