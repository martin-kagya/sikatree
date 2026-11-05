import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { site } from '@/lib/brand';
import { query } from '@/lib/db';
import { formatCedis } from '@/lib/money';
import { listVendorOrders, nextStatuses, type OrderRecord, type OrderStatus } from '@/lib/orders';
import { formatGhanaPhone } from '@/lib/phone';
import { requireVendor } from '@/lib/vendor-auth';
import { cn } from '@/lib/utils';
import { logoutAction, updateOrderStatusAction } from './actions';
import { CopyLink } from './copy-link';

export const metadata: Metadata = {
  title: 'Dashboard | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Vendor = { id: string; name: string; handle: string; type: string | null; phone: string };
type Item = {
  id: string;
  name: string;
  price_pesewas: number;
  stock: number | null;
  status: string;
  image_url: string | null;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'New',
  confirmed: 'Confirmed',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-warn-bg text-ink',
  confirmed: 'bg-mint-100 text-green-deep',
  ready: 'bg-green-deep text-white',
  completed: 'bg-ink text-white',
  cancelled: 'bg-danger-bg text-danger',
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirm order',
  ready: 'Mark ready',
  completed: 'Mark completed',
  cancelled: 'Cancel order',
};

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Accra',
  }).format(new Date(iso));
}

function fulfilmentText(order: OrderRecord): string {
  if (order.fulfilment === 'delivery') return `Delivery to ${order.address ?? 'address to confirm'}`;
  if (order.fulfilment === 'pickup') return 'Pickup at the shop';
  return order.bookingAt ? `Appointment ${when(order.bookingAt)}` : 'Appointment to confirm';
}

function OrderCard({ order }: { order: OrderRecord }) {
  const messageHref = `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi ${order.customerName}, about your order ${order.code} on sikatree.`,
  )}`;

  return (
    <article className="rounded-[20px] border border-hairline p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[12px] text-ink-muted">{when(order.createdAt)}</p>
          <p className="text-h3 text-ink">{order.code}</p>
        </div>
        <span
          className={cn(
            'rounded-pill px-2.5 py-1 text-[11px] font-medium',
            STATUS_STYLE[order.status],
          )}
        >
          {STATUS_LABEL[order.status]}
        </span>
        <p className="text-label text-ink">{formatCedis(order.totalPesewas)}</p>
      </div>

      <ul className="mt-3 space-y-1 text-[13px] text-ink">
        {order.lines.map((line) => (
          <li key={line.name} className="flex justify-between gap-3">
            <span>
              {line.quantity} x {line.name}
            </span>
            <span className="tabular-nums">{formatCedis(line.lineTotalPesewas)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-muted">
        <span>
          {order.customerName} · {formatGhanaPhone(order.customerPhone)}
          <a
            href={messageHref}
            target="_blank"
            rel="noreferrer"
            className="ml-2 text-green-deep underline underline-offset-2"
          >
            Message
          </a>
        </span>
        <span>{fulfilmentText(order)}</span>
        <span>{order.customerEmail}</span>
        {order.notes ? <span>Note: {order.notes}</span> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {nextStatuses(order.status).map((status) => (
          <form key={status} action={updateOrderStatusAction}>
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value={status} />
            <button
              type="submit"
              className={cn(
                'h-9 rounded-pill px-3 text-[12px] font-medium',
                status === 'cancelled'
                  ? 'border border-danger text-danger'
                  : 'bg-ink text-white',
              )}
            >
              {NEXT_LABEL[status] ?? status}
            </button>
          </form>
        ))}

        <Link
          href={`/o/${order.code}`}
          className="inline-flex h-9 items-center rounded-pill border border-hairline px-3 text-[12px] font-medium text-ink hover:border-ink/40"
        >
          Track page
        </Link>
        <CopyLink value={`https://${site.domain}/o/${order.code}`} label="Copy tracking link" />
      </div>
    </article>
  );
}

export default async function DashboardPage() {
  const vendorId = await requireVendor();

  const [vendors, items, orders] = await Promise.all([
    query<Vendor>('select id, name, handle, type, phone from vendors where id = $1', [vendorId]),
    query<Item>(
      `select id, name, price_pesewas, stock, status, image_url
         from items where vendor_id = $1 order by position, created_at`,
      [vendorId],
    ),
    listVendorOrders(vendorId),
  ]);

  const vendor = vendors[0];
  if (!vendor) notFound();

  const pageUrl = `${site.domain}/${vendor.handle}`;
  const shareMessage = `Shop with me on sikatree: ${site.domain}/${vendor.handle}`;
  const newOrders = orders.filter((order) => order.status === 'pending').length;

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[760px]">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
            sikatree
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-pill border border-hairline bg-white px-4 text-small text-ink hover:border-ink/40"
            >
              Sign out
            </button>
          </form>
        </header>

        <main className="mt-6 space-y-5">
          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <h1 className="text-h1 text-ink">{vendor.name}</h1>
            <p className="mt-1 text-small text-ink-muted">
              Your page: <span className="font-medium text-ink">{pageUrl}</span>
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <CopyLink value={`https://${pageUrl}`} label="Copy link" />
              <CopyLink value={shareMessage} label="Copy share message" />
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-pill bg-green-main px-4 text-small text-ink transition-transform hover:-translate-y-px"
              >
                Share on WhatsApp
              </a>
            </div>

            <p className="mt-4 text-[12px] text-ink-muted">
              Your customers can order from your page or message you on WhatsApp. Online payments
              arrive in a later phase.
            </p>
          </section>

          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-h2 text-ink">Orders</h2>
                <p className="mt-1 text-small text-ink-muted">
                  New orders also arrive on WhatsApp.
                </p>
              </div>
              {newOrders ? (
                <span className="rounded-pill bg-mint-100 px-3 py-1 text-[12px] font-medium text-green-deep">
                  {newOrders} new
                </span>
              ) : null}
            </div>

            {orders.length ? (
              <div className="mt-4 space-y-3">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-small text-ink-muted">
                No orders yet. Share your page and the first one will show up here.
              </p>
            )}
          </section>

          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-h2 text-ink">Items</h2>
            {items.length ? (
              <ul className="mt-4 divide-y divide-hairline">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-inner object-cover"
                        />
                      ) : null}
                      <span className="truncate text-body text-ink">{item.name}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      {item.status === 'sold_out' ? (
                        <span className="rounded-pill bg-danger-bg px-2.5 py-0.5 text-[12px] text-danger">
                          Sold out
                        </span>
                      ) : item.stock !== null ? (
                        <span className="text-[12px] text-ink-muted">{item.stock} left</span>
                      ) : null}
                      <span className="text-label text-ink">{formatCedis(item.price_pesewas)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-small text-ink-muted">
                No items yet. Message the bot on WhatsApp and send your first item to add it here.
              </p>
            )}
          </section>

          <p className="text-center text-[12px] text-ink-muted">
            Catalogue editing, online payments and payouts follow.
          </p>
        </main>
      </div>
    </div>
  );
}
