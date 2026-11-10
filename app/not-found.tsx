import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found | sikatree',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <div className="feedback-rise w-full max-w-[460px] rounded-panel bg-white p-8 text-center shadow-card">
        <p className="text-[12px] uppercase tracking-wide text-ink-muted">404</p>
        <h1 className="mt-2 text-h2 text-ink">This link doesn&rsquo;t exist.</h1>
        <p className="mt-2 text-small leading-relaxed text-ink-muted">
          The shop or item may have moved, been renamed, or never existed. Check the link, or start
          again below.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/"
            className="pressable inline-flex h-12 items-center justify-center rounded-pill bg-green-main px-6 text-label text-ink transition-colors hover:bg-green-main/90"
          >
            Back to sikatree
          </Link>
          <Link
            href="/start"
            className="pressable inline-flex h-12 items-center justify-center rounded-pill border border-hairline px-6 text-label text-ink transition-colors hover:border-ink/40"
          >
            Open your shop
          </Link>
        </div>
      </div>
    </main>
  );
}
