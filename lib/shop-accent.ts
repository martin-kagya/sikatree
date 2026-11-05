// Store accent allow-list. Each entry ships a label colour that reaches 4.5:1
// against its fill; the storefront never accepts a free-form colour.

export type ShopAccent = {
  hex: string;
  label: string;
  name: string;
};

export const SHOP_ACCENTS = {
  green: { hex: '#3fa55c', label: '#10111f', name: 'Green' },
  sage: { hex: '#5b6f63', label: '#ffffff', name: 'Sage' },
  clay: { hex: '#8d4f35', label: '#ffffff', name: 'Clay' },
  rose: { hex: '#9b4a5f', label: '#ffffff', name: 'Rose' },
  ink: { hex: '#10111f', label: '#ffffff', name: 'Ink' },
  sand: { hex: '#a9855a', label: '#10111f', name: 'Sand' },
} as const;

export type ShopAccentKey = keyof typeof SHOP_ACCENTS;

export function accentFor(key: string | null | undefined): ShopAccent {
  if (key && key in SHOP_ACCENTS) return SHOP_ACCENTS[key as ShopAccentKey];
  return SHOP_ACCENTS.green;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
