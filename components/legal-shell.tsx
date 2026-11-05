import Link from 'next/link';
import type { ReactNode } from 'react';
import { site } from '@/lib/brand';

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-page px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-[720px]">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-sans text-[22px] font-semibold tracking-[-0.03em] text-ink">
            sikatree
          </Link>
          <Link href="/" className="text-small text-ink-muted hover:text-ink">
            Back to the page
          </Link>
        </div>

        <main className="mt-8 rounded-panel bg-white p-6 shadow-card sm:p-10">
          <h1 className="text-h1 text-ink sm:text-h1-lg">{title}</h1>
          <p className="mt-2 text-small text-ink-muted">Last updated: {updated}</p>
          <div className="legal-prose mt-8 space-y-6 text-lead text-ink">{children}</div>
        </main>

        <p className="mt-6 text-center text-small text-ink-muted">
          Questions? Email{' '}
          <a href={`mailto:${site.email}`} className="text-green-deep underline underline-offset-2">
            {site.email}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
