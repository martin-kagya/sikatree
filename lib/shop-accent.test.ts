import { describe, expect, it } from 'vitest';
import { SHOP_ACCENTS, accentFor, contrastRatio, tintForAccent } from '@/lib/shop-accent';

describe('store accents', () => {
  it('defaults to the brand green when nothing is set', () => {
    expect(accentFor(null).hex).toBe(SHOP_ACCENTS.green.hex);
    expect(accentFor('not-a-colour').hex).toBe(SHOP_ACCENTS.green.hex);
  });

  it('only returns colours from the allow-list', () => {
    for (const key of Object.keys(SHOP_ACCENTS)) {
      expect(accentFor(key)).toBe(SHOP_ACCENTS[key as keyof typeof SHOP_ACCENTS]);
    }
  });

  it('derives a very light tint from an accent', () => {
    expect(tintForAccent(SHOP_ACCENTS.green.hex)).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio('#10111f', tintForAccent(SHOP_ACCENTS.green.hex))).toBeGreaterThanOrEqual(4.5);
    expect(tintForAccent('not-a-colour')).toBe('#f4f4f2');
  });

  it('keeps every label above 4.5:1 against its fill', () => {
    for (const [key, accent] of Object.entries(SHOP_ACCENTS)) {
      const ratio = contrastRatio(accent.hex, accent.label);
      expect(ratio, `${key} label contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
