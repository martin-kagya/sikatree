export type VerticalKind = 'goods' | 'booking';

export type VerticalItem = {
  name: string;
  price: string;
  tint: string;
};

export type Vertical = {
  id: string;
  kind: VerticalKind;
  shopName: string;
  subtitle: string;
  slug: string;
  message: string;
  items: VerticalItem[];
  cta: string;
  orderCode: string;
  amount: string;
};

// Bookings can be cut before launch by flipping this flag.
export const SHOW_BOOKINGS = true;

// Generic time chips shown for booking verticals.
export const BOOKING_TIMES = ['Today · 2:00 PM', 'Sat · 11:00 AM'];

export const VERTICALS: Vertical[] = [
  {
    id: 'skincare',
    kind: 'goods',
    shopName: "Ama's Glow",
    subtitle: 'Skincare, Kumasi',
    slug: 'amasglow',
    message: 'Serum 120, Cream 95',
    items: [
      { name: 'Serum', price: 'GH₵120', tint: '#f3e0d6' },
      { name: 'Cream', price: 'GH₵95', tint: '#e6efe4' },
    ],
    cta: 'Pay with MoMo',
    orderCode: 'AG-4821',
    amount: 'GH₵120',
  },
  {
    id: 'braids',
    kind: 'booking',
    shopName: 'Efua Braids',
    subtitle: 'Hair, Accra',
    slug: 'efuabraids',
    message: 'Knotless 300, Cornrows 150',
    items: [
      { name: 'Knotless', price: 'GH₵300', tint: '#ecd8cc' },
      { name: 'Cornrows', price: 'GH₵150', tint: '#d8e6df' },
    ],
    cta: 'Book with deposit',
    orderCode: 'EB-7730',
    amount: 'GH₵100',
  },
  {
    id: 'food',
    kind: 'goods',
    shopName: "Kofi's Kitchen",
    subtitle: 'Jollof, Tema',
    slug: 'kofiskitchen',
    message: 'Jollof 40, Waakye 35',
    items: [
      { name: 'Jollof', price: 'GH₵40', tint: '#f5e0c6' },
      { name: 'Waakye', price: 'GH₵35', tint: '#e1e7d4' },
    ],
    cta: 'Pay with MoMo',
    orderCode: 'KK-3358',
    amount: 'GH₵40',
  },
];

export const FINAL_VERTICAL = VERTICALS[0];

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function paidLabel(vertical: Vertical): string {
  return `${vertical.kind === 'booking' ? 'Booked' : 'Paid'} · Order ${vertical.orderCode}`;
}

export function toastText(vertical: Vertical): string {
  const suffix = vertical.kind === 'booking' ? 'deposit' : 'paid';
  return `New order ${vertical.orderCode} · ${vertical.amount} ${suffix}`;
}
