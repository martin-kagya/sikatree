import { db } from '@/lib/db';
import { listLowStockItems } from '@/lib/inventory';
import { createLoginLink } from '@/lib/login-links';
import { formatCedis } from '@/lib/money';
import { getOrderByCode, type OrderRecord } from '@/lib/orders';
import { text } from '@/lib/whatsapp/messages';
import { getMessenger } from '@/lib/whatsapp/provider';

function fulfilmentLine(order: OrderRecord): string {
  if (order.fulfilment === 'delivery') {
    return `Deliver to: ${order.address ?? 'address to confirm'}`;
  }
  if (order.fulfilment === 'pickup') return 'Pickup at the shop';
  if (order.bookingAt) {
    const when = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Accra',
    }).format(new Date(order.bookingAt));
    return `Appointment: ${when}`;
  }
  return 'Appointment to confirm';
}

function paymentLine(order: OrderRecord): string {
  if (order.paymentStatus === 'paid') return 'paid online';
  if (order.fulfilment === 'delivery') return 'pay on delivery';
  if (order.fulfilment === 'pickup') return 'pay at pickup';
  return 'pay at the appointment';
}

export function vendorOrderMessage(order: OrderRecord, dashboardUrl: string): string {
  const items = order.lines
    .map((line) => `${line.quantity} x ${line.name}`)
    .join('\n');

  const parts = [
    `New order ${order.code}`,
    items,
    `Total ${formatCedis(order.totalPesewas)} (${paymentLine(order)})`,
  ];

  if (order.fulfilment === 'delivery' && order.deliveryFeeMode === 'confirm_after') {
    parts.push('Delivery fee to confirm');
  }

  if (order.fulfilment === 'delivery' && order.deliveryFeeMode === 'fixed') {
    const zone = order.deliveryZone === 'outside' ? 'other region' : 'same region';
    const onArrival = order.deliveryOnArrival ? ' pay on arrival' : '';
    parts.push(`Delivery ${formatCedis(order.deliveryPesewas)} (${zone})${onArrival}`);
  }

  parts.push(`${order.customerName} · ${order.customerPhone}`, fulfilmentLine(order));

  if (order.notes) parts.push(`Note: ${order.notes}`);
  parts.push(`Open your dashboard: ${dashboardUrl}`);

  return parts.join('\n');
}

// Fire after the checkout response so a slow WhatsApp call cannot delay the
// client. Failures are logged and the order is already safe in the database.
export async function notifyVendorOfOrder(code: string): Promise<void> {
  const order = await getOrderByCode(code);
  if (!order) return;

  const link = await createLoginLink(order.vendorId);
  const message = vendorOrderMessage(order, link.url);
  await getMessenger().send(order.vendorPhone, text(message));
}

// Low-stock alert (INV-04): after an order, warn the vendor about ordered items
// that have fallen to or below their configured threshold.
export async function notifyVendorOfLowStock(code: string): Promise<void> {
  const order = await getOrderByCode(code);
  if (!order) return;

  const vendors = await db().query<{ phone: string; low_stock_threshold: number | null }>(
    'select phone, low_stock_threshold from vendors where id = $1',
    [order.vendorId],
  );
  const vendor = vendors.rows[0];
  if (!vendor || vendor.low_stock_threshold === null) return;

  const ordered = new Set(order.lines.map((line) => line.itemId).filter(Boolean) as string[]);
  if (!ordered.size) return;

  const items = (await listLowStockItems(order.vendorId, vendor.low_stock_threshold)).filter(
    (item) => ordered.has(item.id),
  );
  if (!items.length) return;

  const message = [
    'Low stock alert:',
    ...items.map((item) => `• ${item.name}: ${item.stock} left`),
  ].join('\n');
  await getMessenger().send(vendor.phone, text(message));
}
