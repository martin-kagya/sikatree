import { db, query } from '@/lib/db';
import { SHOP_ACCENTS } from '@/lib/shop-accent';
import {
  CARD_IMAGE_RATIOS,
  LINK_KINDS,
  LINK_LABELS,
  normalizeVendorLink,
  validateStorefrontInput,
  type CardImageRatio,
  type StorefrontInput,
  type StorefrontLink,
  type StorefrontSettings,
  type ValidationResult,
  type VendorLinkInput,
  type VendorLinkKind,
} from '@/lib/storefront-shared';

export * from '@/lib/storefront-shared';

export type VendorLink = StorefrontLink & {
  id: string;
  position: number;
  visible: boolean;
};

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


export async function listVendorLinks(
  vendorId: string,
  options: { visibleOnly?: boolean } = {},
): Promise<VendorLink[]> {
  const rows = await query<{
    id: string;
    kind: VendorLinkKind;
    label: string;
    url: string;
    position: number;
    visible: boolean;
  }>(
    `select id, kind, label, url, position, visible
       from vendor_links
      where vendor_id = $1
        ${options.visibleOnly ? 'and visible = true' : ''}
      order by position, created_at`,
    [vendorId],
  );
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    label: row.label,
    url: row.url,
    position: row.position,
    visible: row.visible,
  }));
}

export async function saveVendorLinks(
  vendorId: string,
  inputs: VendorLinkInput[],
): Promise<ValidationResult<VendorLink[]>> {
  if (inputs.length > 8) {
    return { ok: false, error: 'You can add up to 8 links.' };
  }

  const seen = new Set<string>();
  const normalized: { kind: VendorLinkKind; label: string; url: string; visible: boolean }[] = [];

  for (const input of inputs) {
    if (!LINK_KINDS.includes(input.kind)) {
      return { ok: false, error: 'Choose a supported link type.' };
    }
    const url = normalizeVendorLink(input.kind, input.raw);
    if (!url) {
      return {
        ok: false,
        error: `Enter a valid ${LINK_LABELS[input.kind].toLowerCase()} handle, number or URL.`,
      };
    }
    const label = (input.label.trim() || LINK_LABELS[input.kind]);
    if (label.length < 2 || label.length > 40) {
      return { ok: false, error: 'Link labels must be between 2 and 40 characters.' };
    }
    if (input.kind !== 'custom' && seen.has(input.kind)) {
      return { ok: false, error: `Only one ${LINK_LABELS[input.kind]} link is allowed.` };
    }
    seen.add(input.kind);
    normalized.push({ kind: input.kind, label, url, visible: Boolean(input.visible) });
  }

  const client = await db().connect();
  try {
    await client.query('begin');
    await client.query('delete from vendor_links where vendor_id = $1', [vendorId]);
    for (let index = 0; index < normalized.length; index += 1) {
      const link = normalized[index];
      await client.query(
        `insert into vendor_links (vendor_id, kind, label, url, position, visible)
         values ($1, $2, $3, $4, $5, $6)`,
        [vendorId, link.kind, link.label, link.url, index, link.visible],
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  return { ok: true, value: await listVendorLinks(vendorId) };
}
