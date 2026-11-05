import { describe, expect, it } from 'vitest';
import { parseItems } from '@/lib/parsing/text-items';

describe('parseItems', () => {
  it('parses the price formats vendors type', () => {
    const cases = [
      'Vitamin C serum 120',
      'Vitamin C serum GHS 120',
      'Vitamin C serum GH₵120',
      'Vitamin C serum 120 cedis',
      'Vitamin C serum 120ghc',
    ];
    for (const input of cases) {
      const result = parseItems(input);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.items[0].name).toBe('Vitamin C serum');
      expect(result.items[0].pricePesewas).toBe(12000);
    }
  });

  it('takes the last number as the price, not a size', () => {
    const result = parseItems('Blue block heels size 40, 250');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0].name).toBe('Blue block heels size 40');
    expect(result.items[0].pricePesewas).toBe(25000);
  });

  it('reads stock only when stated', () => {
    const result = parseItems('Vitamin C serum 120 only 8 left');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0]).toEqual({ name: 'Vitamin C serum', pricePesewas: 12000, stock: 8 });
  });

  it('splits a comma list into several items', () => {
    const result = parseItems('Knotless braids 300, Box braids 250, Cornrows 120');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.map((item) => [item.name, item.pricePesewas])).toEqual([
      ['Knotless braids', 30000],
      ['Box braids', 25000],
      ['Cornrows', 12000],
    ]);
  });

  it('splits lines into several items', () => {
    const result = parseItems('Jollof 40\nWaakye 35');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(2);
  });

  it('asks instead of guessing at bundles and deposits', () => {
    expect(parseItems('2 for 400')).toMatchObject({ ok: false, reason: 'ambiguous' });
    expect(parseItems('Bridal makeup 600, deposit 200')).toMatchObject({
      ok: false,
      reason: 'ambiguous',
    });
  });

  it('asks for a price when there is none', () => {
    expect(parseItems('DM for price')).toMatchObject({ ok: false, reason: 'no-price' });
    expect(parseItems('Vitamin C serum')).toMatchObject({ ok: false, reason: 'no-price' });
  });

  it('handles decimals and thousands separators', () => {
    const result = parseItems('Perfume 1,250.50');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0].pricePesewas).toBe(125050);
  });

  it('rejects empty input', () => {
    expect(parseItems('   ')).toMatchObject({ ok: false, reason: 'empty' });
  });
});
