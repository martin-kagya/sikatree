'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { startVendorAction, type StartState } from '@/app/start/actions';
import { site } from '@/lib/brand';

const initial: StartState = { status: 'idle' };

const field =
  'mt-1.5 h-12 w-full rounded-inner border border-hairline bg-white px-4 text-[16px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep';
const label = 'block text-label font-medium text-ink';

export function StartForm() {
  const [state, action, pending] = useActionState(startVendorAction, initial);

  if (state.status === 'ok') {
    return (
      <div className="feedback-rise rounded-panel bg-white p-8 shadow-card">
        <p className="text-[12px] uppercase tracking-wide text-ink-muted">Shop created</p>
        <h1 className="mt-2 text-h2 text-ink">You are live.</h1>
        <p className="mt-3 text-small text-ink-muted">
          Your shop link is{' '}
          <a
            href={`https://${site.domain}/${state.handle}`}
            className="text-green-deep underline underline-offset-2"
          >
            {site.domain}/{state.handle}
          </a>
          . Add your first items from the dashboard.
        </p>

        {state.emailSent ? (
          <p className="mt-4 rounded-inner bg-mint-100 p-3 text-small text-green-deep">
            We sent a sign-in link to {state.email}. It works once and expires in 15 minutes.
          </p>
        ) : (
          <p className="mt-4 rounded-inner bg-warn-bg p-3 text-small text-ink">
            The shop is ready, but the email did not send. Use the sign-in page to request another
            link.
          </p>
        )}

        <Link
          href="/auth/login"
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-pill bg-green-main px-6 text-label text-ink"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-panel bg-white p-8 shadow-card">
      <div>
        <label htmlFor="name" className={label}>
          Business name
        </label>
        <input id="name" name="name" required minLength={2} maxLength={80} className={field} />
      </div>

      <div>
        <label htmlFor="type" className={label}>
          What do you sell?
        </label>
        <select id="type" name="type" required defaultValue="products" className={field}>
          <option value="products">Products</option>
          <option value="services">Services</option>
          <option value="both">Both</option>
        </select>
      </div>

      <div>
        <label htmlFor="handle" className={label}>
          Your shop link
        </label>
        <div className="mt-1.5 flex items-stretch overflow-hidden rounded-inner border border-hairline bg-white focus-within:border-green-deep focus-within:ring-2 focus-within:ring-green-deep">
          <span className="flex items-center bg-page px-3 text-[13px] text-ink-muted">
            {site.domain}/
          </span>
          <input
            id="handle"
            name="handle"
            required
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9-]+"
            placeholder="amasglow"
            autoComplete="off"
            className="h-12 w-full bg-transparent px-3 text-[16px] text-ink outline-none"
          />
        </div>
        <p className="mt-1 text-[11px] text-ink-muted">Lowercase letters, numbers and hyphens.</p>
      </div>

      <div>
        <label htmlFor="phone" className={label}>
          WhatsApp number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="024 123 4567"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="email" className={label}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={field}
        />
        <p className="mt-1 text-[11px] text-ink-muted">
          We send your dashboard sign-in link here.
        </p>
      </div>

      <label className="flex items-start gap-2 text-[13px] text-ink-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 accent-[var(--green-deep)]" />
        <span>
          I agree to the{' '}
          <a href="/terms" className="text-green-deep underline underline-offset-2">
            terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-green-deep underline underline-offset-2">
            privacy notice
          </a>
          .
        </span>
      </label>

      {state.status === 'error' ? (
        <p role="alert" className="text-small text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-pill bg-green-main px-6 text-label text-ink disabled:opacity-50"
      >
        {pending ? 'Creating your shop…' : 'Create my shop'}
      </button>

      <p className="text-center text-[12px] text-ink-muted">
        Already have a shop?{' '}
        <Link href="/auth/login" className="text-green-deep underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
