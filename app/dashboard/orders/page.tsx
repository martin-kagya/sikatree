import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { ACTIVE_ORDER_STATUSES, listVendorOrders, type OrderStatus } from '@/lib/orders';
import { requireVendor } from '@/lib/vendor-auth';
import { cn } from '@/lib/utils';
import { DashboardMenu } from '../dashboard-menu';
import { OrderCard } from '../order-card';

export const metadata: Metadata = {
  title: 'Orders | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const FILTERS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active', statuses: ACTIVE_ORDER_STATUSES },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const vendorId = await requireVendor();
  const params = await searchParams;
  const filter = FILTERS.find((entry) => entry.key === params.status) ?? FILTERS[0];

  const [vendors, orders] = await Promise.all([
    query<{ name: string }>('select name from vendors where id = $1', [vendorId]),
    listVendorOrders(vendorId, { statuses: filter.statuses, limit: 200 }),
  ]);
  const vendor = vendors[0];
  if (!vendor) notFound();

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[960px]">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
            sikatree
          </Link>
          <DashboardMenu />
        </header>

        <main className="mt-6 space-y-5 stagger">
          <div>
            <Link href="/dashboard" className="text-[13px] text-ink-muted hover:text-ink">
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-h1 text-ink">Orders</h1>
            <p className="mt-1 text-small text-ink-muted">
              Every order for {vendor.name}, newest first. Completed and cancelled orders live here.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((entry) => {
              const active = entry.key === filter.key;
              return (
                <Link
                  key={entry.key}
                  href={
                    entry.key === 'all'
                      ? '/dashboard/orders'
                      : `/dashboard/orders?status=${entry.key}`
                  }
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 items-center rounded-pill border px-3.5 text-small transition-colors duration-150',
                    active
                      ? 'border-transparent bg-ink text-white'
                      : 'border-hairline bg-white text-ink hover:border-ink/40',
                  )}
                >
                  {entry.label}
                </Link>
              );
            })}
          </div>

          {orders.length ? (
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <p className="rounded-panel bg-white p-6 text-small text-ink-muted shadow-card">
              No {filter.key === 'all' ? '' : `${filter.label.toLowerCase()} `}orders yet.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
