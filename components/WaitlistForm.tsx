'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, MessageCircle, Share2 } from '@/components/icons';
import {
  claimHandle,
  joinWaitlist,
  saveShopDetails,
  type ClaimState,
  type WaitlistState,
  type DetailsState,
} from '@/app/actions';
import { normalizeGhanaPhone, formatGhanaPhone } from '@/lib/phone';
import { checkHandle, normalizeHandle, suggestHandle, type HandleStatus } from '@/lib/handle';
import { contact, site } from '@/lib/brand';
import { ORDER_BANDS } from '@/lib/waitlist-bands';
import { attribution, track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const TYPES = [
  { value: 'products', label: 'Sell products' },
  { value: 'services', label: 'Offer services' },
  { value: 'both', label: 'Both' },
] as const;

const initialWaitlist: WaitlistState = { ok: false };
const initialDetails: DetailsState = { ok: false };

type HandleCheck =
  | { status: 'idle' | 'checking' }
  | { status: 'available' }
  | { status: 'taken'; suggestion?: string }
  | { status: 'error' };

// Layout is added at each call site: inside a 52px flex row inputs are h-full
// and transparent, standalone fields set their own height and fill.
const inputCls =
  'w-full text-[16px] text-white outline-none placeholder:text-white/70';

const handleMessage = (status: HandleStatus): string | null => {
  if (status === 'too-short' || status === 'invalid') {
    return '3–24 characters: letters, numbers and dashes.';
  }
  if (status === 'reserved' || status === 'blocked') return 'That link is reserved. Try another.';
  return null;
};

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
  const [monthlyOrders, setMonthlyOrders] = useState('');
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [handleCheck, setHandleCheck] = useState<HandleCheck>({ status: 'idle' });
  const [attrs, setAttrs] = useState({
    ref: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
  });

  const mountedAt = useRef<number>(0);
  const elapsedInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
    const a = attribution();
    setAttrs({
      ref: a.ref ?? '',
      utmSource: a.utmSource ?? '',
      utmMedium: a.utmMedium ?? '',
      utmCampaign: a.utmCampaign ?? '',
    });
  }, []);

  const normalizedHandle = normalizeHandle(handle);
  const handleStatus = checkHandle(normalizedHandle);
  const pureProblem = handleMessage(handleStatus);

  // Debounced real availability check once the format is valid.
  useEffect(() => {
    if (handleStatus !== 'available') {
      setHandleCheck({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    setHandleCheck({ status: 'checking' });
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/handles?handle=${encodeURIComponent(normalizedHandle)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('check failed');
        const data = (await response.json()) as {
          available: boolean;
          suggestion?: string;
        };
        setHandleCheck(
          data.available
            ? { status: 'available' }
            : { status: 'taken', suggestion: data.suggestion },
        );
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setHandleCheck({ status: 'error' });
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [normalizedHandle, handleStatus]);

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
    await copy(url);
  };

  const copy = async (value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const whatsappHref = useMemo(() => {
    if (!contact.whatsappNumber) return null;
    // The bot matches the whole message against START, so keep it exact.
    return `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(contact.prefilled)}`;
  }, []);

  if (state.ok) {
    const position = state.position;
    const referralUrl = state.referralUrl ?? '';

    return (
      <div className="wl-success mx-auto max-w-md">
        <div className="text-center">
          <div className="wl-success-check mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-green-deep">
            <Check className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h3 className="mt-5 text-h3 text-white sm:text-h3-lg">
            {state.already ? 'You’re already in.' : 'You’re in.'}
          </h3>

          {position ? (
            <p className="mt-3 text-small text-ink-on-dark-muted">
              You’re spot{' '}
              <span className="text-[22px] font-medium tracking-tight text-white">#{position}</span>{' '}
              in line.
            </p>
          ) : (
            <p className="mt-2 text-body text-ink-on-dark-muted">Your spot is saved.</p>
          )}

          {state.handle ? (
            <p className="mt-1 text-small text-ink-on-dark-muted">
              {site.domain}/<span className="font-medium text-white">{state.handle}</span> is
              reserved for you.
            </p>
          ) : state.handleTaken ? (
            <p className="mt-1 text-small text-warn-edge">
              That link was claimed while you were typing. Pick another below.
            </p>
          ) : null}

          {state.phone && (
            <p className="mt-1 text-small text-ink-on-dark-muted">
              We’ll message {formatGhanaPhone(state.phone)} on WhatsApp.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-card border border-hairline-dark bg-surface-dark p-5 text-left">
          {state.referralUrl ? (
            <>
              <h4 className="text-label text-white">Move up the line</h4>
              <p className="mt-1 text-small text-ink-on-dark-muted">
                Invite a vendor who sells. Every vendor who joins with your link moves you up a spot.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={referralUrl.replace(/^https?:\/\//, '')}
                  aria-label="Your referral link"
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-11 min-w-0 flex-1 rounded-inner border border-hairline-dark bg-[#101010] px-3 text-small text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    track('share_click', { kind: 'copy_referral' });
                    void copy(referralUrl);
                  }}
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill border border-hairline-dark px-4 text-small text-white transition-colors hover:border-white/60"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </>
          ) : null}

          <div className={cn(state.referralUrl && 'mt-5 border-t border-hairline-dark pt-5')}>
            <h4 className="text-label text-white">Tell us about your shop</h4>
            <p className="mt-1 text-small text-ink-on-dark-muted">
              Optional, and it helps us get you set up faster.
            </p>

            {detailsState.ok ? (
              <p className="mt-4 text-small text-green-main">
                {detailsState.message ?? 'Thanks, that helps.'}
              </p>
            ) : (
            <form action={detailsAction} className="mt-4 space-y-4">
              <input type="hidden" name="phone" value={state.phone ?? ''} />

              <fieldset>
                <legend className="mb-2 block text-label text-white">I mostly…</legend>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={cn(
                        'inline-flex h-11 cursor-pointer items-center rounded-pill border px-4 text-[15px] font-medium transition-colors',
                        businessType === type.value
                          ? 'border-white bg-white text-ink'
                          : 'border-hairline-dark bg-surface-dark text-white hover:border-white/60',
                      )}
                    >
                      <input
                        type="radio"
                        name="businessType"
                        value={type.value}
                        checked={businessType === type.value}
                        onChange={() => setBusinessType(type.value)}
                        className="sr-only"
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 block text-label text-white">
                  Roughly how many orders a month?{' '}
                  <span className="text-ink-on-dark-muted">(optional)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ORDER_BANDS.map((band) => (
                    <label
                      key={band.value}
                      className={cn(
                        'inline-flex h-11 cursor-pointer items-center rounded-pill border px-4 text-[15px] font-medium transition-colors',
                        monthlyOrders === band.value
                          ? 'border-white bg-white text-ink'
                          : 'border-hairline-dark bg-surface-dark text-white hover:border-white/60',
                      )}
                    >
                      <input
                        type="radio"
                        name="monthlyOrders"
                        value={band.value}
                        checked={monthlyOrders === band.value}
                        onChange={() => setMonthlyOrders(band.value)}
                        className="sr-only"
                      />
                      {band.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {detailsState.error && (
                <p role="alert" className="text-small text-danger">
                  {detailsState.error}
                </p>
              )}

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
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => track('whatsapp_click', { surface: 'success' })}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-green-main px-6 text-label text-ink transition-transform duration-150 hover:-translate-y-px active:scale-[0.98] sm:w-auto sm:flex-1"
            >
              <MessageCircle className="h-4 w-4" />
              Confirm on WhatsApp
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => {
              track('share_click', { kind: 'share' });
              void share();
            }}
            className={cn(
              'inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill border border-hairline-dark px-6 text-label text-white transition-colors hover:border-white/60 sm:w-auto',
              whatsappHref ? 'sm:w-auto' : 'sm:flex-1',
            )}
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>

        {referralUrl ? (
          <div className="mt-3 text-center">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `I’m on the sikatree waitlist. Vendors: send photos, get a store. ${referralUrl}`,
              )}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => track('share_click', { kind: 'whatsapp_share' })}
              className="text-small text-ink-on-dark-muted underline underline-offset-4 hover:text-white"
            >
              Share on WhatsApp
            </a>
          </div>
        ) : null}

        <p className="mt-4 text-center text-[12px] text-ink-on-dark-muted">
          {whatsappHref
            ? 'Tapping Confirm opens WhatsApp. Say hi and we’ll start your setup early.'
            : 'We’ll reach out on WhatsApp when your spot opens.'}
        </p>

        {!state.handle && state.phone ? (
          <ClaimHandleForm phone={state.phone} suggested={state.handleSuggestion} />
        ) : null}

      </div>
    );
  }

  const handleNote =
    pureProblem ??
    (handleCheck.status === 'checking'
      ? 'Checking availability…'
      : handleCheck.status === 'taken'
        ? `Taken. Try /${handleCheck.suggestion ?? suggestHandle(normalizedHandle)}.`
        : null);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        if (elapsedInput.current) {
          elapsedInput.current.value = String(Date.now() - mountedAt.current);
        }
        track('form_submit', { surface: 'waitlist', handle: normalizedHandle || null });
      }}
      onFocus={() => track('form_start', { surface: 'waitlist' })}
      className="relative mx-auto max-w-md space-y-5 text-left"
    >
      {/* Anti-bot: hidden from people, irresistible to scripts (LP-19). */}
      <div aria-hidden className="pointer-events-none absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={elapsedInput} type="hidden" name="elapsed" defaultValue="" />
      <input type="hidden" name="ref" value={attrs.ref} />
      <input type="hidden" name="utmSource" value={attrs.utmSource} />
      <input type="hidden" name="utmMedium" value={attrs.utmMedium} />
      <input type="hidden" name="utmCampaign" value={attrs.utmCampaign} />
      <input type="hidden" name="source" value="landing" />

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
            onChange={(event) => setPhone(event.target.value)}
            onBlur={onPhoneBlur}
            placeholder="24 123 4567"
            required
            className={cn(inputCls, 'h-full bg-transparent pl-2 pr-4')}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="businessName" className="mb-1.5 block text-label text-white">
            Business name <span className="text-ink-on-dark-muted">(optional)</span>
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Ama’s Glow Studio"
            maxLength={80}
            className={cn(
              inputCls,
              'h-[52px] rounded-inner border border-hairline-dark bg-surface-dark px-4 focus:border-green-main focus:ring-2 focus:ring-green-main',
            )}
          />
        </div>

        <div>
          <label htmlFor="handle" className="mb-1.5 block text-label text-white">
            Reserve your link <span className="text-ink-on-dark-muted">(optional)</span>
          </label>
          <div className="flex h-[52px] items-center overflow-hidden rounded-inner border border-hairline-dark bg-surface-dark focus-within:border-green-main focus-within:ring-2 focus-within:ring-green-main">
            <span className="pl-3 text-[13px] text-white/70">{site.domain}/</span>
            <input
              id="handle"
              name="handle"
              type="text"
              value={handle}
              onChange={(event) => setHandle(normalizeHandle(event.target.value))}
              placeholder="amasglow"
              autoComplete="off"
              spellCheck={false}
              className={cn(inputCls, 'h-full bg-transparent pl-0.5 pr-3')}
            />
          </div>
        </div>
      </div>

      <div className="min-h-[16px] text-[12px]">
        {handleNote ? (
          <p className={pureProblem || handleCheck.status === 'taken' ? 'text-warn-edge' : 'text-ink-on-dark-muted'}>
            {handleNote}
          </p>
        ) : normalizedHandle && handleCheck.status === 'available' ? (
          <p className="text-green-main">
            <span className="font-medium">{normalizedHandle}</span> is available.
          </p>
        ) : (
          <p className="text-ink-on-dark-muted">Reserve a link so it’s ready when you launch.</p>
        )}
      </div>

      <label className="flex items-start gap-3 text-[12px] leading-relaxed text-ink-on-dark-muted">
        <input
          type="checkbox"
          name="consent"
          defaultChecked
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--green-main)]"
        />
        <span>
          Message me on WhatsApp about my spot. See our{' '}
          <a href="/privacy" className="text-white underline underline-offset-2">
            privacy notice
          </a>
          .
        </span>
      </label>

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
        {pending
          ? 'Joining…'
          : handleCheck.status === 'available'
            ? `Reserve /${normalizedHandle}`
            : 'Join the waitlist'}
      </button>
      <p className="text-center text-[12px] text-ink-on-dark-muted">
        We’ll message you on WhatsApp when your spot opens.
      </p>
    </form>
  );
}

function ClaimHandleForm({ phone, suggested }: { phone: string; suggested?: string }) {
  const [state, action, pending] = useActionState(claimHandle, { ok: false } as ClaimState);
  const [value, setValue] = useState(suggested ?? '');
  const normalized = normalizeHandle(value);
  const status = checkHandle(normalized);
  const problem = handleMessage(status);

  if (state.ok) {
    return (
      <div className="mt-6 rounded-card border border-hairline-dark bg-surface-dark p-5 text-left">
        <p className="text-small text-green-main">
          {site.domain}/<span className="font-medium">{state.handle}</span> is reserved for you.
        </p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="mt-6 rounded-card border border-hairline-dark bg-surface-dark p-5 text-left"
    >
      <h4 className="text-label text-white">Reserve your link</h4>
      <p className="mt-1 text-small text-ink-on-dark-muted">
        Optional, but it will be waiting for you when your shop opens.
      </p>
      <input type="hidden" name="phone" value={phone} />
      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-inner border border-hairline-dark bg-[#101010] focus-within:border-green-main focus-within:ring-2 focus-within:ring-green-main">
          <span className="pl-3 text-[13px] text-white/70">{site.domain}/</span>
          <input
            name="handle"
            value={value}
            onChange={(event) => setValue(normalizeHandle(event.target.value))}
            placeholder="amasglow"
            aria-label="Your link"
            autoComplete="off"
            spellCheck={false}
            className="h-full w-full bg-transparent pl-0.5 pr-3 text-[15px] text-white outline-none placeholder:text-white/70"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !normalized || Boolean(problem)}
          className="inline-flex h-11 shrink-0 items-center rounded-pill bg-green-main px-5 text-label text-ink disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Reserve'}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="mt-2 text-[12px] text-danger">
          {state.error}
        </p>
      ) : problem ? (
        <p className="mt-2 text-[12px] text-ink-on-dark-muted">{problem}</p>
      ) : null}
    </form>
  );
}
