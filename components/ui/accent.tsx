import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Accent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('font-serif font-normal italic text-[1.08em] leading-none', className)}>
      {children}
    </span>
  );
}
