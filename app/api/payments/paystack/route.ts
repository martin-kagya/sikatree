import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPaymentProvider } from '@/lib/payments/paystack';
import { markPaymentFailed, markPaymentPaid } from '@/lib/payments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Paystack webhook. The signature is checked over the raw body, then the
// transaction is verified with the API before anything is marked paid. Events
// are recorded after they are applied, so a failed delivery is retried.
export async function POST(request: Request): Promise<Response> {
  const provider = getPaymentProvider();
  if (!provider) return new NextResponse('Payments are not configured', { status: 503 });

  const raw = await request.text();
  if (!provider.verifyWebhook(raw, request.headers.get('x-paystack-signature'))) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const event = provider.parseWebhook(raw);
  if (!event) return NextResponse.json({ ok: true, ignored: true });

  if (event.reference && event.type === 'charge.success') {
    const result = await markPaymentPaid(event.reference, { provider }).catch((error) => {
      console.error('[payments] webhook processing failed', error);
      return { ok: false as const, error: 'processing failed' };
    });
    if (!result.ok) {
      console.error('[payments] charge.success not applied:', result.error);
      // A mismatch or a missing payment will never fix itself; acknowledge it so
      // Paystack stops retrying. Verification and database failures are retried.
      const permanent = /not found|does not match|not successful|currency/i.test(result.error);
      return NextResponse.json({ ok: false, error: result.error }, { status: permanent ? 200 : 500 });
    }
  } else if (event.reference && event.type === 'charge.failed') {
    await markPaymentFailed(event.reference).catch((error) => {
      console.error('[payments] charge.failed not applied', error);
    });
  }

  await query(
    `insert into payment_events (provider, provider_event_id, reference, payload)
     values ($1, $2, $3, $4::jsonb)
     on conflict (provider, provider_event_id) do nothing`,
    [provider.name, event.id, event.reference, raw],
  );

  return NextResponse.json({ ok: true });
}
