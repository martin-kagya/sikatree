import { describe, expect, it } from 'vitest';
import {
  badgeLabel,
  deliveryFeePesewas,
  filterItems,
  formatShopPrice,
  hasDescription,
  isSoldOut,
  pageWindow,
  soldOutLast,
  sortItems,
  stockLabel,
  type ShopItem,
} from '@/lib/shop';

function item(overrides: Partial<ShopItem> = {}): ShopItem {
  return {
    id: Math.random().toString(36),
    name: 'Serum',
    description: 'A brightening serum.',
    pricePesewas: 12000,
    compareAtPesewas: null,
    stock: null,
    category: 'Serums',
    badge: null,
    imageUrl: '/x.jpg',
    imageUrlAlt: null,
    focalX: null,
    focalY: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('formatShopPrice', () => {
  it('prints cedis the way the shop reads them', () => {
    expect(formatShopPrice(12000)).toBe('GH₵120');
    expect(formatShopPrice(4550)).toBe('GH₵45.5');
    expect(formatShopPrice(180000)).toBe('GH₵1,800');
  });
});

describe('delivery fees', () => {
  it('charges the within or outside rate in fixed mode', () => {
    expect(deliveryFeePesewas('fixed', 1500, 3000, 'within')).toBe(1500);
    expect(deliveryFeePesewas('fixed', 1500, 3000, 'outside')).toBe(3000);
    expect(deliveryFeePesewas('fixed', 1500, 3000, null)).toBe(1500);
  });

  it('charges nothing outside fixed mode', () => {
    expect(deliveryFeePesewas('free', 1500, 3000, 'within')).toBe(0);
    expect(deliveryFeePesewas('confirm_after', 1500, 3000, 'outside')).toBe(0);
  });
});

describe('stock and badges', () => {  it('only reveals low stock, never exact counts', () => {
    expect(stockLabel(0)).toBeNull();
    expect(stockLabel(1)).toBe('Only 1 left');
    expect(stockLabel(5)).toBe('Only 5 left');
    expect(stockLabel(6)).toBeNull();
    expect(stockLabel(null)).toBeNull();
  });

  it('treats a manual sold-out status as sold out even with stock', () => {
    expect(isSoldOut(item({ status: 'sold_out', stock: 8 }))).toBe(true);
    expect(isSoldOut(item({ status: 'active', stock: 0 }))).toBe(true);
    expect(isSoldOut(item({ status: 'active', stock: 8 }))).toBe(false);
    expect(isSoldOut(item({ status: 'hidden' }))).toBe(false);
  });

  it('labels badges', () => {
    expect(badgeLabel('discount')).toBe('Discount');
    expect(badgeLabel('popular')).toBe('Popular');
    expect(badgeLabel('new')).toBe('New');
    expect(badgeLabel(null)).toBeNull();
  });

  it('treats short descriptions as absent', () => {
    expect(hasDescription(item({ description: 'a' }))).toBe(false);
    expect(hasDescription(item({ description: '   ' }))).toBe(false);
    expect(hasDescription(item({ description: null }))).toBe(false);
    expect(hasDescription(item({ description: 'Soft shea butter' }))).toBe(true);
  });
});

describe('filters and sort', () => {
  const items = [
    item({ name: 'Vitamin C serum', category: 'Serums', pricePesewas: 12000, stock: 8 }),
    item({ name: 'Shea body butter', category: 'Body', pricePesewas: 4500, stock: null }),
    item({ name: 'Glow gift set', category: 'Gift sets', pricePesewas: 18000, stock: 0 }),
  ];

  it('filters by query, category, price and stock', () => {
    expect(filterItems(items, { q: 'butter', category: '', minPesewas: null, maxPesewas: null, inStockOnly: false })).toHaveLength(1);
    expect(filterItems(items, { q: '', category: 'Serums', minPesewas: null, maxPesewas: null, inStockOnly: false })).toHaveLength(1);
    expect(filterItems(items, { q: '', category: '', minPesewas: 5000, maxPesewas: 15000, inStockOnly: false })).toHaveLength(1);
    expect(filterItems(items, { q: '', category: '', minPesewas: null, maxPesewas: null, inStockOnly: true })).toHaveLength(2);
  });

  it('sorts by price and puts sold out last in featured order', () => {
    expect(sortItems(items, 'price-asc').map((i) => i.name)).toEqual([
      'Shea body butter',
      'Vitamin C serum',
      'Glow gift set',
    ]);
    const featured = soldOutLast(items);
    expect(featured[featured.length - 1].name).toBe('Glow gift set');
  });
});

describe('pagination window', () => {
  it('shows every page for short catalogues', () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });

  it('adds ellipses around the current page', () => {
    expect(pageWindow(1, 8)).toEqual([1, 2, 'ellipsis', 8]);
    expect(pageWindow(4, 8)).toEqual([1, 'ellipsis', 3, 4, 5, 'ellipsis', 8]);
  });
});
