import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import {
  listLowStockItems,
  listStockMovements,
  recordStockMovement,
  updateLowStockThreshold,
} from '@/lib/inventory';

let vendorId = '';
let itemId = '';

beforeEach(async () => {
  await query('truncate stock_movement, orders, order_items, items, vendors restart identity cascade');

  const vendor = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at)
     values ('+233241234567', 'Ama', 'amasglow', 'products', 'live', now())
     returning id`,
  );
  vendorId = vendor[0].id;

  const item = await query<{ id: string }>(
    `insert into items (vendor_id, name, price_pesewas, stock, status)
     values ($1, 'Serum', 12000, 3, 'active') returning id`,
    [vendorId],
  );
  itemId = item[0].id;
});

afterAll(async () => {
  await db().end();
});

describe('stock movement log', () => {
  it('records a manual adjustment with a reason', async () => {
    await recordStockMovement(itemId, -2, 'manual', 'Damaged in transit');

    const movements = await listStockMovements(itemId);
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      delta: -2,
      source: 'manual',
      reason: 'Damaged in transit',
    });
  });

  it('ignores a zero delta', async () => {
    await recordStockMovement(itemId, 0, 'manual', 'No change');
    expect(await listStockMovements(itemId)).toHaveLength(0);
  });
});

describe('low stock', () => {
  it('lists items at or below the threshold and accepts turning off', async () => {
    expect((await updateLowStockThreshold(vendorId, 5)).ok).toBe(true);
    const items = await listLowStockItems(vendorId, 5);
    expect(items.map((item) => item.name)).toEqual(['Serum']);

    expect((await updateLowStockThreshold(vendorId, null)).ok).toBe(true);
  });

  it('rejects a non-integer threshold', async () => {
    expect((await updateLowStockThreshold(vendorId, 1.5)).ok).toBe(false);
  });
});
