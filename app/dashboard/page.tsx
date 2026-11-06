import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Settings } from '@/components/icons';
import { site } from '@/lib/brand';
import { query } from '@/lib/db';
import { formatCedis } from '@/lib/money';
import { listVendorOrders, nextStatuses, type OrderRecord, type OrderStatus } from '@/lib/orders';
import { formatGhanaPhone } from '@/lib/phone';
import { requireVendor } from '@/lib/vendor-auth';
import { cn } from '@/lib/utils';
import { logoutAction, moveItemAction, setOrderDeliveryFeeAction, updateOrderStatusAction } from './actions';
import { setItemStatusAction } from './items/actions';
import { CopyLink } from './copy-link';

export const metadata: Metadata = {
  title: 'Dashboard | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Vendor = {
  id: string;
  name: string;
  handle: string;
  type: string | null;
  phone: string;
};
type Item = {
  id: string;
  name: string;
  category: string | null;
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
        {order.fulfilment === 'delivery' && order.deliveryFeeMode === 'confirm_after' ? (
          <span>
            {order.deliveryPesewas
              ? `Delivery ${formatCedis(order.deliveryPesewas)}`
              : 'Delivery fee to confirm'}
          </span>
        ) : null}
        {order.fulfilment === 'delivery' && order.deliveryFeeMode === 'fixed' ? (
          <span>
            Delivery {order.deliveryZone === 'outside' ? '(other region)' : '(same region)'}{' '}
            {formatCedis(order.deliveryPesewas)}
            {order.deliveryOnArrival ? ' on arrival' : ''}
          </span>
        ) : null}
        <span>{order.customerEmail}</span>
        {order.notes ? <span>Note: {order.notes}</span> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {nextStatuses(order.status)
          .filter((status) => status !== 'cancelled')
          .map((status) => (
            <form key={status} action={updateOrderStatusAction}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                className="h-9 rounded-pill bg-ink px-3 text-[12px] font-medium text-white"
              >
                {NEXT_LABEL[status] ?? status}
              </button>
            </form>
          ))}

        <Link
          href={`/o/${order.code}`}
          className="pressable inline-flex h-9 items-center rounded-pill border border-hairline px-3 text-[12px] font-medium text-ink hover:border-ink/40"
        >
          Track page
        </Link>
        <CopyLink value={`https://${site.domain}/o/${order.code}`} label="Copy tracking link" />
      </div>

      {nextStatuses(order.status).includes('cancelled') ? (
        <form
          action={updateOrderStatusAction}
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3"
        >
          <input type="hidden" name="id" value={order.id} />
          <input type="hidden" name="status" value="cancelled" />
          <input
            name="reason"
            placeholder="Reason for cancelling (optional)"
            maxLength={200}
            className="h-8 min-w-0 flex-1 rounded-[8px] border border-hairline bg-white px-2 text-[12px] text-ink outline-none focus:border-green-deep"
          />
          <button
            type="submit"
            className="pressable inline-flex h-8 items-center rounded-pill border border-danger px-3 text-[12px] font-medium text-danger"
          >
            Cancel order
          </button>
        </form>
      ) : null}

      {order.fulfilment === 'delivery' &&
      order.deliveryFeeMode === 'confirm_after' &&
      order.status === 'pending' ? (
        <form
          action={setOrderDeliveryFeeAction}
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3"
        >
          <input type="hidden" name="id" value={order.id} />
          <label className="flex items-center gap-2 text-[12px] text-ink-muted">
            Delivery fee (GH₵)
            <input
              name="fee"
              inputMode="decimal"
              required
              min="0"
              placeholder="15"
              className="h-8 w-24 rounded-[8px] border border-hairline bg-white px-2 text-[12px] text-ink outline-none focus:border-green-deep"
            />
          </label>
          <button
            type="submit"
            className="pressable inline-flex h-8 items-center rounded-pill bg-ink px-3 text-[12px] font-medium text-white hover:bg-ink/90"
          >
            {order.deliveryPesewas ? 'Update fee' : 'Set fee'}
          </button>
        </form>
      ) : null}
    </article>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const vendorId = await requireVendor();
  const params = await searchParams;

  const [vendors, items, orders] = await Promise.all([
    query<Vendor>(
      'select id, name, handle, type, phone from vendors where id = $1',
      [vendorId],
    ),
    query<Item>(
      `select id, name, category, price_pesewas, stock, status, image_url
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
      <div className="mx-auto max-w-[960px]">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
            sikatree
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/settings"
              className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-hairline bg-white px-3 text-small text-ink hover:border-ink/40"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <Link
              href="/dashboard/support"
              className="inline-flex h-9 items-center rounded-pill border border-hairline bg-white px-4 text-small text-ink hover:border-ink/40"
            >
              Support
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-pill border border-hairline bg-white px-4 text-small text-ink hover:border-ink/40"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="mt-6 space-y-5 stagger">
          {params.item ? (
            <p className="rounded-card bg-mint-100 p-4 text-small text-green-deep">
              Item saved. Your page is up to date.
            </p>
          ) : null}

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
                className="pressable inline-flex h-9 items-center rounded-pill bg-green-main px-4 text-small text-ink hover:bg-green-main/90"
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
              <div className="flex items-center gap-2">
                {newOrders ? (
                  <span className="rounded-pill bg-mint-100 px-3 py-1 text-[12px] font-medium text-green-deep">
                    {newOrders} new
                  </span>
                ) : null}
                <Link
                  href="/dashboard/export"
                  className="pressable inline-flex h-8 items-center rounded-pill border border-hairline px-3 text-[12px] text-ink hover:border-ink/40"
                >
                  Export CSV
                </Link>
              </div>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-h2 text-ink">Items</h2>
                <p className="mt-1 text-small text-ink-muted">
                  Edit a price, add stock or hide something. Changes show on your page immediately.
                </p>
              </div>
              <Link
                href="/dashboard/items/new"
                className="pressable inline-flex h-10 items-center rounded-pill bg-ink px-4 text-small text-white hover:bg-ink/90"
              >
                Add item
              </Link>
            </div>

            {items.length ? (
              <ul className="mt-4 divide-y divide-hairline">
                {items.map((item) => {
                  const soldOut =
                    item.status === 'sold_out' || (item.stock !== null && item.stock <= 0);
                  const hidden = item.status === 'hidden';
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            loading="lazy"
                            className="h-12 w-12 shrink-0 rounded-inner object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-body text-ink">{item.name}</p>
                          <p className="text-[11px] text-ink-muted">
                            {item.category ?? 'No category'} ·{' '}
                            {hidden
                              ? 'Hidden'
                              : soldOut
                                ? 'Sold out'
                                : item.stock === null
                                  ? 'Unlimited'
                                  : `${item.stock} in stock`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1">
                          <form action={moveItemAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="direction" value="up" />
                            <button
                              type="submit"
                              aria-label="Move up"
                              className="pressable inline-flex h-8 w-8 items-center justify-center rounded-pill border border-hairline text-[14px] text-ink hover:border-ink/40"
                            >
                              ↑
                            </button>
                          </form>
                          <form action={moveItemAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="direction" value="down" />
                            <button
                              type="submit"
                              aria-label="Move down"
                              className="pressable inline-flex h-8 w-8 items-center justify-center rounded-pill border border-hairline text-[14px] text-ink hover:border-ink/40"
                            >
                              ↓
                            </button>
                          </form>
                        </span>
                        <span className="text-label text-ink">
                          {formatCedis(item.price_pesewas)}
                        </span>
                        <Link
                          href={`/dashboard/items/${item.id}`}
                          className="pressable inline-flex h-8 items-center rounded-pill border border-hairline px-3 text-[12px] text-ink hover:border-ink/40"
                        >
                          Edit
                        </Link>
                        {item.status === 'active' && !soldOut ? (
                          <form action={setItemStatusAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="status" value="sold_out" />
                            <button
                              type="submit"
                              className="pressable inline-flex h-8 items-center rounded-pill border border-hairline px-3 text-[12px] text-ink hover:border-ink/40"
                            >
                              Sold out
                            </button>
                          </form>
                        ) : item.status !== 'active' ? (
                          <form action={setItemStatusAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="status" value="active" />
                            <button
                              type="submit"
                              className="pressable inline-flex h-8 items-center rounded-pill border border-hairline px-3 text-[12px] text-ink hover:border-ink/40"
                            >
                              Show
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-small text-ink-muted">
                No items yet. Add your first one here, or send it to the bot on WhatsApp.
              </p>
            )}
          </section>
          <p className="text-center text-[12px] text-ink-muted">
            Online payments, payouts and the full PWA follow.
          </p>
        </main>
      </div>
    </div>
  );
}
