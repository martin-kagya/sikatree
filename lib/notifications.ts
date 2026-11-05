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
