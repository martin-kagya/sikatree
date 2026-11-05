import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { site } from '@/lib/brand';
import { query } from '@/lib/db';
import { formatCedis } from '@/lib/money';
import { requireVendor } from '@/lib/vendor-auth';
import { logoutAction } from './actions';
import { CopyLink } from './copy-link';

export const metadata: Metadata = {
  title: 'Dashboard | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Vendor = { id: string; name: string; handle: string; type: string | null; phone: string };
type Item = { id: string; name: string; price_pesewas: number; stock: number | null; status: string };

export default async function DashboardPage() {
  const vendorId = await requireVendor();

  const vendors = await query<Vendor>(
    'select id, name, handle, type, phone from vendors where id = $1',
    [vendorId],
  );
  const vendor = vendors[0];
  if (!vendor) notFound();

  const items = await query<Item>(
    `select id, name, price_pesewas, stock, status
       from items where vendor_id = $1 order by position, created_at`,
    [vendorId],
  );

  const pageUrl = `${site.domain}/${vendor.handle}`;
  const shareMessage = `Shop with me on sikatree: ${site.domain}/${vendor.handle}`;

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
            <h2 className="text-h2 text-ink">Items</h2>
            {items.length ? (
              <ul className="mt-4 divide-y divide-hairline">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-body text-ink">{item.name}</span>
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
            This dashboard is the first cut. Catalogue editing, orders and payouts follow.
          </p>
        </main>
      </div>
    </div>
  );
}
