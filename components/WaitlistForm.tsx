'use client';

import { useActionState, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { joinWaitlist, saveShopDetails, type WaitlistState, type DetailsState } from '@/app/actions';
import { normalizeGhanaPhone, formatGhanaPhone } from '@/lib/phone';
import { checkHandle, normalizeHandle, suggestHandle } from '@/lib/handle';
import { site } from '@/lib/brand';
import { cn } from '@/lib/utils';

const TYPES = ['Sell products', 'Offer services', 'Both'] as const;

const initialWaitlist: WaitlistState = { ok: false };
const initialDetails: DetailsState = { ok: false };

const inputCls =
  'h-full w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/70';

export function WaitlistForm() {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialWaitlist);
  const [detailsState, detailsAction, detailsPending] = useActionState(
    saveShopDetails,
    initialDetails,
  );

  const [phone, setPhone] = useState('');
  const [handle, setHandle] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [shared, setShared] = useState(false);

  const normalizedHandle = normalizeHandle(handle);
  const handleStatus = checkHandle(normalizedHandle);
  const handleTaken = handleStatus === 'reserved';
  const handleAvailable = handleStatus === 'available';
  const handleSuggestion = handleTaken ? suggestHandle(normalizedHandle) : null;

  const onPhoneBlur = () => {
    if (!phone.trim()) {
      setPhoneError(null);
      return;
    }
    setPhoneError(
      normalizeGhanaPhone(phone) ? null : 'That doesn’t look like a Ghana number. Try 024 123 4567.',
    );
  };

  const share = async () => {
    const url = site.url;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'sikatree', text: 'Send photos. Get a store.', url });
        return;
      } catch {
        /* dismissed */
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 2000);
      } catch {
        /* noop */
      }
    }
  };

  if (state.ok) {
    return (
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-green-deep">
            <Check className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h3 className="mt-5 text-h3 text-white sm:text-h3-lg">You’re in.</h3>
          <p className="mt-2 text-body text-ink-on-dark-muted">
            {state.handle ? (
              <>
                {site.domain}/<span className="font-medium text-white">{state.handle}</span> is
                reserved for you.
              </>
            ) : (
              'Your spot is saved.'
            )}
          </p>
          {state.phone && (
            <p className="mt-1 text-small text-ink-on-dark-muted">
              We’ll message {formatGhanaPhone(state.phone)} on WhatsApp.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-card border border-hairline-dark bg-surface-dark p-6 text-left">
          <h4 className="text-h3 text-white">One more thing: tell us about your shop</h4>
          <p className="mt-1 text-small text-ink-on-dark-muted">
            Optional, and it helps us get you set up faster.
          </p>

          {detailsState.ok ? (
            <p className="mt-4 text-small text-green-main">{detailsState.message ?? 'Thanks — that helps.'}</p>
          ) : (
            <form action={detailsAction} className="mt-4 space-y-4">
              <input type="hidden" name="phone" value={state.phone ?? ''} />
              <input type="hidden" name="handle" value={state.handle ?? ''} />

              <fieldset>
                <legend className="mb-2 block text-label text-white">I mostly…</legend>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((type) => (
                    <label
                      key={type}
                      className={cn(
                        'inline-flex h-11 cursor-pointer items-center rounded-pill border px-4 text-[15px] font-medium transition-colors',
                        businessType === type
                          ? 'border-white bg-white text-ink'
                          : 'border-hairline-dark bg-surface-dark text-white hover:border-white/60',
                      )}
                    >
                      <input
                        type="radio"
                        name="businessType"
                        value={type}
                        checked={businessType === type}
                        onChange={() => setBusinessType(type)}
                        className="sr-only"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="businessName" className="mb-1.5 block text-label text-white">
                  Business name <span className="text-ink-on-dark-muted">(optional)</span>
                </label>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ama’s Glow Studio"
                  className={cn(
                    inputCls,
                    'h-[52px] rounded-inner border border-hairline-dark bg-surface-dark px-4 focus:border-green-main focus:ring-2 focus:ring-green-main',
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={detailsPending}
                className="w-full rounded-pill bg-green-main px-6 py-3 text-label text-ink disabled:opacity-50"
              >
                {detailsPending ? 'Saving…' : 'Save details'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <p className="text-small text-ink-on-dark-muted">Know a vendor? Share sikatree.</p>
          <button
            type="button"
            onClick={share}
            className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-hairline-dark px-4 text-small text-white transition-colors hover:border-white/60"
          >
            <Share2 className="h-3.5 w-3.5" />
            {shared ? 'Copied' : 'Share'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-md space-y-5 text-left">
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-label text-white">
          WhatsApp number <span className="text-ink-on-dark-muted">(required)</span>
        </label>
        <div
          className={cn(
            'flex h-[52px] items-center overflow-hidden rounded-inner border bg-surface-dark focus-within:ring-2 focus-within:ring-green-main',
            phoneError ? 'border-danger' : 'border-hairline-dark focus-within:border-green-main',
          )}
        >
          <span className="pl-4 text-[16px] text-white/80">+233</span>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={onPhoneBlur}
            placeholder="24 123 4567"
            className={cn(inputCls, 'pl-2 pr-4')}
          />
        </div>
        {phoneError ? (
          <p role="alert" className="mt-1.5 text-[12px] text-danger">
            {phoneError}
          </p>
        ) : (
          <p className="mt-1.5 text-[12px] text-ink-on-dark-muted">
            We only use this to message you about your spot.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="handle" className="mb-1.5 block text-label text-white">
          Reserve your link <span className="text-ink-on-dark-muted">(optional)</span>
        </label>
        <div className="flex h-[52px] items-center overflow-hidden rounded-inner border border-hairline-dark bg-surface-dark focus-within:border-green-main focus-within:ring-2 focus-within:ring-green-main">
          <span className="pl-4 text-[15px] text-white/80">{site.domain}/</span>
          <input
            id="handle"
            name="handle"
            type="text"
            value={handle}
            onChange={(e) =>
              setHandle(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '')
                  .slice(0, 24),
              )
            }
            placeholder="amasglow"
            autoComplete="off"
            spellCheck={false}
            className={cn(inputCls, 'pl-0.5 pr-4')}
          />
        </div>
        <div className="mt-1.5 min-h-[16px] text-[12px]">
          {handleStatus === 'available' && (
            <p className="text-green-main">
              <span className="font-medium">{normalizedHandle}</span> is available.
            </p>
          )}
          {handleStatus === 'reserved' && handleSuggestion && (
            <p className="text-warn-edge">
              Taken — try{' '}
              <button
                type="button"
                onClick={() => setHandle(handleSuggestion)}
                className="font-medium underline underline-offset-2"
              >
                {handleSuggestion}
              </button>
              .
            </p>
          )}
          {(handleStatus === 'too-short' || handleStatus === 'invalid') && (
            <p className="text-ink-on-dark-muted">3–24 characters: letters, numbers and dashes.</p>
          )}
          {handleStatus === 'idle' && (
            <p className="text-ink-on-dark-muted">Reserve a link so it’s ready when you launch.</p>
          )}
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-small text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-pill bg-green-main px-6 py-3.5 text-label text-ink disabled:opacity-50"
      >
        {pending ? 'Joining…' : handleAvailable ? `Reserve /${normalizedHandle}` : 'Join the waitlist'}
      </button>
      <p className="text-center text-[12px] text-ink-on-dark-muted">
        We’ll message you on WhatsApp when your spot opens.
      </p>
    </form>
  );
}
