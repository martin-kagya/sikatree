'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

// First-party funnel instrumentation (LP-20): page views, scroll depth and
// clicks on anything tagged with data-event. No third-party scripts.
export function Analytics() {
  useEffect(() => {
    track('page_view');

    const reported = new Set<number>();
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const depth = Math.round((window.scrollY / scrollable) * 100);
      for (const mark of [25, 50, 75, 100]) {
        if (depth >= mark && !reported.has(mark)) {
          reported.add(mark);
          track('scroll_depth', { depth: mark });
        }
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const tagged = target?.closest?.('[data-event]') as HTMLElement | null;

      if (tagged?.dataset.event) {
        track(tagged.dataset.event, { label: tagged.dataset.eventLabel ?? '' });
        return;
      }

      // Every "Join the waitlist" anchor is a CTA click, wherever it lives.
      const cta = target?.closest?.('a[href="#waitlist"]') as HTMLElement | null;
      if (cta) {
        track('cta_click', {
          label: (cta.textContent ?? '').trim().slice(0, 60),
          source: 'anchor',
        });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return null;
}
