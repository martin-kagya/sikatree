'use client';

import { useEffect, useState } from 'react';

// The route error boundary is part of every page's initial JS, so it stays
// intentionally lean: no icon library, no router hook, no shared component.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <div className="feedback-rise w-full max-w-[480px] rounded-panel bg-white p-8 shadow-card">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-warn-bg text-[22px] font-semibold text-ink"
        >
          !
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
            className="pressable inline-flex h-12 items-center justify-center rounded-pill bg-green-main px-6 text-label text-ink transition-colors hover:bg-green-main/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="pressable inline-flex h-12 items-center justify-center rounded-pill border border-hairline px-6 text-label text-ink transition-colors hover:border-ink/40"
          >
            Back to sikatree
          </a>
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
