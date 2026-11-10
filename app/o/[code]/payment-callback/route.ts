import { NextResponse } from 'next/server';
import { markPaymentPaid } from '@/lib/payments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Paystack sends the buyer back here after checkout. The redirect is only a
// hint: the transaction is verified server-side before the order is marked paid.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params;
  const url = new URL(request.url);
  const reference = url.searchParams.get('reference') ?? url.searchParams.get('trxref');

  if (!reference) {
    return NextResponse.redirect(new URL(`/o/${code}?payment=pending`, url.origin));
  }

  const result = await markPaymentPaid(reference).catch((error) => {
    console.error('[payments] callback failed', error);
    return { ok: false as const, error: 'verify failed' };
  });

  return NextResponse.redirect(
    new URL(`/o/${code}?payment=${result.ok ? 'paid' : 'pending'}`, url.origin),
  );
}
