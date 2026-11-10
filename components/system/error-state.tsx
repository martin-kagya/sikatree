'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from '@/components/icons';
import { cn } from '@/lib/utils';

// The shared route error surface. It catches anything the server action
// boundaries did not, keeps the user oriented, and always offers a way forward.
export function ErrorState({
  error,
  reset,
  fullPage = true,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  fullPage?: boolean;
}) {
  const pathname = usePathname();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    console.error('[ui] route error', error);
  }, [error]);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const insideDashboard = pathname.startsWith('/dashboard') && pathname !== '/dashboard';
  const back = insideDashboard
    ? { href: '/dashboard', label: 'Back to dashboard' }
    : { href: '/', label: 'Back to sikatree' };

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-page px-4 py-10',
        fullPage ? 'min-h-screen' : 'min-h-[60vh]',
      )}
    >
      <div className="feedback-rise w-full max-w-[480px] rounded-panel bg-white p-8 shadow-card">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warn-bg text-ink">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="mt-5 text-[12px] uppercase tracking-wide text-ink-muted">
          Something interrupted
        </p>
        <h1 className="mt-1 text-h2 text-ink">That didn&rsquo;t load.</h1>
        <p className="mt-2 text-small leading-relaxed text-ink-muted">
          {offline
            ? "You're offline. Reconnect and try again. Nothing you entered was sent."
            : 'The page hit a problem. Nothing you entered was sent. Try again, or head back.'}
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-ink-muted">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="pressable inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-green-main px-6 text-label text-ink transition-colors hover:bg-green-main/90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href={back.href}
            className="pressable inline-flex h-12 items-center justify-center rounded-pill border border-hairline px-6 text-label text-ink transition-colors hover:border-ink/40"
          >
            {back.label}
          </Link>
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-ink-muted">
          Still stuck? Email{' '}
          <a
            href="mailto:hello@sikatree.africa"
            className="text-green-deep underline underline-offset-2"
          >
            hello@sikatree.africa
          </a>{' '}
          with the reference above.
        </p>
      </div>
    </div>
  );
}
