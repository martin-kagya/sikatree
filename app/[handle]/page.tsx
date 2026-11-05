import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { site } from '@/lib/brand';
import { query } from '@/lib/db';
import { formatCedis } from '@/lib/money';
import { normalizeHandle } from '@/lib/handle';

export const dynamic = 'force-dynamic';

type Vendor = {
  id: string;
  name: string;
  handle: string;
  type: 'products' | 'services' | 'both' | null;
  bio: string | null;
  phone: string;
};

type Item = {
  id: string;
  name: string;
  description: string | null;
  price_pesewas: number;
  stock: number | null;
  image_url: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  products: 'Products',
  services: 'Services',
  both: 'Products and services',
};

async function loadVendor(rawHandle: string): Promise<{ vendor: Vendor; items: Item[] } | null> {
  const handle = normalizeHandle(decodeURIComponent(rawHandle));
  if (!handle) return null;

  const vendors = await query<Vendor>(
    `select id, name, handle, type, bio, phone
       from vendors
      where handle = $1 and status = 'live'`,
    [handle],
  );
  const vendor = vendors[0];
  if (!vendor) return null;

  const items = await query<Item>(
    `select id, name, description, price_pesewas, stock, image_url
       from items
      where vendor_id = $1 and status = 'active'
      order by position, created_at`,
    [vendor.id],
  );

  return { vendor, items };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const data = await loadVendor(handle).catch(() => null);

  if (!data) return { title: 'Shop not found | sikatree', robots: { index: false } };

  const title = `${data.vendor.name} | sikatree`;
  const description =
    data.vendor.bio ??
    `${data.vendor.name} on sikatree. ${data.items.length} item${
      data.items.length === 1 ? '' : 's'
    }, pay with MoMo.`;

  return {
    title,
    description,
    alternates: { canonical: `/${data.vendor.handle}` },
    openGraph: { title, description, url: `${site.url}/${data.vendor.handle}`, type: 'website' },
  };
}

export default async function VendorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await loadVendor(handle);
  if (!data) notFound();

  const { vendor, items } = data;
  const whatsapp = `https://wa.me/${vendor.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi ${vendor.name}, I found your shop on sikatree.`,
  )}`;

  return (
    <div className="min-h-screen bg-page">
      <header className="mx-auto flex max-w-[860px] items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
          sikatree
        </Link>
        <span className="text-[12px] text-ink-muted">Powered by sikatree</span>
      </header>

      <main className="mx-auto max-w-[860px] px-4 pb-16 sm:px-6">
        <section className="rounded-panel bg-white p-6 shadow-card sm:p-10">
          <p className="text-[12px] uppercase tracking-wide text-ink-muted">
            {vendor.type ? TYPE_LABEL[vendor.type] : 'Shop'}
          </p>
          <h1 className="mt-2 text-h1 text-ink sm:text-h1-lg">{vendor.name}</h1>
          {vendor.bio ? <p className="mt-3 max-w-[560px] text-lead text-ink-muted">{vendor.bio}</p> : null}
          <p className="mt-2 text-small text-ink-muted">{site.domain}/{vendor.handle}</p>

          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-pill bg-green-main px-7 text-label text-ink transition-transform duration-150 hover:-translate-y-px active:scale-[0.98]"
          >
            Chat on WhatsApp
          </a>
        </section>

        <section className="mt-5">
          {items.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => {
                const soldOut = item.stock !== null && item.stock <= 0;
                return (
                  <li key={item.id} className="overflow-hidden rounded-card bg-white shadow-card">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                        className="aspect-[4/5] w-full object-cover"
                      />
                    ) : null}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-h3 text-ink">{item.name}</h2>
                        <span className="whitespace-nowrap text-label text-ink">
                          {formatCedis(item.price_pesewas)}
                        </span>
                      </div>
                      {item.description ? (
                        <p className="mt-1 text-small text-ink-muted">{item.description}</p>
                      ) : null}
                      {soldOut ? (
                        <p className="mt-3 inline-flex rounded-pill bg-danger-bg px-3 py-1 text-[12px] text-danger">
                          Sold out
                        </p>
                      ) : item.stock !== null ? (
                        <p className="mt-3 text-[12px] text-ink-muted">{item.stock} left</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-card bg-white p-8 text-center shadow-card">
              <p className="text-h3 text-ink">This shop is getting set up.</p>
              <p className="mt-1 text-small text-ink-muted">Check back soon, or say hello on WhatsApp.</p>
            </div>
          )}
        </section>

        <footer className="mt-10 flex items-center justify-between text-[12px] text-ink-muted">
          <span>© 2026 sikatree</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
