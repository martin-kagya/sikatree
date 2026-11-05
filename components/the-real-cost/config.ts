export const TOTAL = 4000;

export const ITEMS = [
  { label: 'Design', amount: 1200 },
  { label: 'Development', amount: 1400 },
  { label: 'Domain and hosting', amount: 400 },
  { label: 'Payment setup', amount: 500 },
  { label: 'Catalogue build', amount: 500 },
] as const;

export const SERUM_PRICE = 120;
export const SERUMS = Math.ceil(TOTAL / SERUM_PRICE); // 34
export const ITEMS_ARE_ILLUSTRATIVE = true;

// Dev-time assertion: the item split is a placeholder and must always sum to TOTAL.
if (process.env.NODE_ENV !== 'production') {
  const sum = ITEMS.reduce((acc, item) => acc + item.amount, 0);
  if (sum !== TOTAL) {
    throw new Error(`[TheRealCost] ITEMS amounts sum to ${sum}, expected ${TOTAL}`);
  }
}

export const FOOTNOTE = 'Illustrative breakdown of a typical GH₵4,000 site.';

export function formatNumber(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
