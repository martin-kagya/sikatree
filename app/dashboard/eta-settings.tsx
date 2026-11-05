'use client';

import { useActionState } from 'react';
import { updateEtaSettingsAction, type EtaSettingsState } from './actions';

const initial: EtaSettingsState = {};

const field =
  'h-11 w-full rounded-[12px] border border-hairline bg-white px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-green-deep focus:ring-2 focus:ring-green-deep';

export function EtaSettings({
  withinText,
  outsideText,
  pickupText,
}: {
  withinText: string;
  outsideText: string;
  pickupText: string;
}) {
  const [state, action, pending] = useActionState(updateEtaSettingsAction, initial);

  return (
    <form action={action} className="mt-4">
      {state.error ? (
        <p role="alert" className="mb-4 rounded-[12px] bg-danger-bg p-3 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="mb-4 rounded-[12px] bg-mint-100 p-3 text-[13px] text-green-deep">
          Delivery time saved.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
            Delivery time in your region
          </span>
          <input
            name="etaWithin"
            maxLength={120}
            required
            defaultValue={withinText}
            placeholder="Delivery in 45 to 60 minutes"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
            Delivery time outside your region
          </span>
          <input
            name="etaOutside"
            maxLength={120}
            required
            defaultValue={outsideText}
            placeholder="Delivery in 1 to 2 days"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Pickup time</span>
          <input
            name="etaPickup"
            maxLength={120}
            required
            defaultValue={pickupText}
            placeholder="Ready for pickup in about 30 minutes"
            className={field}
          />
        </label>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-muted">
        Shown to the customer after they order, based on their delivery zone. Appointments use the
        chosen date and time.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex h-10 items-center rounded-pill bg-ink px-5 text-small text-white hover:bg-ink/90 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save delivery time'}
      </button>
    </form>
  );
}
