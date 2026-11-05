import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-[210px] rounded-[26px] border-[6px] border-dark bg-dark shadow-float',
        className,
      )}
    >
      <div className="aspect-[9/19] overflow-hidden rounded-[18px] bg-page p-2.5">{children}</div>
    </div>
  );
}
