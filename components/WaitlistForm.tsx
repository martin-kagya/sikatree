'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, MessageCircle, Share2 } from '@/components/icons';
import { Eyebrow } from '@/components/ui/eyebrow';
import {
  claimHandle,
  joinWaitlist,
  saveShopDetails,
  type ClaimState,
  type WaitlistState,
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

  const [phone, setPhone] = useState('');
  const [handle, setHandle] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [monthlyOrders, setMonthlyOrders] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
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
  const savedTimer = useRef<number | undefined>(undefined);
  const linkCopiedTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(savedTimer.current);
      window.clearTimeout(linkCopiedTimer.current);
    },
    [],
  );

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

  const share = async (url: string) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'sikatree', text: 'Send photos. Get a store.', url });
        return;
      } catch {
        /* dismissed */
      }
    }
    if (await copy(url)) {
      setLinkCopied(true);
      window.clearTimeout(linkCopiedTimer.current);
      linkCopiedTimer.current = window.setTimeout(() => setLinkCopied(false), 2200);
    }
  };

  const copy = async (value: string): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  };

  const persistDetails = async (next: { businessType?: string; monthlyOrders?: string }) => {
    if (!state.phone) return;
    const data = new FormData();
    data.set('phone', state.phone);
    if (next.businessType !== undefined) data.set('businessType', next.businessType);
    if (next.monthlyOrders !== undefined) data.set('monthlyOrders', next.monthlyOrders);

    setDetailsSaving(true);
    setDetailsError(null);
    try {
      const result = await saveShopDetails({ ok: false }, data);
      if (result.ok) {
        setDetailsSaved(true);
        window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setDetailsSaved(false), 2200);
      } else {
        setDetailsError(result.error ?? 'Could not save. Try again.');
      }
    } catch {
      setDetailsError('Could not save. Try again.');
    } finally {
      setDetailsSaving(false);
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
    const phoneLine = state.phone ? formatGhanaPhone(state.phone) : '';

    return (
      <div className="mx-auto w-full max-w-[960px] px-5 pb-16 pt-10 lg:pt-14">
        <div className="lg:grid lg:grid-cols-[380px_1fr] lg:items-start lg:gap-14">
          <div className="wl-success text-center lg:text-left">
            <div className="wl-success-check mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(63,165,92,0.16)] text-[var(--green-main)] lg:mx-0">
              <Check className="h-5 w-5" strokeWidth={2} />
            </div>

            <h3 className="mt-4 text-[26px] font-semibold leading-tight text-white">
              {state.already ? 'You’re already in' : 'You’re in'}
            </h3>

            {position ? (
              <div className="mt-1 flex items-end justify-center gap-2 lg:justify-start">
                <span className="text-[72px] font-bold leading-none tracking-[-0.05em] text-white">
                  #{position}
                </span>
                <span className="pb-2.5 text-small text-ink-on-dark-muted">in line</span>
              </div>
            ) : (
              <p className="mt-2 text-small text-ink-on-dark-muted">Your spot is saved.</p>
            )}

            {state.handle ? (
              <p className="mt-3 inline-flex max-w-full items-center gap-1 rounded-pill border border-[#2B2B2B] px-3 py-1.5 text-[13px] text-ink-on-dark-muted">
                <span className="truncate">
                  {site.domain}/<span className="font-medium text-white">{state.handle}</span>
                </span>
                <span className="shrink-0">· reserved</span>
              </p>
            ) : null}

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                onClick={() => track('whatsapp_click', { surface: 'success' })}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-[var(--green-main)] px-6 text-label font-medium text-[#0B2218] transition-transform duration-150 hover:-translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-dark)]"
              >
                <MessageCircle className="h-4 w-4" />
                Confirm on WhatsApp
              </a>
            ) : null}

            {phoneLine ? (
              <p className="mt-3 text-[13px] leading-snug text-ink-on-dark-muted">
                We’ll message {phoneLine}. Say hi and we’ll start your setup early.
              </p>
            ) : null}

            {!state.handle && state.phone ? (
              <div className="mt-6 text-left">
                <ClaimHandleForm phone={state.phone} suggested={state.handleSuggestion} />
              </div>
            ) : null}
          </div>

          <div className="mt-6 space-y-3 lg:mt-0">
            {referralUrl ? (
              <div className="rounded-card border border-[#2B2B2B] bg-[var(--surface-dark)] p-5">
                <h4 className="text-label text-white">Move up the line</h4>
                <p className="mt-1 text-small text-ink-on-dark-muted">
                  Invite a vendor who sells. Every vendor who joins with your link moves you up a
                  spot.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    readOnly
                    value={referralUrl.replace(/^https?:\/\//, '')}
                    aria-label="Your referral link"
                    onFocus={(event) => event.currentTarget.select()}
                    className="h-12 min-w-0 flex-1 rounded-pill border border-[#2B2B2B] bg-[#101010] px-4 text-small text-white outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      track('share_click', { kind: 'copy_referral' });
                      void copy(referralUrl);
                    }}
                    className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-pill border border-[#2B2B2B] px-4 text-small text-white transition-colors hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-dark)]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    track('share_click', { kind: 'share' });
                    void share(referralUrl);
                  }}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-[#2C2C2A] text-label text-white transition-colors hover:bg-[#363633] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-dark)]"
                >
                  <Share2 className="h-4 w-4" />
                  Share your link
                </button>

                <p aria-live="polite" className="mt-2 text-center text-[12px] text-ink-on-dark-muted">
                  {linkCopied ? 'Link copied' : ''}
                </p>
              </div>
            ) : null}

            <div className="rounded-card border border-[#2B2B2B] bg-[var(--surface-dark)]">
              <button
                type="button"
                aria-expanded={detailsOpen}
                aria-controls="setup-details"
                onClick={() => setDetailsOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-dark)]"
              >
                <span>
                  <span className="block text-label text-white">Help us set you up faster</span>
                  <span className="mt-0.5 block text-[12px] text-ink-on-dark-muted">
                    Optional · takes 30 seconds
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-ink-on-dark-muted transition-transform duration-[250ms]',
                    detailsOpen && 'rotate-180',
                  )}
                />
              </button>

              <div
                id="setup-details"
                className={cn(
                  'grid transition-[grid-template-rows] duration-[250ms] ease-out',
                  detailsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-4 px-5 pb-5">
                    <fieldset>
                      <legend className="mb-2 block text-label text-white">I mostly…</legend>
                      <div className="flex flex-wrap gap-2">
                        {TYPES.map((type) => (
                          <label
                            key={type.value}
                            className={cn(
                              'inline-flex h-12 cursor-pointer items-center rounded-pill border px-4 text-[15px] font-medium transition-colors',
                              businessType === type.value
                                ? 'border-transparent bg-white text-ink'
                                : 'border-[#2B2B2B] text-white hover:border-white/40',
                            )}
                          >
                            <input
                              type="radio"
                              name="businessType"
                              value={type.value}
                              checked={businessType === type.value}
                              onChange={() => {
                                setBusinessType(type.value);
                                void persistDetails({ businessType: type.value });
                              }}
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
                              'inline-flex h-12 cursor-pointer items-center rounded-pill border px-4 text-[15px] font-medium transition-colors',
                              monthlyOrders === band.value
                                ? 'border-transparent bg-white text-ink'
                                : 'border-[#2B2B2B] text-white hover:border-white/40',
                            )}
                          >
                            <input
                              type="radio"
                              name="monthlyOrders"
                              value={band.value}
                              checked={monthlyOrders === band.value}
                              onChange={() => {
                                setMonthlyOrders(band.value);
                                void persistDetails({ monthlyOrders: band.value });
                              }}
                              className="sr-only"
                            />
                            {band.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <p aria-live="polite" className="text-[12px] text-ink-on-dark-muted">
                      {detailsSaving ? 'Saving…' : detailsSaved ? 'Saved' : (detailsError ?? '')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
    <div className="mx-auto max-w-[560px]">
      <div className="flex justify-center">
        <Eyebrow onDark>Early access</Eyebrow>
      </div>
      <h2 className="mt-4 text-center text-h2 text-white sm:text-h2-lg">Reserve your spot</h2>
      <p className="mx-auto mt-3 max-w-md text-center text-body text-ink-on-dark-muted">
        Just your WhatsApp number. Everything else is optional.
      </p>

      <form
        action={formAction}
      onSubmit={() => {
        if (elapsedInput.current) {
          elapsedInput.current.value = String(Date.now() - mountedAt.current);
        }
        track('form_submit', { surface: 'waitlist', handle: normalizedHandle || null });
      }}
      onFocus={() => track('form_start', { surface: 'waitlist' })}
      className="relative mx-auto mt-8 max-w-md space-y-5 text-left"
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
    </div>
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
