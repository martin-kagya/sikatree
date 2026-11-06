'use client';

import Link, { useLinkStatus } from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Menu, MessageCircle, Settings, ShoppingCart, X } from '@/components/icons';
import { cn } from '@/lib/utils';
import { logoutAction } from './actions';

function PendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden="true"
      className="ml-auto h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/20 border-t-ink"
    />
  );
}

const LINKS = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/support', label: 'Support', icon: MessageCircle },
];

// Hamburger with an accordion drop: the panel grows out of the button and
// folds back in when it closes.
export function DashboardMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (root.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="dashboard-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="inline-flex h-9 w-9 items-center justify-center rounded-pill border border-hairline bg-white text-ink transition-colors duration-150 hover:border-ink/40"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <div
        id="dashboard-menu"
        className={cn(
          'absolute right-0 top-11 z-40 w-60 origin-top-right',
          'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          open ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'rounded-[16px] border border-hairline bg-white p-1.5 shadow-float',
              'transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
              open ? 'translate-y-0 scale-100' : '-translate-y-1 scale-95',
            )}
          >
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-small text-ink transition-colors duration-150 hover:bg-page"
              >
                <Icon className="h-4 w-4 text-ink-muted" />
                {label}
                <PendingDot />
              </Link>
            ))}
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-small text-ink transition-colors duration-150 hover:bg-page"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
