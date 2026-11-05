import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import {
  getOrderByCode,
  listVendorOrders,
  placeOrder,
  setOrderDeliveryFee,
  updateDeliverySettings,
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

  it('charges no delivery in free mode', async () => {
    await updateDeliverySettings(vendorId, 'free', 0, 0);
    const result = await placeOrder(checkoutForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.totalPesewas).toBe(24000);
    expect(result.order.deliveryFeeMode).toBe('free');
  });

  it('charges the configured fixed fee', async () => {
    await updateDeliverySettings(vendorId, 'fixed', 2500, 4000);
    const result = await placeOrder(checkoutForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.totalPesewas).toBe(24000 + 2500);
    expect(result.order.deliveryFeeMode).toBe('fixed');
    expect(result.order.deliveryZone).toBe('within');
  });

  it('charges the outside-region rate for an outside-zone delivery', async () => {
    await updateDeliverySettings(vendorId, 'fixed', 2500, 4000);
    const result = await placeOrder(checkoutForm({ deliveryZone: 'outside' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.totalPesewas).toBe(24000 + 4000);
    expect(result.order.deliveryZone).toBe('outside');
  });

  it('defers the delivery fee to cash on arrival', async () => {
    await updateDeliverySettings(vendorId, 'fixed', 2500, 4000);
    const result = await placeOrder(checkoutForm({ deliveryZone: 'outside', deliveryOnArrival: 'on' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.deliveryOnArrival).toBe(true);
    expect(result.order.totalPesewas).toBe(24000);

    const order = await getOrderByCode(result.order.code);
    expect(order?.deliveryPesewas).toBe(4000);
    expect(order?.deliveryOnArrival).toBe(true);
    expect(order?.totalPesewas).toBe(24000);
  });

  it('snapshots confirm-after and lets the vendor set the fee later', async () => {
    await updateDeliverySettings(vendorId, 'confirm_after', 0, 0);
    const placed = await placeOrder(checkoutForm());
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.order.totalPesewas).toBe(24000);
    expect(placed.order.deliveryFeeMode).toBe('confirm_after');

    const order = await getOrderByCode(placed.order.code);
    expect(order?.deliveryFeeMode).toBe('confirm_after');
    expect(order?.deliveryPesewas).toBe(0);

    const update = await setOrderDeliveryFee(order!.id, vendorId, 3000);
    expect(update).toEqual({ ok: true, totalPesewas: 27000 });

    const after = await getOrderByCode(placed.order.code);
    expect(after?.deliveryPesewas).toBe(3000);
    expect(after?.totalPesewas).toBe(27000);
  });

  it('rejects setting a delivery fee on a non-confirm-after order', async () => {
    const placed = await placeOrder(checkoutForm());
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const order = await getOrderByCode(placed.order.code);
    expect(await setOrderDeliveryFee(order!.id, vendorId, 3000)).toMatchObject({ ok: false });
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

  it('decrements stock on placement and restores it on cancel', async () => {
    const before = await query<{ stock: number }>('select stock from items where id = $1', [
      itemId,
    ]);
    expect(before[0].stock).toBe(8);

    const result = await placeOrder(checkoutForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reserved = await query<{ stock: number }>('select stock from items where id = $1', [
      itemId,
    ]);
    expect(reserved[0].stock).toBe(6);

    const order = await getOrderByCode(result.order.code);
    expect(await updateOrderStatus(order!.id, vendorId, 'cancelled')).toEqual({
      ok: true,
      status: 'cancelled',
    });

    const restored = await query<{ stock: number }>('select stock from items where id = $1', [
      itemId,
    ]);
    expect(restored[0].stock).toBe(8);
  });

  it('does not restore stock for orders that predate decrement', async () => {
    const result = await placeOrder(checkoutForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    await query('update orders set stock_reserved = false');
    const order = await getOrderByCode(result.order.code);
    expect((await updateOrderStatus(order!.id, vendorId, 'cancelled')).ok).toBe(true);

    const stock = await query<{ stock: number }>('select stock from items where id = $1', [
      itemId,
    ]);
    expect(stock[0].stock).toBe(6);
  });

  it('refuses to oversell and leaves stock unchanged', async () => {
    await query('update items set stock = 1 where id = $1', [itemId]);

    const result = await placeOrder(checkoutForm());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('sold out');

    const stock = await query<{ stock: number }>('select stock from items where id = $1', [
      itemId,
    ]);
    expect(stock[0].stock).toBe(1);

    const orders = await query<{ count: string }>('select count(*) from orders');
    expect(orders[0].count).toBe('0');
  });

  it('lets only one of two concurrent buyers take the last unit', async () => {
    await query('update items set stock = 1 where id = $1', [itemId]);
    const one = checkoutForm({ cart: JSON.stringify([{ id: itemId, quantity: 1 }]) });
    const two = checkoutForm({
      cart: JSON.stringify([{ id: itemId, quantity: 1 }]),
      phone: '024 555 9999',
    });

    const results = await Promise.all([placeOrder(one), placeOrder(two)]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);

    const stock = await query<{ stock: number }>('select stock from items where id = $1', [
      itemId,
    ]);
    expect(stock[0].stock).toBe(0);

    const orders = await query<{ count: string }>('select count(*) from orders');
    expect(orders[0].count).toBe('1');
  });

  it('leaves unlimited stock untouched', async () => {
    await query('update items set stock = null where id = $1', [itemId]);

    const result = await placeOrder(checkoutForm());
    expect(result.ok).toBe(true);

    const stock = await query<{ stock: number | null }>('select stock from items where id = $1', [
      itemId,
    ]);
    expect(stock[0].stock).toBeNull();
  });

  it('rejects delivery without an address', async () => {
    expect(await placeOrder(checkoutForm({ address: '' }))).toMatchObject({ ok: false });
  });
});
