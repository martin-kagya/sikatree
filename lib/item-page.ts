import { listItemImages } from '@/lib/catalogue';
import { db } from '@/lib/db';

// A single item page is the shareable unit: /{handle}/i/{itemId}. It carries the
// item photo into Open Graph so WhatsApp and social previews show the product,
// not just the shop.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SharedItem = {
  id: string;
  name: string;
  description: string | null;
  pricePesewas: number;
  compareAtPesewas: number | null;
  category: string | null;
  stock: number | null;
  status: 'active' | 'sold_out' | 'hidden';
  kind: 'product' | 'service';
  badge: 'discount' | 'popular' | 'new' | null;
  imageUrl: string | null;
  imageUrlAlt: string | null;
  images: string[];
  createdAt: string;
  vendor: {
    id: string;
    name: string;
    handle: string;
    phone: string;
    bio: string | null;
    location: string | null;
    category: string | null;
  };
};

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

export async function getSharedItem(
  rawHandle: string,
  rawItemId: string,
): Promise<SharedItem | null> {
  const handle = rawHandle.trim().toLowerCase();
  const itemId = rawItemId.trim();
  if (!handle || !UUID_RE.test(itemId)) return null;

  const rows = await db().query<{
    id: string;
    name: string;
    description: string | null;
    price_pesewas: number;
    compare_at_pesewas: number | null;
    category: string | null;
    stock: number | null;
    status: 'active' | 'sold_out' | 'hidden';
    kind: 'product' | 'service';
    badge: 'discount' | 'popular' | 'new' | null;
    image_url: string | null;
    image_url_alt: string | null;
    created_at: Date;
    vendor_id: string;
    vendor_name: string;
    vendor_handle: string;
    vendor_phone: string;
    vendor_bio: string | null;
    vendor_location: string | null;
    vendor_category: string | null;
  }>(
    `select i.id, i.name, i.description, i.price_pesewas, i.compare_at_pesewas, i.category,
            i.stock, i.status, i.kind, i.badge, i.image_url, i.image_url_alt, i.created_at,
            v.id as vendor_id, v.name as vendor_name, v.handle as vendor_handle,
            v.phone as vendor_phone, v.bio as vendor_bio, v.location as vendor_location,
            v.category as vendor_category
       from items i
       join vendors v on v.id = i.vendor_id
      where v.handle = $1 and v.status = 'live' and i.id = $2 and i.status <> 'hidden'`,
    [handle, itemId],
  );
  const row = rows.rows[0];
  if (!row) return null;

  const extras = await listItemImages(row.id);
  const candidates = [
    row.image_url,
    row.image_url_alt && looksLikeUrl(row.image_url_alt) ? row.image_url_alt : null,
    ...extras,
  ].filter((url): url is string => Boolean(url));
  const images = Array.from(new Set(candidates));

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pricePesewas: row.price_pesewas,
    compareAtPesewas: row.compare_at_pesewas,
    category: row.category,
    stock: row.stock,
    status: row.status,
    kind: row.kind,
    badge: row.badge,
    imageUrl: row.image_url,
    imageUrlAlt: row.image_url_alt,
    images,
    createdAt: row.created_at.toISOString(),
    vendor: {
      id: row.vendor_id,
      name: row.vendor_name,
      handle: row.vendor_handle,
      phone: row.vendor_phone,
      bio: row.vendor_bio,
      location: row.vendor_location,
      category: row.vendor_category,
    },
  };
}
