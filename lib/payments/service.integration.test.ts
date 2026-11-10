import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import { getOrderByCode, placeOrder, updateOrderStatus } from '@/lib/orders';
import type { PaymentProvider, VerifiedPayment } from '@/lib/payments/provider';
import {
  expireUnpaidPayments,
  markPaymentFailed,
  markPaymentPaid,
  startPayment,
} from '@/lib/payments/service';

let vendorId = '';
let itemId = '';

beforeEach(async () => {
  await query(
    `truncate ledger_entries, payment_events, payments, login_link, stock_movement,
             order_items, orders, items, vendors, rate_limit restart identity cascade`,
  );

  const vendor = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at)
     values ('+233241234567', 'Ama''s Glow Studio', 'amasglow', 'products', 'live', now())
     returning id`,
  );
  vendorId = vendor[0].id;

  const items = await query<{ id: string }>(
    `insert into items (vendor_id, name, price_pesewas, stock, status)
     values ($1, 'Vitamin C serum', 12000, 8, 'active') returning id`,
    [vendorId],
  );
  itemId = items[0].id;
});

afterAll(async () => {
  await db().end();
});

function checkoutForm(): FormData {
  const data = new FormData();
  data.set('handle', 'amasglow');
  data.set('cart', JSON.stringify([{ id: itemId, quantity: 2 }]));
  data.set('fulfilment', 'delivery');
  data.set('name', 'Kofi Mensah');
  data.set('phone', '024 555 1234');
  data.set('email', 'kofi@example.com');
  data.set('address', '12 Oxford Street, Osu, near the pharmacy');
  return data;
}

async function placeOnlineOrder(): Promise<{ code: string; totalPesewas: number }> {
  const result = await placeOrder(checkoutForm());
  if (!result.ok) throw new Error(result.error);
  await query(
    `update orders set payment_method = 'online', payment_status = 'pending' where code = $1`,
    [result.order.code],
  );
  return { code: result.order.code, totalPesewas: result.order.totalPesewas };
}

function fakeProvider(options: {
  initialize?: (input: { reference: string; amountPesewas: number }) => Promise<{
    reference: string;
    authorizationUrl: string;
  }>;
  verify?: (amountPesewas: number) => Promise<VerifiedPayment>;
} = {}): PaymentProvider {
  const verify = options.verify ?? (async (amount: number) => ({
    reference: 'ref',
    status: 'success' as const,
    amountPesewas: amount,
    currency: 'GHS',
    channel: 'mobile_money',
    feesPesewas: 500,
    providerReference: '4242',
    paidAt: new Date().toISOString(),
  }));

  return {
    name: 'fake',
    async initialize(input) {
      if (options.initialize) return options.initialize(input);
      return {
        reference: input.reference,
        authorizationUrl: `https://checkout.test/${input.reference}`,
      };
    },
    async verify() {
      const row = await query<{ amount_pesewas: number }>(
        `select amount_pesewas from payments order by created_at desc limit 1`,
      );
      return verify(row[0]?.amount_pesewas ?? 0);
    },
    verifyWebhook: () => true,
    parseWebhook: () => null,
  };
}

describe('startPayment', () => {
  it('creates one pending intent and reuses its checkout url', async () => {
    const { code, totalPesewas } = await placeOnlineOrder();
    const provider = fakeProvider();

    const first = await startPayment(code, provider);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.authorizationUrl).toContain('https://checkout.test/');

    const second = await startPayment(code, provider);
    expect(second).toEqual(first);

    const payments = await query<{ amount_pesewas: number; status: string }>(
      `select amount_pesewas, status from payments`,
    );
    expect(payments).toHaveLength(1);
    expect(payments[0]).toEqual({ amount_pesewas: totalPesewas, status: 'pending' });
  });

  it('cancels the order and restores stock when initialization fails', async () => {
    const { code } = await placeOnlineOrder();
    const provider = fakeProvider({
      initialize: async () => {
        throw new Error('network down');
      },
    });

    const result = await startPayment(code, provider);
    expect(result.ok).toBe(false);

    const order = await getOrderByCode(code);
    expect(order?.status).toBe('cancelled');
    expect(order?.paymentStatus).toBe('failed');
    expect(order?.cancellationReason).toBe('Payment could not start');

    const stock = await query<{ stock: number }>(`select stock from items where id = $1`, [itemId]);
    expect(stock[0].stock).toBe(8);

    const payment = await query<{ status: string }>(`select status from payments`);
    expect(payment[0].status).toBe('failed');
  });
});

describe('markPaymentPaid', () => {
  it('marks the order paid, writes the settlement ledger and is idempotent', async () => {
    const { code, totalPesewas } = await placeOnlineOrder();
    const provider = fakeProvider();
    const started = await startPayment(code, provider);
    expect(started.ok).toBe(true);

    const first = await markPaymentPaid(
      (await query<{ reference: string }>(`select reference from payments`))[0].reference,
      { provider, notify: false },
    );
    expect(first).toMatchObject({ ok: true, already: false, code });

    const order = await getOrderByCode(code);
    expect(order?.paymentStatus).toBe('paid');
    expect(order?.paidAt).not.toBeNull();

    const payment = await query<{ status: string; provider_fee_pesewas: number }>(
      `select status, provider_fee_pesewas from payments`,
    );
    expect(payment[0]).toEqual({ status: 'paid', provider_fee_pesewas: 500 });

    const ledger = await query<{
      account: string;
      direction: string;
      amount_pesewas: number;
    }>(`select account, direction, amount_pesewas from ledger_entries order by id`);
    expect(ledger).toEqual([
      { account: 'provider_clearing', direction: 'debit', amount_pesewas: totalPesewas - 500 },
      { account: 'vendor_payable', direction: 'credit', amount_pesewas: totalPesewas - 500 },
    ]);

    const second = await markPaymentPaid(
      (await query<{ reference: string }>(`select reference from payments`))[0].reference,
      { provider, notify: false },
    );
    expect(second).toMatchObject({ ok: true, already: true });
    const count = await query<{ count: string }>(`select count(*) from ledger_entries`);
    expect(Number(count[0].count)).toBe(2);
  });

  it('refuses to mark a payment paid when the amount does not match', async () => {
    const { code, totalPesewas } = await placeOnlineOrder();
    const reference = 'SIK-TEST-1';
    await query(
      `insert into payments (order_id, reference, amount_pesewas, expires_at)
       select id, $2, total_pesewas, now() + interval '30 minutes' from orders where code = $1`,
      [code, reference],
    );
    const provider = fakeProvider({
      verify: async (amount) => ({
        reference,
        status: 'success',
        amountPesewas: amount + 1,
        currency: 'GHS',
        channel: 'card',
        feesPesewas: 0,
        providerReference: '1',
        paidAt: null,
      }),
    });

    const result = await markPaymentPaid(reference, { provider, notify: false });
    expect(result.ok).toBe(false);
    const order = await getOrderByCode(code);
    expect(order?.paymentStatus).toBe('pending');
    const ledger = await query<{ count: string }>(`select count(*) from ledger_entries`);
    expect(Number(ledger[0].count)).toBe(0);
    expect(totalPesewas).toBeGreaterThan(0);
  });
});

describe('unpaid online orders', () => {
  it('cannot be confirmed by the vendor before payment', async () => {
    const { code } = await placeOnlineOrder();
    const order = await getOrderByCode(code);
    if (!order) throw new Error('missing order');

    const result = await updateOrderStatus(order.id, order.vendorId, 'confirmed');
    expect(result).toEqual({ ok: false, error: 'This online order has not been paid yet.' });

    const cancelled = await updateOrderStatus(order.id, order.vendorId, 'cancelled', 'Changed mind');
    expect(cancelled.ok).toBe(true);
  });
});

describe('expiry', () => {
  it('abandons an expired payment and releases the order', async () => {
    const { code } = await placeOnlineOrder();
    const provider = fakeProvider();
    await startPayment(code, provider);

    await query(`update payments set expires_at = now() - interval '1 minute'`);

    const expired = await expireUnpaidPayments();
    expect(expired).toBe(1);

    const order = await getOrderByCode(code);
    expect(order?.status).toBe('cancelled');
    expect(order?.paymentStatus).toBe('failed');
    expect(order?.cancellationReason).toBe('Payment was not completed');

    const stock = await query<{ stock: number }>(`select stock from items where id = $1`, [itemId]);
    expect(stock[0].stock).toBe(8);

    const payment = await query<{ status: string }>(`select status from payments`);
    expect(payment[0].status).toBe('abandoned');
  });

  it('marks a failed attempt without cancelling the order', async () => {
    const { code } = await placeOnlineOrder();
    const provider = fakeProvider();
    await startPayment(code, provider);
    const reference = (await query<{ reference: string }>(`select reference from payments`))[0]
      .reference;

    expect(await markPaymentFailed(reference)).toBe(true);

    const order = await getOrderByCode(code);
    expect(order?.status).toBe('pending');
    const payment = await query<{ status: string }>(`select status from payments`);
    expect(payment[0].status).toBe('failed');
  });
});
