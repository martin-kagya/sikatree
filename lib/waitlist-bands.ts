// Pure helpers for the "orders per month" waitlist question, safe for the
// client bundle.

export const ORDER_BANDS = [
  { value: 'just-starting', label: 'Just starting' },
  { value: '1-20', label: '1–20' },
  { value: '21-50', label: '21–50' },
  { value: '51-100', label: '51–100' },
  { value: '101-300', label: '101–300' },
  { value: '300-plus', label: '300+' },
] as const;

export type OrderBand = (typeof ORDER_BANDS)[number]['value'];

const VALUES = ORDER_BANDS.map((band) => band.value) as readonly string[];

export function isOrderBand(value: unknown): value is OrderBand {
  return typeof value === 'string' && VALUES.includes(value);
}

export function orderBandLabel(value: OrderBand | null): string {
  return ORDER_BANDS.find((band) => band.value === value)?.label ?? 'Not said';
}
