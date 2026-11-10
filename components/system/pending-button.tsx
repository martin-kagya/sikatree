'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Spinner } from '@/components/system/spinner';
import { cn } from '@/lib/utils';

// Submits inside a form and never leaves the button looking idle. The two labels
// share one grid cell, so the button keeps the wider width and does not jump.
export function PendingButton({
  children,
  pendingLabel,
  className,
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn(className, 'disabled:opacity-60')}
    >
      <span className="grid place-items-center">
        <span
          className={cn(
            'col-start-1 row-start-1 inline-flex items-center justify-center gap-2',
            pending && 'invisible',
          )}
        >
          {children}
        </span>
        <span
          className={cn(
            'col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap',
            !pending && 'invisible',
          )}
        >
          <Spinner />
          {pendingLabel}
        </span>
      </span>
    </button>
  );
}
