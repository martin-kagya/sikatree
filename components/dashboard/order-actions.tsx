'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  setOrderDeliveryFeeState,
  updateOrderStatusState,
  type OrderFeeState,
  type OrderStatusState,
} from '@/app/dashboard/actions';
import { Spinner } from '@/components/system/spinner';
import { useToast } from '@/components/system/toast';

const initialStatus: OrderStatusState = {};
const initialFee: OrderFeeState = {};

function StatusButton({
  orderId,
  status,
  label,
}: {
  orderId: string;
  status: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(updateOrderStatusState, initialStatus);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    if (state.message) toast.success(state.message);
    router.refresh();
  }, [state, toast, router]);

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-pill bg-ink px-3 text-[12px] font-medium text-white disabled:opacity-60"
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
        <span role="alert" className="max-w-[180px] text-[11px] leading-snug text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function OrderStatusButtons({
  orderId,
  actions,
}: {
  orderId: string;
  actions: { status: string; label: string }[];
}) {
  return (
    <>
      {actions.map((action) => (
        <StatusButton
          key={action.status}
          orderId={orderId}
          status={action.status}
          label={action.label}
        />
      ))}
    </>
  );
}

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(updateOrderStatusState, initialStatus);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    if (state.message) toast.success(state.message);
    router.refresh();
  }, [state, toast, router]);

  return (
    <form
      action={action}
      className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3"
    >
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="status" value="cancelled" />
      <input
        name="reason"
        placeholder="Reason for cancelling (optional)"
        maxLength={200}
        className="h-8 min-w-0 flex-1 rounded-[8px] border border-hairline bg-white px-2 text-[12px] text-ink outline-none focus:border-green-deep"
      />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="pressable inline-flex h-8 items-center gap-1.5 rounded-pill border border-danger px-3 text-[12px] font-medium text-danger disabled:opacity-60"
      >
        {pending ? (
          <>
            <Spinner />
            Cancelling…
          </>
        ) : (
          'Cancel order'
        )}
      </button>
      {state.error ? (
        <span role="alert" className="w-full text-[11px] text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function DeliveryFeeForm({ orderId, hasFee = false }: { orderId: string; hasFee?: boolean }) {
  const [state, action, pending] = useActionState(setOrderDeliveryFeeState, initialFee);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    if (state.message) toast.success(state.message);
    router.refresh();
  }, [state, toast, router]);

  return (
    <form
      action={action}
      className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3"
    >
      <input type="hidden" name="id" value={orderId} />
      <label className="flex items-center gap-2 text-[12px] text-ink-muted">
        Delivery fee (GH₵)
        <input
          name="fee"
          inputMode="decimal"
          required
          min="0"
          placeholder="15"
          className="h-8 w-24 rounded-[8px] border border-hairline bg-white px-2 text-[12px] text-ink outline-none focus:border-green-deep"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-ink px-3 text-[12px] font-medium text-white disabled:opacity-60"
      >
        {pending ? (
          <>
            <Spinner />
            Setting…
          </>
        ) : (
          hasFee ? 'Update fee' : 'Set fee'
        )}
      </button>
      {state.error ? (
        <span role="alert" className="w-full text-[11px] text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
