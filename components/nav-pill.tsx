'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#sample-stores', label: 'Made for' },
  { href: '#faq', label: 'FAQ' },
];

const EASE = 'ease-[cubic-bezier(0.2,0.7,0.2,1)]';

export function NavPill() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      setDark(document.documentElement.dataset.navDark === 'true');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors duration-500',
        dark ? 'bg-dark' : 'bg-white',
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-[1120px] items-center px-4 transition-all duration-500 sm:px-6',
          EASE,
          scrolled ? 'h-14' : 'h-20',
        )}
      >
        {/* Left spacer: centers the nav group at rest. */}
        <div className={cn('w-0 transition-all duration-500', EASE, scrolled ? 'grow-0' : 'grow')} />

        <a
          href="#top"
          className={cn(
            'shrink-0 whitespace-nowrap font-semibold lowercase tracking-[-0.03em] transition-all duration-500',
            EASE,
            dark ? 'text-white' : 'text-ink',
            scrolled ? 'text-[20px]' : 'text-[24px]',
          )}
        >
          sikatree
        </a>

        {/* Middle spacer: a fixed gap at rest, expands on scroll. */}
        <div
          className={cn('transition-all duration-500', EASE, scrolled ? 'w-0 grow' : 'w-10 grow-0')}
        />

        <div className="flex shrink-0 items-center gap-2">
          <nav
            className={cn(
              'hidden items-center transition-all duration-500 md:flex',
              EASE,
              scrolled ? 'gap-5' : 'gap-8',
            )}
          >
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-pill border border-transparent px-3 py-2 transition-all duration-500',
                  EASE,
                  dark
                    ? 'text-ink-on-dark-muted hover:border-hairline-dark hover:text-white'
                    : 'text-ink-muted hover:border-hairline hover:text-ink',
                  scrolled ? 'text-[13px]' : 'text-[15px]',
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <a
            href="#waitlist"
            className="hidden h-11 items-center rounded-pill bg-green-main px-5 text-[15px] font-medium text-ink md:inline-flex"
          >
            Join the waitlist
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-500 md:hidden',
              dark ? 'text-white' : 'text-ink',
            )}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Right spacer: centers the nav group at rest. */}
        <div className={cn('w-0 transition-all duration-500', EASE, scrolled ? 'grow-0' : 'grow')} />
      </div>

      {open && (
        <div
          className={cn(
            'border-t px-4 pb-5 pt-3 md:hidden',
            dark ? 'border-hairline-dark bg-dark' : 'border-hairline bg-white',
          )}
        >
          <nav className="flex flex-col">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-inner px-4 py-3 text-label',
                  dark ? 'text-white hover:bg-white/5' : 'text-ink hover:bg-surface-soft',
                )}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#waitlist"
              onClick={() => setOpen(false)}
              className="mt-3 flex h-12 items-center justify-center rounded-pill bg-green-main px-5 text-[15px] font-medium text-ink"
            >
              Join the waitlist
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
