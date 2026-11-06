export const brand = {
  name: 'sikatree',
  parent: 'Ostra',
  tagline: 'Send photos. Get a store.',
  description:
    'Send your photos on WhatsApp and get a shop link with prices, MoMo payments and bookings. Live in 10 minutes.',
} as const;

// Single source of truth for the public domain. Vendor handles are
// path-based, e.g. sikatree.africa/amasglow.
export const site = {
  domain: 'sikatree.africa',
  url: 'https://sikatree.africa',
  email: 'hello@sikatree.africa',
} as const;

export const ostra = {
  name: 'Ostra',
  mark: '/ostra-mark.svg',
  lockup: '/ostra-lockup.svg',
} as const;

// Set NEXT_PUBLIC_WHATSAPP_NUMBER (digits only, e.g. 233241234567) to enable
// the "Confirm on WhatsApp" deep link. Blank falls back to the wa.me share link.
export const contact = {
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, ''),
  prefilled: 'START',
} as const;
