'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { contact, site } from '@/lib/brand';

const WaitlistForm = dynamic(
  () => import('@/components/WaitlistForm').then((module) => module.WaitlistForm),
  { ssr: false, loading: () => <WaitlistSkeleton /> },
);

function WaitlistSkeleton() {
  return (
    <div className="mx-auto min-h-[420px] max-w-[900px] rounded-panel bg-white/5 p-6 sm:p-8" aria-hidden="true">
      <div className="h-7 w-56 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-4 w-full max-w-[420px] animate-pulse rounded-full bg-white/10" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="h-12 animate-pulse rounded-inner bg-white/10" />
        <div className="h-12 animate-pulse rounded-inner bg-white/10" />
        <div className="h-12 animate-pulse rounded-inner bg-white/10 sm:col-span-2" />
      </div>
      <div className="mt-6 h-12 w-full animate-pulse rounded-pill bg-white/10 sm:w-56" />
    </div>
  );
}

// The form is the largest client component on the landing page and sits far
// below the fold. Load it only when the visitor gets close, and reserve its
// space so the page never jumps.
export function WaitlistSection() {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="waitlist"
      className="scroll-mt-24 bg-dark px-3 pb-16 pt-6 sm:px-5 sm:pb-24 sm:pt-8"
    >
      {ready ? (
        <WaitlistForm />
      ) : (
        <>
          <WaitlistSkeleton />
          <noscript>
            <div className="mx-auto max-w-[900px] rounded-panel bg-white p-6 text-center shadow-card sm:p-8">
              <p className="text-h3 text-ink">Join the waitlist on WhatsApp.</p>
              <p className="mt-2 text-small text-ink-muted">
                Send us a message and we will add you to the list.
              </p>
              <a
                href={
                  contact.whatsappNumber
                    ? `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent('WAITLIST')}`
                    : `mailto:${site.email}?subject=Waitlist`
                }
                className="mt-4 inline-flex h-12 items-center justify-center rounded-pill bg-green-main px-6 text-label text-ink"
              >
                Message sikatree
              </a>
            </div>
          </noscript>
        </>
      )}
    </section>
  );
}
