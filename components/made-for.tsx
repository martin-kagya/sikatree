'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Accent } from '@/components/ui/accent';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ITEMS = [
  { index: '01', title: 'Hair and braids', desc: 'Wigs, braids and styling, booked and paid.', src: '/hustles/hair.jpg' },
  { index: '02', title: 'Beauty and perfume', desc: 'Skincare, makeup and fragrance.', src: '/hustles/beauty.jpg' },
  { index: '03', title: 'Fashion and thrift', desc: 'Clothes, shoes and accessories.', src: '/hustles/thrift.jpg' },
  { index: '04', title: 'Food and cakes', desc: 'Meals, snacks and custom cakes.', src: '/hustles/food.jpg' },
  { index: '05', title: 'Photography and events', desc: 'Shoots, coverage and editing.', src: '/hustles/photography.jpg' },
];

export function MadeFor() {
  const [active, setActive] = useState(0);
  const item = ITEMS[active];

  return (
    <section id="made-for" className="scroll-mt-24 px-3 py-12 sm:px-5 sm:py-20">
      <div className="mx-auto max-w-[1360px] rounded-[24px] bg-dark p-6 sm:rounded-[32px] sm:p-12">
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow onDark>Made for</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-h2 text-white sm:text-h2-lg">
            Made for hustlers who <Accent>sell</Accent> and serve
          </h2>

          <div className="mt-10 grid gap-8 md:grid-cols-[280px_1fr] md:items-start">
            <div>
              <div className="relative aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-inner">
                {ITEMS.map((it, i) => (
                  <Image
                    key={it.index}
                    src={it.src}
                    alt={i === active ? `Example: ${it.title}` : ''}
                    fill
                    sizes="280px"
                    aria-hidden={i !== active}
                    className={cn(
                      'object-cover transition-all duration-500 ease-out',
                      i === active ? 'scale-100 opacity-100' : 'scale-105 opacity-0',
                    )}
                  />
                ))}
              </div>
              <p
                key={item.desc}
                className="animate-fade-in mt-3 max-w-[280px] text-small text-ink-on-dark-muted"
              >
                {item.desc}
              </p>
              <Button href="#waitlist" variant="inverse" className="mt-4 w-full max-w-[280px]">
                See sample stores
              </Button>
            </div>

            <ul className="md:pl-2">
              {ITEMS.map((it, i) => (
                <li key={it.index} className="border-b border-hairline-dark last:border-0">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-selected={i === active}
                    className={cn(
                      'flex w-full items-baseline gap-3 py-5 text-left transition-colors',
                      i === active ? 'text-white' : 'text-ink-on-dark-muted hover:text-white',
                    )}
                  >
                    <span className="text-[12px] text-ink-on-dark-muted">[{it.index}]</span>
                    <span className="text-[24px] font-medium tracking-[-0.03em] sm:text-[32px]">
                      {it.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
