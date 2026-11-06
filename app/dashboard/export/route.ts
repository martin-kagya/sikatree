import { currentVendorId } from '@/lib/vendor-auth';
import { listVendorOrders } from '@/lib/orders';

export const dynamic = 'force-dynamic';

function cell(value: unknown): string {
  const text = value == null ? '' : String(value);
  // Spreadsheet formula injection guard. Phone numbers start with "+", so they
  // are quoted as text rather than evaluated.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function cedis(pesewas: number): string {
  return (pesewas / 100).toFixed(2);
}

export async function GET(): Promise<Response> {
  const vendorId = await currentVendorId();
  if (!vendorId) return new Response('Unauthorized', { status: 401 });

  const orders = await listVendorOrders(vendorId, { limit: 5000 });

  const header = [
    'code',
    'placed_at',
    'status',
    'fulfilment',
    'zone',
    'customer_name',
    'customer_phone',
    'customer_email',
    'address',
    'notes',
    'items',
    'subtotal_ghs',
    'delivery_ghs',
    'total_ghs',
  ];

  const lines = [
    header.join(','),
    ...orders.map((order) => {
      const items = order.lines.map((line) => `${line.quantity} x ${line.name}`).join('; ');
      const delivery = order.deliveryOnArrival
        ? `${cedis(order.deliveryPesewas)} (on arrival)`
        : cedis(order.deliveryPesewas);
      return [
        order.code,
        order.createdAt,
        order.status,
        order.fulfilment,
        order.deliveryZone ?? '',
        order.customerName,
        order.customerPhone,
        order.customerEmail,
        order.address ?? '',
        order.notes ?? '',
        items,
        cedis(order.subtotalPesewas),
        delivery,
        cedis(order.totalPesewas),
      ]
        .map(cell)
        .join(',');
    }),
  ];

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${lines.join('\r\n')}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="sikatree-orders-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
