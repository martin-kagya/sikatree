import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, MessageCircle } from '@/components/icons';
import { AddToCartButton } from '@/components/shop/add-to-cart-button';
import { ItemShareActions } from '@/components/shop/item-share-actions';
import { site } from '@/lib/brand';
import { getSharedItem } from '@/lib/item-page';
import { formatCedis } from '@/lib/money';
import { cn } from '@/lib/utils';

type Params = { handle: string; item: string };

function absoluteImage(url: string | null): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${site.url}${url.startsWith('/') ? '' : '/'}${url}`;
}

function badgeLabel(badge: 'discount' | 'popular' | 'new' | null): string | null {
  if (badge === 'discount') return 'Discount';
  if (badge === 'popular') return 'Popular';
  if (badge === 'new') return 'New';
  return null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle, item } = await params;
  const data = await getSharedItem(handle, item).catch(() => null);
  if (!data) return { title: 'Item not found | sikatree', robots: { index: false } };

  const price = formatCedis(data.pricePesewas);
  const title = `${data.name} · ${data.vendor.name}`;
  const description =
    data.description?.trim().slice(0, 180) ||
    `${price} from ${data.vendor.name} on sikatree. Pay on delivery or chat on WhatsApp.`;
  const url = `${site.url}/${data.vendor.handle}/i/${data.id}`;
  const image = absoluteImage(data.images[0] ?? null);

  return {
    title: `${title} | sikatree`,
    description,
    alternates: { canonical: `/${data.vendor.handle}/i/${data.id}` },
    openGraph: {
      type: 'website',
      url,
      siteName: 'sikatree',
      title,
      description,
      locale: 'en_GH',
      images: [
        image
          ? { url: image, alt: `${data.name} from ${data.vendor.name}` }
          : {
              url: `${site.url}/${data.vendor.handle}/opengraph-image`,
              width: 1200,
              height: 630,
              alt: `${data.name} on sikatree`,
            },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [`${site.url}/${data.vendor.handle}/opengraph-image`],
    },
    robots: { index: true, follow: true },
  };
}

export const dynamic = 'force-dynamic';

export default async function SharedItemPage({ params }: { params: Promise<Params> }) {
  const { handle, item: itemId } = await params;
  const item = await getSharedItem(handle, itemId);
  if (!item) notFound();

  const { vendor } = item;
  const url = `${site.url}/${vendor.handle}/i/${item.id}`;
  const price = formatCedis(item.pricePesewas);
  const soldOut = item.status === 'sold_out' || (item.stock !== null && item.stock <= 0);
  const unavailable = item.kind === 'service' ? item.status !== 'active' : soldOut;
  const stockNote =
    item.kind === 'service'
      ? item.status === 'active'
        ? 'Open for bookings'
        : 'Unavailable'
      : soldOut
        ? 'Sold out'
        : item.stock === null
          ? 'In stock'
          : item.stock <= 5
            ? `Only ${item.stock} left`
            : 'In stock';
  const badge = badgeLabel(item.badge);
  const image = absoluteImage(item.images[0] ?? null);
  const waHref = `https://wa.me/${vendor.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi ${vendor.name}, I'm interested in ${item.name} (${price}). Is it available?`,
  )}`;
  const shareText = `${item.name} · ${price} from ${vendor.name}`;

  return (
    <main className="min-h-screen bg-page">
      <header className="border-b border-hairline bg-white">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-[17px] font-semibold tracking-[-0.03em] text-ink">
            sikatree
          </Link>
          <Link
            href={`/${vendor.handle}`}
            className="inline-flex h-9 items-center rounded-pill border border-hairline px-4 text-[13px] text-ink transition-colors hover:border-ink/40"
          >
            Visit shop
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 sm:py-10">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink-muted">
          <Link href={`/${vendor.handle}`} className="truncate hover:text-ink">
            {vendor.name}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.category ?? 'Item'}</span>
        </nav>

        <article className="mt-4 grid gap-6 md:grid-cols-2 md:gap-10">
          <div>
            <div className="overflow-hidden rounded-[24px] border border-hairline bg-white">
              {image ? (
                <img
                  src={image}
                  alt={`${item.name} from ${vendor.name}`}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-surface-soft px-8 text-center text-[13px] text-ink-muted">
                  No photo yet — ask {vendor.name} for one.
                </div>
              )}
            </div>

            {item.images.length > 1 ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {item.images.slice(0, 4).map((photo) => (
                  <img
                    key={photo}
                    src={absoluteImage(photo) ?? photo}
                    alt=""
                    className="aspect-square w-full rounded-[12px] border border-hairline object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {badge ? (
                <span className="rounded-pill bg-mint-100 px-2.5 py-1 text-[11px] font-medium text-green-deep">
                  {badge}
                </span>
              ) : null}
              {item.category ? (
                <span className="text-[12px] text-ink-muted">{item.category}</span>
              ) : null}
            </div>

            <h1 className="mt-2 text-h1 text-ink">{item.name}</h1>

            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <p className="text-[28px] font-semibold tracking-[-0.02em] text-ink">{price}</p>
              {item.compareAtPesewas ? (
                <p className="text-small text-ink-muted line-through">
                  {formatCedis(item.compareAtPesewas)}
                </p>
              ) : null}
              <span
                className={cn(
                  'rounded-pill px-2 py-0.5 text-[11px] font-medium',
                  unavailable ? 'bg-danger-bg text-danger' : 'bg-mint-100 text-green-deep',
                )}
              >
                {stockNote}
              </span>
            </div>

            {item.description ? (
              <p className="mt-4 whitespace-pre-line text-body leading-relaxed text-ink-muted">
                {item.description}
              </p>
            ) : null}

            <div className="mt-6 flex items-center gap-3 rounded-panel border border-hairline bg-white p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-hairline">
                {vendor.logoUrl ? (
                  <img
                    src={vendor.logoUrl}
                    alt={vendor.logoAlt ?? `${vendor.name} logo`}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="text-[14px] font-medium text-green-deep">
                    {initials(vendor.name)}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-body text-ink">{vendor.name}</p>
                <p className="truncate text-[12px] text-ink-muted">
                  {vendor.tagline ||
                    [vendor.location, vendor.category].filter(Boolean).join(' · ') ||
                    `sikatree.africa/${vendor.handle}`}
                </p>
              </div>
              <Link
                href={`/${vendor.handle}`}
                className="ml-auto shrink-0 text-[12px] font-medium text-green-deep underline underline-offset-2"
              >
                Shop
              </Link>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {unavailable ? (
                <span className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-surface-soft px-6 text-label text-ink-muted sm:w-auto">
                  {item.kind === 'service' ? 'Unavailable' : 'Sold out'}
                </span>
              ) : (
                <AddToCartButton
                  handle={vendor.handle}
                  itemId={item.id}
                  kind={item.kind}
                  stock={item.stock}
                  label={item.kind === 'service' ? 'Book this service' : 'Add to cart'}
                />
              )}
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill border border-hairline bg-white px-6 text-label text-ink transition-colors hover:border-ink/40 sm:w-auto"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Ask on WhatsApp
              </a>
            </div>

            <p className="mt-2 text-[11px] text-ink-muted">
              {item.kind === 'service'
                ? 'Pick a time with the shop to finish booking.'
                : "You'll finish your order in the shop."}
            </p>

            <ItemShareActions url={url} text={shareText} />

            <Link
              href={`/${vendor.handle}`}
              className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-green-deep underline underline-offset-2"
            >
              See all items from {vendor.name}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </article>
      </div>

      <footer className="mx-auto max-w-[1120px] px-4 pb-8 text-center text-[12px] text-ink-muted sm:px-6">
        Powered by Ostra
      </footer>
    </main>
  );
}
