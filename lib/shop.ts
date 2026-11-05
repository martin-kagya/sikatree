// Helpers for the public product listing. Pure functions so the component stays
// about layout and the rules are unit tested.

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'newest';

export type ShopItem = {
  id: string;
  name: string;
  description: string | null;
  pricePesewas: number;
  compareAtPesewas: number | null;
  stock: number | null;
  category: string | null;
  badge: 'discount' | 'popular' | 'new' | null;
  imageUrl: string | null;
  imageUrlAlt: string | null;
  focalX: number | null;
  focalY: number | null;
  createdAt: string;
};

export const PAGE_SIZE = 24;
// Flat delivery fee for this slice (ORD-03 vendor config comes later).
export const DELIVERY_FEE_PESEWAS = 1500;

const priceFormat = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatShopPrice(pesewas: number): string {
  return priceFormat.format(pesewas / 100);
}

// Storefront never reveals exact inventory above the low threshold.
export function stockLabel(stock: number | null): string | null {
  if (stock === null || stock <= 0) return null;
  if (stock <= 5) return `Only ${stock} left`;
  return null;
}

export function badgeLabel(badge: ShopItem['badge']): string | null {
  if (badge === 'discount') return 'Discount';
  if (badge === 'popular') return 'Popular';
  if (badge === 'new') return 'New';
  return null;
}

export function hasDescription(item: ShopItem): boolean {
  return typeof item.description === 'string' && item.description.trim().length >= 3;
}

export type Filters = {
  q: string;
  category: string;
  minPesewas: number | null;
  maxPesewas: number | null;
  inStockOnly: boolean;
};

export function filterItems(items: ShopItem[], filters: Filters): ShopItem[] {
  const query = filters.q.trim().toLowerCase();
  const category = filters.category === 'All' ? '' : filters.category;

  return items.filter((item) => {
    if (category && item.category !== category) return false;
    if (filters.inStockOnly && item.stock !== null && item.stock <= 0) return false;
    if (filters.minPesewas !== null && item.pricePesewas < filters.minPesewas) return false;
    if (filters.maxPesewas !== null && item.pricePesewas > filters.maxPesewas) return false;
    if (!query) return true;
    const haystack = `${item.name} ${item.category ?? ''} ${item.description ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function sortItems(items: ShopItem[], sort: SortKey): ShopItem[] {
  const copy = [...items];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.pricePesewas - b.pricePesewas);
    case 'price-desc':
      return copy.sort((a, b) => b.pricePesewas - a.pricePesewas);
    case 'newest':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return copy;
  }
}

// Sold-out products stay visible but sort last in the featured order.
export function soldOutLast(items: ShopItem[]): ShopItem[] {
  return [...items].sort((a, b) => {
    const aOut = a.stock !== null && a.stock <= 0 ? 1 : 0;
    const bOut = b.stock !== null && b.stock <= 0 ? 1 : 0;
    return aOut - bOut;
  });
}

export function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push('ellipsis');
    result.push(page);
    previous = page;
  }
  return result;
}
