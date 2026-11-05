import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import {
  getOrderByCode,
  listVendorOrders,
  placeOrder,
  updateOrderStatus,
} from '@/lib/orders';

let vendorId = '';
let itemId = '';
let soldOutId = '';

beforeEach(async () => {
  await query('truncate orders, order_items, items, vendors, rate_limit restart identity cascade');

  const vendor = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at, location)
     values ('+233241234567', 'Ama''s Glow Studio', 'amasglow', 'products', 'live', now(), 'Kumasi')
     returning id`,
  );
  vendorId = vendor[0].id;

  const items = await query<{ id: string }>(
    `insert into items (vendor_id, name, price_pesewas, stock, status, category, position)
     values ($1, 'Vitamin C serum', 12000, 8, 'active', 'Serums', 0),
            ($1, 'Sold out butter', 4500, 0, 'active', 'Body', 1)
     returning id`,
    [vendorId],
  );
  itemId = items[0].id;
  soldOutId = items[1].id;
});

afterAll(async () => {
  await db().end();
});

function checkoutForm(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  data.set('handle', 'amasglow');
  data.set('cart', JSON.stringify([{ id: itemId, quantity: 2 }]));
  data.set('fulfilment', 'delivery');
  data.set('name', 'Kofi Mensah');
  data.set('phone', '024 555 1234');
  data.set('email', 'kofi@example.com');
  data.set('address', '12 Oxford Street, Osu, near the pharmacy');
  data.set('notes', 'Call on arrival');
  for (const [key, value] of Object.entries(overrides)) data.set(key, value);
  return data;
}

describe('placeOrder', () => {
  it('creates an order with server-side totals and a code', async () => {
    const result = await placeOrder(checkoutForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.order.code).toMatch(/^ORD-/);
    expect(result.order.totalPesewas).toBe(24000 + 1500);
    expect(result.order.eta).toContain('45 to 60');

    const orders = await query<{
      code: string;
      fulfilment: string;
      subtotal_pesewas: number;
      delivery_pesewas: number;
      total_pesewas: number;
      customer_email: string;
      status: string;
    }>('select code, fulfilment, subtotal_pesewas, delivery_pesewas, total_pesewas, customer_email, status from orders');
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      code: result.order.code,
      fulfilment: 'delivery',
      subtotal_pesewas: 24000,
      delivery_pesewas: 1500,
      total_pesewas: 25500,
      customer_email: 'kofi@example.com',
      status: 'pending',
    });

    const lines = await query<{ name: string; quantity: number; line_total_pesewas: number }>(
      'select name, quantity, line_total_pesewas from order_items',
    );
    expect(lines).toEqual([{ name: 'Vitamin C serum', quantity: 2, line_total_pesewas: 24000 }]);
  });

  it('books an appointment for a service vendor', async () => {
    await query("update vendors set type = 'services' where id = $1", [vendorId]);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = await placeOrder(
      checkoutForm({
        bookingDate: tomorrow,
        bookingTime: '10:00',
        address: '',
        fulfilment: 'appointment',
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.fulfilment).toBe('appointment');
    expect(result.order.totalPesewas).toBe(24000);
    expect(result.order.eta).toContain('Appointment on');
  });

  it('waives delivery for pickup', async () => {
    const result = await placeOrder(checkoutForm({ fulfilment: 'pickup', address: '' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.totalPesewas).toBe(24000);
  });

  it('rejects bad email, bad phone and sold-out items', async () => {
    expect(await placeOrder(checkoutForm({ email: 'not-an-email' }))).toMatchObject({ ok: false });
    expect(await placeOrder(checkoutForm({ phone: '12345' }))).toMatchObject({ ok: false });
    expect(
      await placeOrder(
        checkoutForm({ cart: JSON.stringify([{ id: soldOutId, quantity: 1 }]) }),
      ),
    ).toMatchObject({ ok: false });
  });

  it('moves through the lifecycle and rejects skips', async () => {
    const result = await placeOrder(checkoutForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const placed = await getOrderByCode(result.order.code);
    expect(placed).not.toBeNull();
    expect(placed?.status).toBe('pending');
    expect(placed?.lines).toEqual([
      { name: 'Vitamin C serum', quantity: 2, pricePesewas: 12000, lineTotalPesewas: 24000 },
    ]);

    const confirmed = await updateOrderStatus(placed!.id, vendorId, 'confirmed');
    expect(confirmed).toEqual({ ok: true, status: 'confirmed' });

    const skipped = await updateOrderStatus(placed!.id, vendorId, 'completed');
    expect(skipped.ok).toBe(false);

    expect((await updateOrderStatus(placed!.id, vendorId, 'ready')).ok).toBe(true);
    expect((await updateOrderStatus(placed!.id, vendorId, 'completed')).ok).toBe(true);

    const done = await getOrderByCode(result.order.code);
    expect(done?.status).toBe('completed');

    expect(await listVendorOrders(vendorId)).toHaveLength(1);
  });

  it('does not let another vendor move an order', async () => {
    const result = await placeOrder(checkoutForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const other = await query<{ id: string }>(
      `insert into vendors (phone, name, handle, type, status, consent_at)
       values ('+233249999999', 'Other Shop', 'othershop', 'products', 'live', now())
       returning id`,
    );

    const order = await getOrderByCode(result.order.code);
    const attempt = await updateOrderStatus(order!.id, other[0].id, 'confirmed');
    expect(attempt).toMatchObject({ ok: false });
  });

  it('rejects delivery without an address', async () => {
    expect(await placeOrder(checkoutForm({ address: '' }))).toMatchObject({ ok: false });
  });
});
