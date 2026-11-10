import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter_Tight, Playfair_Display } from 'next/font/google';
import { site } from '@/lib/brand';
import { Analytics } from '@/components/analytics';
import { ConnectionStatus } from '@/components/system/connection-status';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

// Only the italic cut is used (the Accent component), so the roman file is not
// downloaded at all.
const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['400'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: 'sikatree: send photos, get a store',
  description:
    'Send your photos on WhatsApp. Get a free shop link with prices, MoMo payments and bookings. Live in 10 minutes.',
  alternates: { canonical: '/' },
  icons: {
    icon: '/ostra-mark.svg',
    apple: '/ostra-mark.svg',
  },
  openGraph: {
    type: 'website',
    url: site.url,
    siteName: 'sikatree',
    title: 'sikatree: send photos, get a store',
    description:
      'Send your photos on WhatsApp. Get a free shop link with prices, MoMo payments and bookings. Live in 10 minutes.',
    locale: 'en_GH',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'sikatree: send photos, get a store',
    description: 'Your shop link, live in 10 minutes. Join the waitlist.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} ${playfair.variable}`}>
      <body className="font-sans">
        {children}
        <ConnectionStatus />
        <Analytics />
      </body>
    </html>
  );
}
