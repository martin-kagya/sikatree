'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setItemStatusState, type ItemStatusState } from '@/app/dashboard/items/actions';
import { Spinner } from '@/components/system/spinner';
import { useToast } from '@/components/system/toast';

const initial: ItemStatusState = {};

export function ItemStatusButton({
  itemId,
  status,
  label,
  className,
}: {
  itemId: string;
  status: 'active' | 'sold_out' | 'hidden';
  label: string;
  className: string;
}) {
  const [state, action, pending] = useActionState(setItemStatusState, initial);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    if (state.message) toast.success(state.message);
    router.refresh();
  }, [state, toast, router]);

  return (
    <form action={action} className="inline-flex flex-col gap-1">
      <input type="hidden" name="id" value={itemId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`${className} inline-flex items-center justify-center gap-1.5 disabled:opacity-60`}
      >
        {pending ? (
          <>
            <Spinner />
            Saving…
          </>
        ) : (
          label
        )}
      </button>
      {state.error ? (
        <span role="alert" className="max-w-[140px] text-[11px] leading-snug text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
