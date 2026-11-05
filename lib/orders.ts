import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { normalizeGhanaPhone } from '@/lib/phone';
import { hitRateLimit } from '@/lib/rate-limit';
import { DELIVERY_FEE_PESEWAS } from '@/lib/shop';

// Guest checkout (ORD-04). Prices are always recomputed from the database; the
// browser only sends item ids and quantities.

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Fulfilment = 'delivery' | 'pickup' | 'appointment';

export type CheckoutOrder = {
  code: string;
  totalPesewas: number;
  eta: string;
  email: string;
  vendorName: string;
  fulfilment: Fulfilment;
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

export function deliveryFeeFor(fulfilment: Fulfilment): number {
  return fulfilment === 'delivery' ? DELIVERY_FEE_PESEWAS : 0;
}

export function etaFor(fulfilment: Fulfilment, bookingAt: Date | null): string {
  if (fulfilment === 'appointment' && bookingAt) {
    const when = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Accra',
    }).format(bookingAt);
    return `Appointment on ${when}`;
  }
  if (fulfilment === 'pickup') return 'Ready for pickup in about 30 minutes';
  return 'Delivery in 45 to 60 minutes';
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
  }>('select id, name, type, status from vendors where handle = $1', [handle]);
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
  const delivery = deliveryFeeFor(fulfilment);
  const total = subtotal + delivery;
  const eta = etaFor(fulfilment, bookingAt);

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
              status, eta_text)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',$13)
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
          ],
        );
        const orderId = inserted.rows[0].id;

        for (const item of orderItems) {
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
            createdAt: inserted.rows[0].created_at.toISOString(),
          },
        };
      } catch (error) {
        await client.query('rollback').catch(() => {});
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
