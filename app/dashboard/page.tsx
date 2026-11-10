import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { site } from '@/lib/brand';
import { query } from '@/lib/db';
import { formatCedis } from '@/lib/money';
import { ACTIVE_ORDER_STATUSES, listVendorOrders } from '@/lib/orders';
import { requireVendor } from '@/lib/vendor-auth';
import { moveItemAction } from './actions';
import { setItemStatusAction } from './items/actions';
import { CopyLink } from './copy-link';
import { OrderCard } from './order-card';

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
  kind: 'product' | 'service';
  image_url: string | null;
};


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
      `select id, name, category, price_pesewas, stock, status, kind, image_url
         from items where vendor_id = $1 order by position, created_at`,
      [vendorId],
    ),
    listVendorOrders(vendorId, { statuses: ACTIVE_ORDER_STATUSES }),
  ]);

  const vendor = vendors[0];
  if (!vendor) notFound();
  const isService = vendor.type === 'services' || vendor.type === 'both';

  const pageUrl = `${site.domain}/${vendor.handle}`;
  const shareMessage = `Shop with me on sikatree: ${site.domain}/${vendor.handle}`;
  const newOrders = orders.filter((order) => order.status === 'pending').length;

  return (
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
              Your customers can order from your page or message you on WhatsApp.
            </p>
          </section>

          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-h2 text-ink">Orders</h2>
                <p className="mt-1 text-small text-ink-muted">
                  Active orders. Completed and cancelled orders move to Orders.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {newOrders ? (
                  <span className="rounded-pill bg-mint-100 px-3 py-1 text-[12px] font-medium text-green-deep">
                    {newOrders} new
                  </span>
                ) : null}
                <Link
                  href="/dashboard/orders"
                  className="pressable inline-flex h-8 items-center rounded-pill border border-hairline px-3 text-[12px] text-ink hover:border-ink/40"
                >
                  View all orders
                </Link>
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
                No active orders. Share your page and the first one will show up here.
              </p>
            )}
          </section>

          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-h2 text-ink">Items</h2>
                <p className="mt-1 text-small text-ink-muted">
                  {isService
                    ? 'Edit a price, mark something unavailable or hide it. Changes show on your page immediately.'
                    : 'Edit a price, add stock or hide something. Changes show on your page immediately.'}
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
                  const itemIsService = item.kind === 'service';
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
                            {itemIsService ? 'Service' : 'Product'} ·{' '}
                            {item.category ?? 'No category'} ·{' '}
                            {hidden
                              ? 'Hidden'
                              : soldOut
                                ? itemIsService
                                  ? 'Unavailable'
                                  : 'Sold out'
                                : itemIsService
                                  ? 'Open for bookings'
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
                        <CopyLink
                          value={`https://${site.domain}/${vendor.handle}/i/${item.id}`}
                          label="Item link"
                        />
                        {item.status === 'active' && !soldOut ? (
                          <form action={setItemStatusAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="status" value="sold_out" />
                            <button
                              type="submit"
                              className="pressable inline-flex h-8 items-center rounded-pill border border-hairline px-3 text-[12px] text-ink hover:border-ink/40"
                            >
                              {itemIsService ? 'Unavailable' : 'Sold out'}
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
            Payouts and the full PWA follow.
          </p>
    </main>
  );
}
