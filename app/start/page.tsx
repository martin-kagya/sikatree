import type { Metadata } from 'next';
import Link from 'next/link';
import { StartForm } from '@/components/start-form';

export const metadata: Metadata = {
  title: 'Open your shop | sikatree',
  description:
    'Create your sikatree shop from the web: a link with prices, orders and delivery, live in minutes.',
  robots: { index: true, follow: true },
};

export const dynamic = 'force-dynamic';

export default function StartPage() {
  return (
    <main className="min-h-screen bg-page px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-[520px]">
        <Link href="/" className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
          sikatree
        </Link>
        <h1 className="mt-6 text-h1 text-ink">Open your shop</h1>
        <p className="mt-2 max-w-[440px] text-small text-ink-muted">
          One link with your photos, prices and orders. Add items from the dashboard and share the
          link on WhatsApp.
        </p>
        <div className="mt-8">
          <StartForm />
        </div>
      </div>
    </main>
  );
}
