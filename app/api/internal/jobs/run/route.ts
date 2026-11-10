import { NextResponse } from 'next/server';
import { expireUnpaidPayments } from '@/lib/payments/service';
import { drainOnce } from '@/lib/wa-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by the scheduler (Cloudflare Cron Trigger or an HTTP scheduler) to
// drain the queue. The Authorization header carries CRON_SECRET; without it the
// endpoint stays closed.
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const processed = await drainOnce(10).catch((error) => {
    console.error('[jobs] drain failed', error);
    return 0;
  });

  // Release orders whose online payment never completed and restore their stock.
  const expiredPayments = await expireUnpaidPayments(20).catch((error) => {
    console.error('[jobs] payment expiry failed', error);
    return 0;
  });

  return NextResponse.json({ processed, expiredPayments });
}

export async function POST(request: Request): Promise<Response> {
  return GET(request);
}
