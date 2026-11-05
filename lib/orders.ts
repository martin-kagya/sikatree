import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { normalizeGhanaPhone } from '@/lib/phone';
import { hitRateLimit } from '@/lib/rate-limit';
import {
  DELIVERY_FEE_MODES,
  DELIVERY_ZONES,
  deliveryFeePesewas,
  type DeliveryFeeMode,
  type DeliveryZone,
} from '@/lib/shop';

// Guest checkout (ORD-04). Prices are always recomputed from the database; the
// browser only sends item ids and quantities.

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

class StockError extends Error {
  constructor(readonly itemName: string) {
    super(`${itemName} is sold out`);
    this.name = 'StockError';
  }
}

export type Fulfilment = 'delivery' | 'pickup' | 'appointment';

export type CheckoutOrder = {
  code: string;
  totalPesewas: number;
  eta: string;
  email: string;
  vendorName: string;
  fulfilment: Fulfilment;
  deliveryFeeMode: DeliveryFeeMode;
  deliveryZone: DeliveryZone | null;
  deliveryOnArrival: boolean;
  createdAt: string;
};

export type CheckoutState =
  | { ok: true; order: CheckoutOrder }
  | { ok: false; error: string };

export function newOrderCode(): string {
  const bytes = randomBytes(4);
  let code = '';
  for (let index = 0; index < 4; index += 1) code += CROCKFORD[bytes[index] % CROCKFORD.length];
  return `ORD-${code}`;
}

export function etaFor(
  fulfilment: Fulfilment,
  bookingAt: Date | null,
  deliveryText = 'Delivery in 45 to 60 minutes',
  pickupText = 'Ready for pickup in about 30 minutes',
): string {
  if (fulfilment === 'appointment' && bookingAt) {
    const when = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Accra',
    }).format(bookingAt);
    return `Appointment on ${when}`;
  }
  if (fulfilment === 'pickup') return pickupText;
  return deliveryText;
}

type CartLine = { id: string; quantity: number };

function parseCart(raw: string): CartLine[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length || parsed.length > 30) return null;
    const lines: CartLine[] = [];
    for (const entry of parsed) {
      const id = typeof entry?.id === 'string' ? entry.id : '';
      const quantity = Number(entry?.quantity);
      if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return null;
      lines.push({ id, quantity });
    }
    return lines;
  } catch {
    return null;
  }
}

export async function placeOrder(formData: FormData): Promise<CheckoutState> {
  const handle = String(formData.get('handle') ?? '').trim();
  const rawCart = String(formData.get('cart') ?? '');
  const fulfilmentRaw = String(formData.get('fulfilment') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const phoneRaw = String(formData.get('phone') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const address = String(formData.get('address') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  const bookingDate = String(formData.get('bookingDate') ?? '').trim();
  const bookingTime = String(formData.get('bookingTime') ?? '').trim();
  const deliveryZoneRaw = String(formData.get('deliveryZone') ?? '').trim();
  const deliveryOnArrivalRaw = String(formData.get('deliveryOnArrival') ?? '').trim();

  if (!handle) return { ok: false, error: 'Shop not found.' };
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: 'Enter the name for this order.' };
  }

  const phone = normalizeGhanaPhone(phoneRaw);
  if (!phone) return { ok: false, error: 'Enter a Ghana mobile number, like 024 123 4567.' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email for order updates.' };
  if (notes.length > 500) return { ok: false, error: 'Keep notes under 500 characters.' };

  const lines = parseCart(rawCart);
  if (!lines) return { ok: false, error: 'Your cart is empty.' };

  const vendors = await db().query<{
    id: string;
    name: string;
    type: 'products' | 'services' | 'both' | null;
    status: string;
    delivery_fee_mode: DeliveryFeeMode;
    delivery_fee_pesewas: number;
    delivery_fee_outside_pesewas: number;
    eta_delivery_text: string;
    eta_pickup_text: string;
  }>(
    `select id, name, type, status, delivery_fee_mode, delivery_fee_pesewas,
            delivery_fee_outside_pesewas, eta_delivery_text, eta_pickup_text
       from vendors where handle = $1`,
    [handle],
  );
  const vendor = vendors.rows[0];
  if (!vendor || vendor.status !== 'live') return { ok: false, error: 'Shop not found.' };

  const sellsServices = vendor.type === 'services';
  const fulfilment: Fulfilment = sellsServices
    ? 'appointment'
    : fulfilmentRaw === 'pickup'
      ? 'pickup'
      : 'delivery';

  if (fulfilment === 'delivery' && address.length < 8) {
    return { ok: false, error: 'Add a delivery address so the vendor can find you.' };
  }

  let bookingAt: Date | null = null;
  if (fulfilment === 'appointment') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || !/^\d{2}:\d{2}$/.test(bookingTime)) {
      return { ok: false, error: 'Choose a date and time for your appointment.' };
    }
    bookingAt = new Date(`${bookingDate}T${bookingTime}:00Z`);
    if (Number.isNaN(bookingAt.getTime()) || bookingAt.getTime() < Date.now()) {
      return { ok: false, error: 'Choose a date and time in the future.' };
    }
  }

  const ids = lines.map((line) => line.id);
  const itemRows = await db().query<{
    id: string;
    name: string;
    price_pesewas: number;
    stock: number | null;
    status: string;
  }>(
    `select id, name, price_pesewas, stock, status
       from items
      where vendor_id = $1 and id = any($2::uuid[])`,
    [vendor.id, ids],
  );

  const byId = new Map(itemRows.rows.map((row) => [row.id, row]));
  const orderItems: { id: string; name: string; price: number; quantity: number; total: number }[] = [];

  for (const line of lines) {
    const item = byId.get(line.id);
    if (!item || item.status !== 'active') {
      return { ok: false, error: 'One of the items is no longer available.' };
    }
    if (item.stock !== null && item.stock <= 0) {
      return { ok: false, error: `${item.name} is sold out.` };
    }
    orderItems.push({
      id: item.id,
      name: item.name,
      price: item.price_pesewas,
      quantity: line.quantity,
      total: item.price_pesewas * line.quantity,
    });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const deliveryFeeMode: DeliveryFeeMode = DELIVERY_FEE_MODES.includes(vendor.delivery_fee_mode)
    ? vendor.delivery_fee_mode
    : 'fixed';

  // Zonal rates apply only to fixed-mode delivery; the client picks the zone.
  const deliveryZone: DeliveryZone | null =
    deliveryFeeMode === 'fixed' && fulfilment === 'delivery'
      ? DELIVERY_ZONES.includes(deliveryZoneRaw as DeliveryZone)
        ? (deliveryZoneRaw as DeliveryZone)
        : 'within'
      : null;

  const delivery = fulfilment === 'delivery'
    ? deliveryFeePesewas(
        deliveryFeeMode,
        vendor.delivery_fee_pesewas,
        vendor.delivery_fee_outside_pesewas,
        deliveryZone,
      )
    : 0;

  // The client can defer the delivery fee to cash on arrival. It is still
  // recorded on the order for the vendor, but excluded from the total.
  const deliveryOnArrival =
    fulfilment === 'delivery' &&
    deliveryFeeMode === 'fixed' &&
    (deliveryOnArrivalRaw === 'on' || deliveryOnArrivalRaw === 'true');

  const total = subtotal + (deliveryOnArrival ? 0 : delivery);
  const eta = etaFor(fulfilment, bookingAt, vendor.eta_delivery_text, vendor.eta_pickup_text);
  const reservesStock = orderItems.some((item) => byId.get(item.id)?.stock !== null);

  const limit = await hitRateLimit(`order:phone:${phone}`, 5, 3600).catch(() => null);
  if (limit && !limit.allowed) {
    return { ok: false, error: 'Too many orders from this number. Try again later.' };
  }

  const client = await db().connect();
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = newOrderCode();
      try {
        await client.query('begin');
        const inserted = await client.query<{ id: string; created_at: Date }>(
          `insert into orders
             (code, vendor_id, customer_name, customer_phone, customer_email, fulfilment,
              address, notes, booking_at, subtotal_pesewas, delivery_pesewas, total_pesewas,
              status, eta_text, stock_reserved, delivery_fee_mode, delivery_zone,
              delivery_on_arrival)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',$13,$14,$15,$16,$17)
           returning id, created_at`,
          [
            code,
            vendor.id,
            name,
            phone,
            email,
            fulfilment,
            fulfilment === 'delivery' ? address : null,
            notes || null,
            bookingAt ? bookingAt.toISOString() : null,
            subtotal,
            delivery,
            total,
            eta,
            reservesStock,
            deliveryFeeMode,
            deliveryZone,
            deliveryOnArrival,
          ],
        );
        const orderId = inserted.rows[0].id;

        for (const item of orderItems) {
          // The conditional update is the race guard: two buyers can read the
          // same stock, but only one update can take the last unit.
          const stock = await client.query<{ stock: number | null }>(
            `update items
                set stock = case when stock is null then null else stock - $2 end
              where id = $1 and vendor_id = $3 and status = 'active'
                and (stock is null or stock >= $2)
              returning stock`,
            [item.id, item.quantity, vendor.id],
          );
          if (!stock.rowCount) throw new StockError(item.name);

          await client.query(
            `insert into order_items (order_id, item_id, name, price_pesewas, quantity, line_total_pesewas)
             values ($1,$2,$3,$4,$5,$6)`,
            [orderId, item.id, item.name, item.price, item.quantity, item.total],
          );
        }

        await client.query('commit');
        return {
          ok: true,
          order: {
            code,
            totalPesewas: total,
            eta,
            email,
            vendorName: vendor.name,
            fulfilment,
            deliveryFeeMode,
            deliveryZone,
            deliveryOnArrival,
            createdAt: inserted.rows[0].created_at.toISOString(),
          },
        };
      } catch (error) {
        await client.query('rollback').catch(() => {});
        if (error instanceof StockError) {
          return {
            ok: false,
            error: `${error.itemName} just sold out. Try a smaller quantity or pick another item.`,
          };
        }
        if ((error as { code?: string }).code === '23505' && attempt < 4) continue;
        throw error;
      }
    }
    return { ok: false, error: 'Could not place the order. Try again.' };
  } catch (error) {
    console.error('[orders] place failed', error);
    return { ok: false, error: 'Could not place the order. Try again.' };
  } finally {
    client.release();
  }
}

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'ready',
  'completed',
  'cancelled',
];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

export type OrderLine = {
  name: string;
  quantity: number;
  pricePesewas: number;
  lineTotalPesewas: number;
};

export type OrderRecord = {
  id: string;
  code: string;
  vendorId: string;
  vendorName: string;
  vendorHandle: string;
  vendorPhone: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  fulfilment: Fulfilment;
  address: string | null;
  notes: string | null;
  bookingAt: string | null;
  subtotalPesewas: number;
  deliveryPesewas: number;
  deliveryFeeMode: DeliveryFeeMode;
  deliveryZone: DeliveryZone | null;
  deliveryOnArrival: boolean;
  totalPesewas: number;
  status: OrderStatus;
  eta: string | null;
  createdAt: string;
  updatedAt: string;
  lines: OrderLine[];
};

type OrderRow = {
  id: string;
  code: string;
  vendor_id: string;
  vendor_name: string;
  vendor_handle: string;
  vendor_phone: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  fulfilment: Fulfilment;
  address: string | null;
  notes: string | null;
  booking_at: Date | null;
  subtotal_pesewas: number;
  delivery_pesewas: number;
  delivery_fee_mode: DeliveryFeeMode;
  delivery_zone: DeliveryZone | null;
  delivery_on_arrival: boolean;
  total_pesewas: number;
  status: OrderStatus;
  eta_text: string | null;
  created_at: Date;
  updated_at: Date;
};

const ORDER_SELECT = `
  select o.id, o.code, o.vendor_id, v.name as vendor_name, v.handle as vendor_handle,
         v.phone as vendor_phone, o.customer_name, o.customer_phone, o.customer_email,
         o.fulfilment, o.address, o.notes, o.booking_at, o.subtotal_pesewas,
         o.delivery_pesewas, o.delivery_fee_mode, o.delivery_zone, o.delivery_on_arrival,
         o.total_pesewas, o.status, o.eta_text, o.created_at, o.updated_at
    from orders o
    join vendors v on v.id = o.vendor_id
`;

async function loadLines(orderIds: string[]): Promise<Map<string, OrderLine[]>> {
  const grouped = new Map<string, OrderLine[]>();
  if (!orderIds.length) return grouped;

  const rows = await db().query<{
    order_id: string;
    name: string;
    quantity: number;
    price_pesewas: number;
    line_total_pesewas: number;
  }>(
    `select order_id, name, quantity, price_pesewas, line_total_pesewas
       from order_items where order_id = any($1::uuid[]) order by id`,
    [orderIds],
  );

  for (const row of rows.rows) {
    const list = grouped.get(row.order_id) ?? [];
    list.push({
      name: row.name,
      quantity: row.quantity,
      pricePesewas: row.price_pesewas,
      lineTotalPesewas: row.line_total_pesewas,
    });
    grouped.set(row.order_id, list);
  }
  return grouped;
}

function toOrder(row: OrderRow, lines: OrderLine[]): OrderRecord {
  return {
    id: row.id,
    code: row.code,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    vendorHandle: row.vendor_handle,
    vendorPhone: row.vendor_phone,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    fulfilment: row.fulfilment,
    address: row.address,
    notes: row.notes,
    bookingAt: row.booking_at ? row.booking_at.toISOString() : null,
    subtotalPesewas: row.subtotal_pesewas,
    deliveryPesewas: row.delivery_pesewas,
    deliveryFeeMode: row.delivery_fee_mode,
    deliveryZone: row.delivery_zone,
    deliveryOnArrival: row.delivery_on_arrival,
    totalPesewas: row.total_pesewas,
    status: row.status,
    eta: row.eta_text,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lines,
  };
}

export async function listVendorOrders(vendorId: string, limit = 50): Promise<OrderRecord[]> {
  const rows = await db().query<OrderRow>(
    `${ORDER_SELECT} where o.vendor_id = $1 order by o.created_at desc limit $2`,
    [vendorId, limit],
  );
  const lines = await loadLines(rows.rows.map((row) => row.id));
  return rows.rows.map((row) => toOrder(row, lines.get(row.id) ?? []));
}

export async function getOrderByCode(rawCode: string): Promise<OrderRecord | null> {
  const code = rawCode.trim().toUpperCase();
  if (!/^ORD-[0-9A-HJKMNP-TV-Z]{4}$/.test(code)) return null;

  const rows = await db().query<OrderRow>(`${ORDER_SELECT} where o.code = $1`, [code]);
  const row = rows.rows[0];
  if (!row) return null;
  const lines = await loadLines([row.id]);
  return toOrder(row, lines.get(row.id) ?? []);
}

export type StatusUpdate =
  | { ok: true; status: OrderStatus }
  | { ok: false; error: string };

export async function updateOrderStatus(
  orderId: string,
  vendorId: string,
  next: OrderStatus,
): Promise<StatusUpdate> {
  if (!ORDER_STATUSES.includes(next)) return { ok: false, error: 'Unknown status.' };

  const client = await db().connect();
  try {
    await client.query('begin');
    const current = await client.query<{ status: OrderStatus; stock_reserved: boolean }>(
      'select status, stock_reserved from orders where id = $1 and vendor_id = $2 for update',
      [orderId, vendorId],
    );
    const row = current.rows[0];
    if (!row) {
      await client.query('rollback');
      return { ok: false, error: 'Order not found.' };
    }
    if (!canTransition(row.status, next)) {
      await client.query('rollback');
      return { ok: false, error: `Cannot move an order from ${row.status} to ${next}.` };
    }

    await client.query(
      `update orders
          set status = $2,
              updated_at = now(),
              stock_reserved = case when $2 = 'cancelled' then false else stock_reserved end
        where id = $1`,
      [orderId, next],
    );

    if (next === 'cancelled' && row.stock_reserved) {
      // Stock was decremented when the order was placed. Put it back once, in
      // the same transaction as the status change so the two cannot diverge.
      // Pre-inventory orders carry stock_reserved = false and never restore.
      await client.query(
        `update items i
            set stock = i.stock + oi.quantity
           from order_items oi
          where oi.order_id = $1 and oi.item_id = i.id and i.stock is not null`,
        [orderId],
      );
    }

    await client.query('commit');
    return { ok: true, status: next };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export type DeliverySettingsUpdate = { ok: true } | { ok: false; error: string };

// ORD-03: vendors choose free, a fixed fee (with within/outside-region rates),
// or "confirm after order". The amounts are only read in "fixed" mode, but are
// always stored so switching modes never loses them.
export async function updateDeliverySettings(
  vendorId: string,
  mode: DeliveryFeeMode,
  withinPesewas: number,
  outsidePesewas: number,
): Promise<DeliverySettingsUpdate> {
  if (!DELIVERY_FEE_MODES.includes(mode)) return { ok: false, error: 'Choose a delivery fee mode.' };
  if (!Number.isInteger(withinPesewas) || withinPesewas < 0 || withinPesewas > 10_000_000) {
    return { ok: false, error: 'Enter a within-region fee between GH₵0 and GH₵100,000.' };
  }
  if (!Number.isInteger(outsidePesewas) || outsidePesewas < 0 || outsidePesewas > 10_000_000) {
    return { ok: false, error: 'Enter an outside-region fee between GH₵0 and GH₵100,000.' };
  }

  const rows = await db().query<{ id: string }>(
    `update vendors
        set delivery_fee_mode = $2, delivery_fee_pesewas = $3,
            delivery_fee_outside_pesewas = $4, updated_at = now()
      where id = $1
      returning id`,
    [vendorId, mode, withinPesewas, outsidePesewas],
  );
  if (!rows.rows[0]) return { ok: false, error: 'Vendor not found.' };
  return { ok: true };
}

export type DeliveryFeeUpdate = { ok: true; totalPesewas: number } | { ok: false; error: string };

// ORD-03 "confirm after": the vendor sets the real fee once they see the order.
// Only a pending delivery order can change, and the total is recomputed from the
// stored subtotal so the two can never diverge.
export async function setOrderDeliveryFee(
  orderId: string,
  vendorId: string,
  deliveryPesewas: number,
): Promise<DeliveryFeeUpdate> {
  if (!Number.isInteger(deliveryPesewas) || deliveryPesewas < 0 || deliveryPesewas > 10_000_000) {
    return { ok: false, error: 'Enter a delivery fee between GH₵0 and GH₵100,000.' };
  }

  const client = await db().connect();
  try {
    await client.query('begin');
    const current = await client.query<{
      status: OrderStatus;
      fulfilment: Fulfilment;
      delivery_fee_mode: DeliveryFeeMode;
      subtotal_pesewas: number;
    }>(
      `select status, fulfilment, delivery_fee_mode, subtotal_pesewas
         from orders where id = $1 and vendor_id = $2 for update`,
      [orderId, vendorId],
    );
    const row = current.rows[0];
    if (!row) {
      await client.query('rollback');
      return { ok: false, error: 'Order not found.' };
    }
    if (row.fulfilment !== 'delivery' || row.delivery_fee_mode !== 'confirm_after') {
      await client.query('rollback');
      return { ok: false, error: 'This order does not need a delivery fee.' };
    }
    if (row.status !== 'pending') {
      await client.query('rollback');
      return { ok: false, error: 'The delivery fee can only be set before the order is confirmed.' };
    }

    const total = row.subtotal_pesewas + deliveryPesewas;
    await client.query(
      `update orders set delivery_pesewas = $2, total_pesewas = $3, updated_at = now()
        where id = $1`,
      [orderId, deliveryPesewas, total],
    );
    await client.query('commit');
    return { ok: true, totalPesewas: total };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export type EtaSettingsUpdate = { ok: true } | { ok: false; error: string };

// Vendor-configurable ETA text for delivery and pickup. Appointment orders keep
// the computed date/time, so only the two product-fulfilment strings are stored.
export async function updateEtaSettings(
  vendorId: string,
  deliveryText: string,
  pickupText: string,
): Promise<EtaSettingsUpdate> {
  const delivery = deliveryText.trim();
  const pickup = pickupText.trim();
  if (delivery.length < 3 || delivery.length > 120) {
    return { ok: false, error: 'Delivery time must be 3 to 120 characters.' };
  }
  if (pickup.length < 3 || pickup.length > 120) {
    return { ok: false, error: 'Pickup time must be 3 to 120 characters.' };
  }

  const rows = await db().query<{ id: string }>(
    `update vendors
        set eta_delivery_text = $2, eta_pickup_text = $3, updated_at = now()
      where id = $1
      returning id`,
    [vendorId, delivery, pickup],
  );
  if (!rows.rows[0]) return { ok: false, error: 'Vendor not found.' };
  return { ok: true };
}
