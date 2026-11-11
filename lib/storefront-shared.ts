import { normalizeGhanaPhone } from '@/lib/phone';
import { SHOP_ACCENTS, type ShopAccentKey } from '@/lib/shop-accent';

// Pure storefront rules shared by the server and the editor. Keep this module
// free of pg/db imports so a client component can use the constants and types.

export const CARD_IMAGE_RATIOS = ['1/1', '4/5', '5/4'] as const;
export type CardImageRatio = (typeof CARD_IMAGE_RATIOS)[number];

export const CATEGORY_SUGGESTIONS = [
  'Beauty',
  'Fashion',
  'Food and drink',
  'Home',
  'Health',
  'Services',
  'Photography',
  'Arts and crafts',
  'Electronics',
  'Other',
] as const;

export const LINK_KINDS = [
  'whatsapp',
  'instagram',
  'tiktok',
  'snapchat',
  'facebook',
  'website',
  'maps',
  'phone',
  'custom',
] as const;
export type VendorLinkKind = (typeof LINK_KINDS)[number];

export type StorefrontSettings = {
  vendorId: string;
  handle: string;
  name: string;
  tagline: string | null;
  bio: string | null;
  location: string | null;
  category: string | null;
  accent: string;
  cardImageRatio: CardImageRatio;
  logoUrl: string | null;
  logoAlt: string | null;
  coverUrl: string | null;
};

export type StorefrontInput = Omit<StorefrontSettings, 'vendorId' | 'handle'>;

export type StorefrontLink = {
  kind: VendorLinkKind;
  label: string;
  url: string;
};

export type VendorLinkInput = {
  kind: VendorLinkKind;
  label: string;
  raw: string;
  visible: boolean;
};

export const LINK_LABELS: Record<VendorLinkKind, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
  facebook: 'Facebook',
  website: 'Website',
  maps: 'Directions',
  phone: 'Call',
  custom: 'Link',
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function textValue(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function optional(
  value: string | null | undefined,
  max: number,
  label: string,
): ValidationResult<string | null> {
  const trimmed = textValue(value);
  if (trimmed.length > max) return { ok: false, error: `${label} must be ${max} characters or fewer.` };
  return { ok: true, value: trimmed || null };
}

export function validateStorefrontInput(input: StorefrontInput): ValidationResult<StorefrontInput> {
  const name = textValue(input.name);
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: 'Shop name must be between 2 and 80 characters.' };
  }

  const tagline = textValue(input.tagline);
  if (tagline && (tagline.length < 2 || tagline.length > 80)) {
    return { ok: false, error: 'Tagline must be between 2 and 80 characters.' };
  }

  const bio = optional(input.bio, 500, 'About');
  if (!bio.ok) return bio;
  const location = optional(input.location, 60, 'Location');
  if (!location.ok) return location;
  const category = optional(input.category, 40, 'Category');
  if (!category.ok) return category;
  const logoAlt = optional(input.logoAlt, 120, 'Logo alt text');
  if (!logoAlt.ok) return logoAlt;

  if (!(input.accent in SHOP_ACCENTS)) {
    return { ok: false, error: 'Choose one of the available accent colours.' };
  }
  if (!CARD_IMAGE_RATIOS.includes(input.cardImageRatio)) {
    return { ok: false, error: 'Choose one of the available card ratios.' };
  }

  const logoUrl = textValue(input.logoUrl);
  const coverUrl = textValue(input.coverUrl);
  if (logoUrl.length > 500 || coverUrl.length > 500) {
    return { ok: false, error: 'That image URL is too long.' };
  }

  return {
    ok: true,
    value: {
      name,
      tagline: tagline || null,
      bio: bio.value,
      location: location.value,
      category: category.value,
      accent: input.accent,
      cardImageRatio: input.cardImageRatio,
      logoUrl: logoUrl || null,
      logoAlt: logoAlt.value || (logoUrl ? `${name} logo` : null),
      coverUrl: coverUrl || null,
    },
  };
}

export function suggestAccentForCategory(category: string | null | undefined): ShopAccentKey {
  const value = textValue(category).toLowerCase();
  if (!value) return 'green';
  if (/beauty|makeup|skincare|hair|nail/.test(value)) return 'rose';
  if (/fashion|clothing|thrift|shoe|bag/.test(value)) return 'ink';
  if (/food|drink|restaurant|bakery|catering/.test(value)) return 'clay';
  if (/home|furniture|decor/.test(value)) return 'sand';
  if (/health|wellness|fitness|spa/.test(value)) return 'sage';
  if (/photo|video|studio/.test(value)) return 'ink';
  if (/art|craft|jewel/.test(value)) return 'clay';
  if (/electronic|tech|gadget/.test(value)) return 'ink';
  return 'green';
}

function handleValue(raw: string): string {
  return raw.trim().replace(/^@+/, '').replace(/\/+$/, '');
}

function digitsValue(raw: string): string {
  return raw.replace(/\D/g, '');
}

function httpsUrl(raw: string): URL | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function isHandle(value: string): boolean {
  return /^[A-Za-z0-9._-]{1,60}$/.test(value);
}

export function buildVendorLinkUrl(kind: VendorLinkKind, raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > 300) return null;

  switch (kind) {
    case 'whatsapp': {
      const normalized = normalizeGhanaPhone(value);
      const digits = normalized ? digitsValue(normalized) : digitsValue(value);
      return /^\d{8,15}$/.test(digits) ? `https://wa.me/${digits}` : null;
    }
    case 'instagram': {
      const handle = handleValue(value);
      return isHandle(handle) ? `https://instagram.com/${handle}` : null;
    }
    case 'tiktok': {
      const handle = handleValue(value);
      return isHandle(handle) ? `https://www.tiktok.com/@${handle}` : null;
    }
    case 'snapchat': {
      const handle = handleValue(value);
      return isHandle(handle) ? `https://www.snapchat.com/add/${handle}` : null;
    }
    case 'facebook': {
      const handle = handleValue(value);
      return isHandle(handle) ? `https://facebook.com/${handle}` : null;
    }
    case 'phone': {
      const digits = digitsValue(value);
      return /^\d{8,15}$/.test(digits) ? `tel:+${digits}` : null;
    }
    case 'maps':
    case 'website':
    case 'custom': {
      const url = httpsUrl(value);
      return url ? url.toString() : null;
    }
    default:
      return null;
  }
}

// Accept either the canonical URL (editing an existing row) or the raw handle,
// number or URL the vendor types.
export function normalizeVendorLink(kind: VendorLinkKind, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (validateVendorLink(kind, value)) return value;
  return buildVendorLinkUrl(kind, value);
}

export function validateVendorLink(kind: VendorLinkKind, raw: string): boolean {
  const value = raw.trim();
  if (!value || value.length > 300) return false;

  if (kind === 'phone') return /^tel:\+?\d{8,15}$/.test(value);
  if (kind === 'whatsapp') {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'wa.me' && /^\/\d{8,15}$/.test(url.pathname);
    } catch {
      return false;
    }
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    switch (kind) {
      case 'instagram':
        return host === 'instagram.com' || host === 'www.instagram.com';
      case 'tiktok':
        return host === 'tiktok.com' || host === 'www.tiktok.com';
      case 'snapchat':
        return host === 'snapchat.com' || host === 'www.snapchat.com';
      case 'facebook':
        return host === 'facebook.com' || host === 'www.facebook.com';
      case 'maps':
        return (
          host === 'maps.google.com' ||
          ((host === 'google.com' || host === 'www.google.com') && url.pathname.startsWith('/maps')) ||
          (host === 'goo.gl' && url.pathname.startsWith('/maps'))
        );
      case 'website':
      case 'custom':
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}
