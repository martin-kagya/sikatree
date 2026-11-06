import { db } from '@/lib/db';

// Inventory helpers (INV-04, INV-05). Money stays in integer pesewas elsewhere;
// these are stock counts and deltas.

export type MovementSource = 'manual' | 'order' | 'cancellation';

export type StockMovement = {
  id: string;
  delta: number;
  source: MovementSource;
  reason: string | null;
  createdAt: string;
};

export async function recordStockMovement(
  itemId: string,
  delta: number,
  source: MovementSource,
  reason: string | null = null,
): Promise<void> {
  if (delta === 0) return;
  await db().query(
    `insert into stock_movement (item_id, delta, source, reason) values ($1, $2, $3, $4)`,
    [itemId, delta, source, reason],
  );
}

export async function listLowStockItems(
  vendorId: string,
  threshold: number,
): Promise<{ id: string; name: string; stock: number }[]> {
  const rows = await db().query<{ id: string; name: string; stock: number }>(
    `select id, name, stock
       from items
      where vendor_id = $1 and stock is not null and stock <= $2 and status = 'active'
      order by stock, name`,
    [vendorId, threshold],
  );
  return rows.rows;
}

export type ThresholdUpdate = { ok: true } | { ok: false; error: string };

// A null threshold turns low-stock alerts off; otherwise it must be a whole
// number of units at or below which the vendor wants an alert.
export async function updateLowStockThreshold(
  vendorId: string,
  threshold: number | null,
): Promise<ThresholdUpdate> {
  if (threshold !== null && (!Number.isInteger(threshold) || threshold < 0 || threshold > 999_999)) {
    return { ok: false, error: 'Low-stock threshold must be a whole number, or blank to turn off.' };
  }

  const rows = await db().query<{ id: string }>(
    `update vendors set low_stock_threshold = $2, updated_at = now()
      where id = $1 returning id`,
    [vendorId, threshold],
  );
  if (!rows.rows[0]) return { ok: false, error: 'Vendor not found.' };
  return { ok: true };
}

export async function listStockMovements(
  itemId: string,
  limit = 20,
): Promise<StockMovement[]> {
  const rows = await db().query<{
    id: string;
    delta: number;
    source: MovementSource;
    reason: string | null;
    created_at: Date;
  }>(
    `select id, delta, source, reason, created_at
       from stock_movement where item_id = $1 order by created_at desc limit $2`,
    [itemId, limit],
  );
  return rows.rows.map((row) => ({
    id: row.id,
    delta: row.delta,
    source: row.source,
    reason: row.reason,
    createdAt: row.created_at.toISOString(),
  }));
}
