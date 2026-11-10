'use client';

import { useActionState, useState } from 'react';
import type { DeliveryFeeMode } from '@/lib/shop';
import { cn } from '@/lib/utils';
import { updateDeliverySettingsAction, type DeliverySettingsState } from './actions';
import { PendingButton } from '@/components/system/pending-button';

const initial: DeliverySettingsState = {};

const OPTIONS: { value: DeliveryFeeMode; title: string; hint: string }[] = [
  { value: 'free', title: 'Free delivery', hint: 'No charge on delivery.' },
  { value: 'fixed', title: 'Fixed fee', hint: 'Charge a rate for your region and another outside it.' },
  { value: 'confirm_after', title: 'Confirm after order', hint: 'Quote the fee once the order is in.' },
];

function feeInputValue(pesewas: number): string {
  const cedis = pesewas / 100;
  return Number.isInteger(cedis) ? String(cedis) : cedis.toFixed(2);
}

export function DeliverySettings({
  mode,
  fixedPesewas,
  outsidePesewas,
}: {
  mode: DeliveryFeeMode;
  fixedPesewas: number;
  outsidePesewas: number;
}) {
  const [state, action] = useActionState(updateDeliverySettingsAction, initial);
  const [selected, setSelected] = useState<DeliveryFeeMode>(mode);

  return (
    <form action={action} className="mt-4">
      {state.error ? (
        <p role="alert" className="mb-4 rounded-[12px] bg-danger-bg p-3 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="feedback-rise mb-4 rounded-[12px] bg-mint-100 p-3 text-[13px] text-green-deep">
          Delivery settings saved.
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const active = selected === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                'cursor-pointer rounded-[16px] border p-3 transition-colors duration-150',
                active ? 'border-green-deep bg-mint-100' : 'border-hairline bg-white hover:border-ink/30',
              )}
            >
              <input
                type="radio"
                name="mode"
                value={option.value}
                checked={active}
                onChange={() => setSelected(option.value)}
                className="sr-only"
              />
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border',
                    active ? 'border-green-deep' : 'border-ink/30',
                  )}
                >
                  {active ? <span className="h-2 w-2 rounded-full bg-green-deep" /> : null}
                </span>
                <span className="text-[13px] font-medium text-ink">{option.title}</span>
              </span>
              <span className="mt-1 block pl-6 text-[11px] leading-snug text-ink-muted">
                {option.hint}
              </span>
            </label>
          );
        })}
      </div>

      {selected === 'fixed' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">
              Within your region (GH₵)
            </span>
            <input
              name="within"
              inputMode="decimal"
              required
              min="0"
              defaultValue={feeInputValue(fixedPesewas)}
              placeholder="15.00"
              className="h-11 w-full rounded-[12px] border border-hairline bg-white px-3 text-[14px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">
              Outside your region (GH₵)
            </span>
            <input
              name="outside"
              inputMode="decimal"
              required
              min="0"
              defaultValue={feeInputValue(outsidePesewas)}
              placeholder="25.00"
              className="h-11 w-full rounded-[12px] border border-hairline bg-white px-3 text-[14px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep"
            />
          </label>
        </div>
      ) : null}

      <PendingButton
        pendingLabel="Saving…"
        className="mt-4 inline-flex h-10 items-center rounded-pill bg-ink px-5 text-small text-white hover:bg-ink/90 disabled:opacity-50"
      >
        Save delivery settings
      </PendingButton>
    </form>
  );
}
