'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// A thin indeterminate bar while a dashboard link is navigating. Next's
// loading boundary only streams once the server responds, so this gives the
// click immediate feedback in dev and on slow connections.
export function NavProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest('a');
      if (!target) return;
      if (target.target === '_blank' || target.hasAttribute('download')) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
        return;
      }
      if (href === pathname) return;
      setPending(true);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  return (
    <div
      id="nav-progress"
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-150',
        pending ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div
        className={cn('h-full w-1/3 bg-green-main', pending && 'animate-[nav-progress_1.1s_ease-in-out_infinite]')}
      />
    </div>
  );
}
