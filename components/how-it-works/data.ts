export type HiWStep = {
  title: string;
  body: string;
  tag: string;
};

export const STEPS: HiWStep[] = [
  {
    title: 'Your DMs, today',
    body: 'Prices asked ten times a day, orders buried under chats, MoMo receipts sent as screenshots.',
    tag: 'Monday, 12:00',
  },
  {
    title: 'Send photos and prices',
    body: 'On WhatsApp, type “Serum, 120”. sikatree reads the name and the price and asks you to confirm.',
    tag: '12:04',
  },
  {
    title: 'You’re live',
    body: 'Your own page with a catalogue, ready in about 10 minutes. Share the link anywhere.',
    tag: '12:09',
  },
  {
    title: 'Get paid with MoMo',
    body: 'Orders arrive with a code and the money is already in. One tap to confirm.',
    tag: 'Same evening',
  },
];

export const SHOW_REVIEW_STEP = true;

export const VENDOR = {
  shopName: "Ama's Glow",
  subtitle: 'Skincare, Kumasi',
  slug: 'amasglow',
  items: [
    { name: 'Serum', price: 'GH₵120', tint: '#f3e0d6' },
    { name: 'Cream', price: 'GH₵95', tint: '#e6efe4' },
  ],
} as const;

export const ORDER = {
  code: 'ORD-4F9K',
  item: '1 × Serum',
  buyer: 'Kofi A.',
  amount: 'GH₵120.00',
} as const;

export const DM_ROWS = [
  { name: 'Kofi A.', line: 'how much for the serum?', unread: 3 },
  { name: 'Ama B.', line: 'send location pls', unread: 1 },
  { name: 'Esi', line: 'hello?? still available', unread: 2 },
  { name: 'Kwame', line: 'paid, check ur momo', unread: 1 },
  { name: 'Yaa', line: 'pls price??', unread: 1 },
  { name: 'Efua', line: 'do you do delivery to Tema', unread: 1 },
] as const;
