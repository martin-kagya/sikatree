'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GalleryImage {
  src: string;
  alt: string;
  label: string;
}

export function ImageGallery({ images, className }: { images: GalleryImage[]; className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      Array.from(el.children).forEach((child, i) => {
        const node = child as HTMLElement;
        const distance = Math.abs(node.offsetLeft + node.clientWidth / 2 - center);
        if (distance < bestDist) {
          bestDist = distance;
          best = i;
        }
      });
      setActive(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(images.length - 1, i));
    const child = el.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const target = child.offsetLeft + child.clientWidth / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        ref={scrollRef}
        className="no-scrollbar relative flex h-[360px] w-full snap-x gap-2 overflow-x-auto sm:h-[480px] sm:overflow-visible"
      >
        {images.map((image) => (
          <div
            key={image.src}
            className="group relative h-full w-[78vw] shrink-0 snap-center overflow-hidden rounded-tile sm:w-auto sm:min-w-0 sm:flex-1 sm:shrink sm:transition-all sm:duration-500 sm:hover:flex-[3]"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 640px) 78vw, 20vw"
              className="object-cover brightness-[0.72]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-ink/5" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-lg font-bold leading-tight text-white drop-shadow-sm sm:text-xl">
                {image.label}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-white/75">Example</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center sm:hidden">
        <div className="flex items-center gap-2 rounded-full bg-ink px-2 py-1.5 shadow-float ring-1 ring-white/10">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="Previous store"
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/75 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <div className="flex items-center gap-1.5">
            {images.map((image, i) => (
              <button
                key={image.src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to ${image.label}`}
                aria-current={i === active ? 'true' : undefined}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/35',
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="Next store"
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/75 transition-colors hover:text-white"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}
