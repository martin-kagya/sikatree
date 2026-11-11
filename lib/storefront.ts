import { query } from '@/lib/db';
import { SHOP_ACCENTS } from '@/lib/shop-accent';
import {
  CARD_IMAGE_RATIOS,
  validateStorefrontInput,
  type CardImageRatio,
  type StorefrontInput,
  type StorefrontSettings,
  type ValidationResult,
} from '@/lib/storefront-shared';

export * from '@/lib/storefront-shared';

// Database side of storefront customization. The pure rules live in
// lib/storefront-shared.ts so the editor can import them without pulling pg
// into the client bundle.

export async function getStorefrontSettings(vendorId: string): Promise<StorefrontSettings | null> {
  const rows = await query<{
    id: string;
    handle: string;
    name: string;
    tagline: string | null;
    bio: string | null;
    location: string | null;
    category: string | null;
    accent: string | null;
    card_image_ratio: string;
    logo_url: string | null;
    logo_alt: string | null;
    cover_url: string | null;
  }>(
    `select id, handle, name, tagline, bio, location, category, accent,
            card_image_ratio, logo_url, logo_alt, cover_url
       from vendors
      where id = $1`,
    [vendorId],
  );
  const row = rows[0];
  if (!row) return null;

  return {
    vendorId: row.id,
    handle: row.handle,
    name: row.name,
    tagline: row.tagline,
    bio: row.bio,
    location: row.location,
    category: row.category,
    accent: row.accent && row.accent in SHOP_ACCENTS ? row.accent : 'green',
    cardImageRatio: CARD_IMAGE_RATIOS.includes(row.card_image_ratio as CardImageRatio)
      ? (row.card_image_ratio as CardImageRatio)
      : '1/1',
    logoUrl: row.logo_url,
    logoAlt: row.logo_alt,
    coverUrl: row.cover_url,
  };
}

export async function saveStorefrontSettings(
  vendorId: string,
  input: StorefrontInput,
): Promise<ValidationResult<StorefrontInput>> {
  const validated = validateStorefrontInput(input);
  if (!validated.ok) return validated;
  const value = validated.value;

  await query(
    `update vendors
        set name = $2,
            tagline = $3,
            bio = $4,
            location = $5,
            category = $6,
            accent = $7,
            card_image_ratio = $8,
            logo_url = $9,
            logo_alt = $10,
            cover_url = $11,
            updated_at = now()
      where id = $1`,
    [
      vendorId,
      value.name,
      value.tagline,
      value.bio,
      value.location,
      value.category,
      value.accent,
      value.cardImageRatio,
      value.logoUrl,
      value.logoAlt,
      value.coverUrl,
    ],
  );

  return { ok: true, value };
}
