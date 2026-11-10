'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from '@/components/icons';
import { cn } from '@/lib/utils';

// Persistent, quiet status for a dropped connection. It sits above sticky bars,
// never blocks the page, and confirms reconnection without reloading.
export function ConnectionBanner() {
  const [offline, setOffline] = useState(false);
  const [restored, setRestored] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let wasOffline = !navigator.onLine;
    setOffline(wasOffline);

    function update() {
      const nowOffline = !navigator.onLine;
      setOffline(nowOffline);

      if (wasOffline && !nowOffline) {
        setRestored(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setRestored(false), 3000);
      }
      if (nowOffline) {
        setRestored(false);
        window.clearTimeout(timer.current);
      }
      wasOffline = nowOffline;
    }

    window.addEventListener('offline', update);
    window.addEventListener('online', update);
    return () => {
      window.removeEventListener('offline', update);
      window.removeEventListener('online', update);
      window.clearTimeout(timer.current);
    };
  }, []);

  const visible = offline || restored;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-4 transition-all duration-200 ease-[var(--ease-standard)]',
        'bottom-24 sm:bottom-6',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      <div className="pointer-events-auto flex min-h-[44px] items-center gap-2.5 rounded-pill bg-ink px-4 py-2 text-[13px] text-white shadow-card">
        <span
          aria-hidden="true"
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            offline ? 'bg-[var(--warn-edge)]' : 'bg-green-main',
          )}
        />
        <span>
          {offline
            ? "You're offline. Changes won't save until you reconnect."
            : 'Back online.'}
        </span>
        {restored ? <Check className="h-4 w-4 shrink-0 text-green-main" aria-hidden="true" /> : null}
      </div>
    </div>
  );
}
