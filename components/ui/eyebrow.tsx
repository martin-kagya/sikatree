import type { ReactNode } from 'react';
import { CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Eyebrow({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-label font-medium',
        onDark ? 'text-white' : 'text-ink',
      )}
    >
      <CircleDot className="h-4 w-4" strokeWidth={1.75} />
      {children}
    </span>
  );
}
