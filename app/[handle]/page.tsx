import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Storefront } from '@/components/shop/storefront';
import { site } from '@/lib/brand';
import { query } from '@/lib/db';
import { normalizeHandle } from '@/lib/handle';
import { DELIVERY_FEE_MODES, type DeliveryFeeMode, type ShopItem } from '@/lib/shop';

export const dynamic = 'force-dynamic';

type VendorRow = {
  name: string;
  handle: string;
  phone: string;
  type: 'products' | 'services' | 'both' | null;
  bio: string | null;
  location: string | null;
  category: string | null;
  accent: string | null;
  card_image_ratio: string;
  delivery_fee_mode: string;
  delivery_fee_pesewas: number;
};

type ItemRow = {
  id: string;
  name: string;
  description: string | null;
  price_pesewas: number;
  compare_at_pesewas: number | null;
  stock: number | null;
  status: 'active' | 'sold_out';
  category: string | null;
  badge: 'discount' | 'popular' | 'new' | null;
  focal_x: string | null;
  focal_y: string | null;
  image_url: string | null;
  image_url_alt: string | null;
  created_at: Date;
};

async function loadVendor(
  rawHandle: string,
): Promise<{ vendor: VendorRow; items: ShopItem[] } | null> {
  const handle = normalizeHandle(decodeURIComponent(rawHandle));
  if (!handle) return null;

  const vendors = await query<VendorRow>(
    `select name, handle, phone, type, bio, location, category, accent, card_image_ratio,
            delivery_fee_mode, delivery_fee_pesewas
       from vendors
      where handle = $1 and status = 'live'`,
    [handle],
  );
  const vendor = vendors[0];
  if (!vendor) return null;

  const rows = await query<ItemRow>(
    `select id, name, description, price_pesewas, compare_at_pesewas, stock, status, category,
            badge, focal_x, focal_y, image_url, image_url_alt, created_at
       from items
      where vendor_id = (select id from vendors where handle = $1)
        and status in ('active', 'sold_out')
      order by position, created_at`,
    [handle],
  );

  const items: ShopItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    pricePesewas: row.price_pesewas,
    compareAtPesewas: row.compare_at_pesewas,
    stock: row.stock,
    status: row.status,
    category: row.category,
    badge: row.badge,
    imageUrl: row.image_url,
    imageUrlAlt: row.image_url_alt,
    focalX: row.focal_x === null ? null : Number(row.focal_x),
    focalY: row.focal_y === null ? null : Number(row.focal_y),
    createdAt: row.created_at.toISOString(),
  }));

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
  let data;
  try {
    data = await loadVendor(handle);
  } catch (error) {
    const dbError = error as { message?: string; code?: string };
    console.error('[storefront] load failed', {
      message: dbError.message,
      code: dbError.code,
    });
    throw error;
  }
  if (!data) notFound();

  const { vendor, items } = data;

  const deliveryFeeMode: DeliveryFeeMode = DELIVERY_FEE_MODES.includes(
    vendor.delivery_fee_mode as DeliveryFeeMode,
  )
    ? (vendor.delivery_fee_mode as DeliveryFeeMode)
    : 'fixed';

  return (
    <Storefront
      vendor={{
        name: vendor.name,
        handle: vendor.handle,
        phone: vendor.phone,
        bio: vendor.bio,
        location: vendor.location,
        category: vendor.category,
        accent: vendor.accent,
        cardImageRatio: vendor.card_image_ratio,
        type: vendor.type,
        deliveryFeeMode,
        deliveryFeePesewas: vendor.delivery_fee_pesewas,
      }}
      items={items}
      pageUrl={`https://${site.domain}/${vendor.handle}`}
      domain={site.domain}
    />
  );
}
