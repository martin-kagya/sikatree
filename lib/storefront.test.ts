import { describe, expect, it } from 'vitest';
import {
  buildVendorLinkUrl,
  normalizeVendorLink,
  suggestAccentForCategory,
  validateStorefrontInput,
  validateVendorLink,
  type StorefrontInput,
} from '@/lib/storefront';

function input(overrides: Partial<StorefrontInput> = {}): StorefrontInput {
  return {
    name: 'Ama Glow',
    tagline: 'Skin that feels like you',
    bio: 'Handmade skincare in Accra.',
    location: 'East Legon, Accra',
    category: 'Beauty',
    accent: 'green',
    cardImageRatio: '1/1',
    logoUrl: null,
    logoAlt: null,
    coverUrl: null,
    ...overrides,
  };
}

describe('storefront settings validation', () => {
  it('normalises text and fills the logo alt default', () => {
    const result = validateStorefrontInput(
      input({ name: '  Ama Glow  ', tagline: '  ', logoUrl: 'https://cdn.test/logo.webp' }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe('Ama Glow');
    expect(result.value.tagline).toBeNull();
    expect(result.value.logoAlt).toBe('Ama Glow logo');
  });

  it('rejects bad lengths, accents and ratios', () => {
    expect(validateStorefrontInput(input({ name: 'A' })).ok).toBe(false);
    expect(validateStorefrontInput(input({ tagline: 'x' })).ok).toBe(false);
    expect(validateStorefrontInput(input({ bio: 'x'.repeat(501) })).ok).toBe(false);
    expect(validateStorefrontInput(input({ accent: 'neon' })).ok).toBe(false);
    expect(validateStorefrontInput(input({ cardImageRatio: '16/9' as never })).ok).toBe(false);
  });

  it('keeps category free text outside the suggested chips', () => {
    const result = validateStorefrontInput(input({ category: 'Vintage vinyl' }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.category).toBe('Vintage vinyl');
  });
});

describe('accent suggestions', () => {
  it('maps common categories and falls back to green', () => {
    expect(suggestAccentForCategory('Beauty')).toBe('rose');
    expect(suggestAccentForCategory('Food and drink')).toBe('clay');
    expect(suggestAccentForCategory('Photography')).toBe('ink');
    expect(suggestAccentForCategory('Vintage vinyl')).toBe('green');
    expect(suggestAccentForCategory(null)).toBe('green');
  });
});

describe('link URL building', () => {
  it('builds canonical social, phone and WhatsApp URLs', () => {
    expect(buildVendorLinkUrl('whatsapp', '024 123 4567')).toBe('https://wa.me/233241234567');
    expect(buildVendorLinkUrl('instagram', '@amaglow')).toBe('https://instagram.com/amaglow');
    expect(buildVendorLinkUrl('tiktok', 'amaglow')).toBe('https://www.tiktok.com/@amaglow');
    expect(buildVendorLinkUrl('snapchat', 'amaglow')).toBe(
      'https://www.snapchat.com/add/amaglow',
    );
    expect(buildVendorLinkUrl('facebook', 'amaglow')).toBe('https://facebook.com/amaglow');
    expect(buildVendorLinkUrl('phone', '+233 24 123 4567')).toBe('tel:+233241234567');
  });

  it('accepts only https for website, maps and custom links', () => {
    expect(buildVendorLinkUrl('website', 'https://amaglow.com')).toBe('https://amaglow.com/');
    expect(buildVendorLinkUrl('website', 'http://amaglow.com')).toBeNull();
    expect(buildVendorLinkUrl('custom', 'javascript:alert(1)')).toBeNull();
    expect(buildVendorLinkUrl('maps', 'https://maps.google.com/?q=Accra')).not.toBeNull();
  });

  it('rejects malformed handles and numbers', () => {
    expect(buildVendorLinkUrl('instagram', 'bad handle')).toBeNull();
    expect(buildVendorLinkUrl('whatsapp', '123')).toBeNull();
    expect(buildVendorLinkUrl('phone', 'call me')).toBeNull();
  });

  it('normalizes either a handle or an existing canonical URL', () => {
    expect(normalizeVendorLink('instagram', '@amaglow')).toBe('https://instagram.com/amaglow');
    expect(normalizeVendorLink('instagram', 'https://instagram.com/amaglow')).toBe(
      'https://instagram.com/amaglow',
    );
    expect(normalizeVendorLink('website', 'http://amaglow.com')).toBeNull();
  });
});

describe('link URL validation', () => {
  it('checks hosts and protocols', () => {
    expect(validateVendorLink('whatsapp', 'https://wa.me/233241234567')).toBe(true);
    expect(validateVendorLink('whatsapp', 'https://evil.test/233241234567')).toBe(false);
    expect(validateVendorLink('instagram', 'https://instagram.com/amaglow')).toBe(true);
    expect(validateVendorLink('instagram', 'https://evil.test/amaglow')).toBe(false);
    expect(validateVendorLink('phone', 'tel:+233241234567')).toBe(true);
    expect(validateVendorLink('phone', 'tel:123')).toBe(false);
    expect(validateVendorLink('website', 'http://amaglow.com')).toBe(false);
    expect(validateVendorLink('custom', 'https://amaglow.com')).toBe(true);
    expect(validateVendorLink('maps', 'https://www.google.com/maps/place/Accra')).toBe(true);
    expect(validateVendorLink('maps', 'https://evil.test/maps')).toBe(false);
  });
});
