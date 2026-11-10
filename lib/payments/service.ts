import { randomBytes } from 'node:crypto';
import { appUrl } from '@/lib/brand';
import { db, query } from '@/lib/db';
import { notifyVendorOfLowStock, notifyVendorOfOrder } from '@/lib/notifications';
import { getOrderByCode, updateOrderStatus } from '@/lib/orders';
import { getPaymentProvider } from '@/lib/payments/paystack';
import type { PaymentProvider, VerifiedPayment } from '@/lib/payments/provider';

// A pending authorization is held this long before the order is released and
// its stock restored. Paystack checkouts normally settle in seconds to minutes.
function holdMinutes(): number {
  const value = Number(process.env.PAYMENT_HOLD_MINUTES);
  return Number.isFinite(value) && value >= 5 && value <= 180 ? Math.floor(value) : 30;
}

function newReference(orderCode: string): string {
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `SIK-${orderCode.replace('ORD-', '')}-${suffix}`;
}

export type StartPaymentResult =
  | { ok: true; authorizationUrl: string }
  | { ok: false; error: string };

// Creates (or reuses) a payment intent for an existing order and returns the
// Paystack checkout URL. The amount always comes from the stored order, never
// from the browser.
export async function startPayment(
  orderCode: string,
  provider: PaymentProvider | null = getPaymentProvider(),
): Promise<StartPaymentResult> {
  if (!provider) return { ok: false, error: 'Online payment is not configured.' };

  const order = await getOrderByCode(orderCode);
  if (!order) return { ok: false, error: 'Order not found.' };
  if (order.paymentStatus === 'paid') return { ok: false, error: 'This order is already paid.' };
  if (order.status === 'cancelled') return { ok: false, error: 'This order was cancelled.' };

  const live = await query<{ authorization_url: string }>(
    `select authorization_url from payments
      where order_id = $1 and status = 'pending' and expires_at > now()
        and authorization_url is not null
      order by created_at desc limit 1`,
    [order.id],
  );
  if (live[0]?.authorization_url) {
    return { ok: true, authorizationUrl: live[0].authorization_url };
  }

  // Close stale intents so the one-pending-per-order index admits a fresh row.
  await query(
    `update payments set status = 'abandoned', updated_at = now()
      where order_id = $1 and status = 'pending'`,
    [order.id],
  );

  const reference = newReference(order.code);
  const expiresAt = new Date(Date.now() + holdMinutes() * 60_000);
  try {
    await query(
      `insert into payments (order_id, reference, amount_pesewas, expires_at)
       values ($1, $2, $3, $4)`,
      [order.id, reference, order.totalPesewas, expiresAt],
    );
  } catch (error) {
    if ((error as { code?: string }).code !== '23505') throw error;
    // Another request created the intent first; reuse it if it has a URL.
    const raced = await query<{ authorization_url: string }>(
      `select authorization_url from payments
        where order_id = $1 and status = 'pending' and authorization_url is not null
        order by created_at desc limit 1`,
      [order.id],
    );
    if (raced[0]?.authorization_url) {
      return { ok: true, authorizationUrl: raced[0].authorization_url };
    }
    return { ok: false, error: 'A payment is already starting for this order. Try again.' };
  }

  let authorizationUrl: string;
  try {
    const initialized = await provider.initialize({
      reference,
      amountPesewas: order.totalPesewas,
      email: order.customerEmail,
      callbackUrl: `${appUrl()}/o/${order.code}/payment-callback`,
      metadata: { order: order.code },
    });
    authorizationUrl = initialized.authorizationUrl;
  } catch (error) {
    console.error('[payments] initialize failed', error instanceof Error ? error.message : error);
    await query(`update payments set status = 'failed', updated_at = now() where reference = $1`, [
      reference,
    ]);
    // The order was only created for this payment; release the stock right away.
    await updateOrderStatus(
      order.id,
      order.vendorId,
      'cancelled',
      'Payment could not start',
    ).catch(() => undefined);
    return {
      ok: false,
      error: 'Could not start the payment. Choose pay on delivery or try again.',
    };
  }

  await query(
    `update payments set authorization_url = $2, updated_at = now() where reference = $1`,
    [reference, authorizationUrl],
  );
  return { ok: true, authorizationUrl };
}

export type MarkPaidResult =
  | { ok: true; already: boolean; code: string }
  | { ok: false; error: string };

// A provider reported a failed attempt. The intent stops being pending, so a
// retry starts a fresh one; the order itself is released by expiry.
export async function markPaymentFailed(reference: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `update payments set status = 'failed', updated_at = now()
      where reference = $1 and status = 'pending'
      returning id`,
    [reference],
  );
  return rows.length > 0;
}

// Verifies a payment with the provider and, when it is successful and matches
// the stored amount, marks it paid exactly once. Callers may inject a provider
// or a pre-verified result (tests, webhook).
export async function markPaymentPaid(
  reference: string,
  options: {
    provider?: PaymentProvider | null;
    verified?: VerifiedPayment;
    notify?: boolean;
  } = {},
): Promise<MarkPaidResult> {
  const provider = options.provider === undefined ? getPaymentProvider() : options.provider;
  if (!options.verified && !provider) {
    return { ok: false, error: 'Online payment is not configured.' };
  }

  let verified = options.verified;
  if (!verified) {
    try {
      verified = await provider!.verify(reference);
    } catch (error) {
      console.error('[payments] verify failed', error instanceof Error ? error.message : error);
      return { ok: false, error: 'Could not verify the payment.' };
    }
  }

  if (verified.status !== 'success') {
    return { ok: false, error: `Payment is ${verified.status}, not successful.` };
  }

  const client = await db().connect();
  let code = '';
  let newlyPaid = false;
  let wasCancelled = false;
  try {
    await client.query('begin');
    const rows = await client.query<{
      payment_id: string;
      payment_status: string;
      amount_pesewas: number;
      order_id: string;
      code: string;
      order_status: string;
      vendor_id: string;
    }>(
      `select p.id as payment_id, p.status as payment_status, p.amount_pesewas,
              o.id as order_id, o.code, o.status as order_status, o.vendor_id
         from payments p
         join orders o on o.id = p.order_id
        where p.reference = $1
        for update of p, o`,
      [reference],
    );
    const payment = rows.rows[0];
    if (!payment) {
      await client.query('rollback');
      return { ok: false, error: 'Payment not found.' };
    }
    code = payment.code;

    if (payment.payment_status === 'paid') {
      await client.query('rollback');
      return { ok: true, already: true, code };
    }

    if (verified.amountPesewas !== payment.amount_pesewas) {
      await client.query('rollback');
      console.error(
        `[payments] amount mismatch for ${reference}: paid ${verified.amountPesewas}, expected ${payment.amount_pesewas}`,
      );
      return { ok: false, error: 'The amount paid does not match the order total.' };
    }
    if (verified.currency !== 'GHS') {
      await client.query('rollback');
      return { ok: false, error: 'The payment currency does not match.' };
    }

    const fee = Math.max(0, Math.min(verified.feesPesewas, payment.amount_pesewas));
    const net = payment.amount_pesewas - fee;
    const paidAt = verified.paidAt ? new Date(verified.paidAt) : new Date();
    wasCancelled = payment.order_status === 'cancelled';

    await client.query(
      `update payments
          set status = 'paid', paid_at = $2, channel = $3, provider_fee_pesewas = $4,
              provider_reference = $5, updated_at = now()
        where id = $1`,
      [payment.payment_id, paidAt, verified.channel, fee, verified.providerReference],
    );

    // The fulfilment lifecycle is untouched; only the payment side moves.
    await client.query(
      `update orders set payment_status = 'paid', paid_at = $2, updated_at = now() where id = $1`,
      [payment.order_id, paidAt],
    );

    if (net > 0) {
      // Settlement ledger: net cash received and the same amount owed to the
      // vendor. Platform and buyer fees arrive with PAY-03/PAY-04.
      await client.query(
        `insert into ledger_entries (payment_id, order_id, account, direction, amount_pesewas, memo)
         values ($1, $2, 'provider_clearing', 'debit', $3, $4),
                ($1, $2, 'vendor_payable', 'credit', $3, $4)`,
        [payment.payment_id, payment.order_id, net, `Payment ${reference}`],
      );
    }

    await client.query('commit');
    newlyPaid = true;
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (newlyPaid && !wasCancelled && options.notify !== false) {
    // Slow channels must not hold the transaction; failures are logged and the
    // payment is already recorded.
    try {
      await notifyVendorOfOrder(code);
      await notifyVendorOfLowStock(code);
    } catch (error) {
      console.error('[payments] notification failed', error);
    }
  } else if (newlyPaid && wasCancelled) {
    // Money arrived after the hold expired and the order was cancelled. Record
    // it, but do not tell the vendor to fulfil it; this needs a manual refund.
    console.warn(`[payments] ${reference} paid after the order was cancelled (${code})`);
  }

  return { ok: true, already: false, code };
}

// Releases orders whose online payment never completed. Called by the job
// runner; stock is restored by the normal cancellation path.
export async function expireUnpaidPayments(limit = 20): Promise<number> {
  const rows = await query<{
    payment_id: string;
    order_id: string;
    vendor_id: string;
  }>(
    `select p.id as payment_id, o.id as order_id, o.vendor_id
       from payments p
       join orders o on o.id = p.order_id
      where p.status = 'pending'
        and p.expires_at < now()
        and o.status = 'pending'
        and o.payment_status = 'pending'
      order by p.expires_at asc
      limit $1`,
    [limit],
  );

  let expired = 0;
  for (const row of rows) {
    const updated = await query<{ id: string }>(
      `update payments set status = 'abandoned', updated_at = now()
        where id = $1 and status = 'pending'
        returning id`,
      [row.payment_id],
    );
    if (!updated.length) continue;

    const cancelled = await updateOrderStatus(
      row.order_id,
      row.vendor_id,
      'cancelled',
      'Payment was not completed',
    ).catch(() => null);
    if (cancelled?.ok) expired += 1;
  }
  return expired;
}
