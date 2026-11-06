'use client';

import { useActionState } from 'react';
import { updateLowStockThresholdAction, type LowStockState } from './actions';

const initial: LowStockState = {};

export function LowStockSettings({ threshold }: { threshold: number | null }) {
  const [state, action, pending] = useActionState(updateLowStockThresholdAction, initial);

  return (
    <form action={action} className="mt-4">
      {state.error ? (
        <p role="alert" className="mb-4 rounded-[12px] bg-danger-bg p-3 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="mb-4 rounded-[12px] bg-mint-100 p-3 text-[13px] text-green-deep">
          Low-stock settings saved.
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">
          Alert when an item drops to (or below)
        </span>
        <input
          name="threshold"
          inputMode="numeric"
          defaultValue={threshold ?? ''}
          placeholder="Blank turns alerts off"
          className="h-11 w-full rounded-[12px] border border-hairline bg-white px-3 text-[14px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep sm:w-56"
        />
      </label>
      <p className="mt-1.5 text-[11px] text-ink-muted">
        You get a WhatsApp alert when an ordered item falls to this level or below. Leave blank to
        turn alerts off.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex h-10 items-center rounded-pill bg-ink px-5 text-small text-white hover:bg-ink/90 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save low-stock alert'}
      </button>
    </form>
  );
}
