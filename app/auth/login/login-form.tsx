'use client';

import { useActionState } from 'react';
import { requestLoginAction, type LoginState } from '@/app/auth/login/actions';
import { PendingButton } from '@/components/system/pending-button';

const initial: LoginState = { status: 'idle' };

const field =
  'mt-1.5 h-12 w-full rounded-inner border border-hairline bg-white px-4 text-[16px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(requestLoginAction, initial);

  return (
    <div>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email" className="block text-label font-medium text-ink">
          Email
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={field}
          />
        </label>

        {state.status === 'error' ? (
          <p role="alert" className="text-small text-danger">
            {state.error}
          </p>
        ) : null}

        {state.status === 'sent' ? (
          <p className="feedback-rise rounded-inner bg-mint-100 p-3 text-small text-green-deep">
            If that email has a shop, a sign-in link is on its way. It works once and expires in 15
            minutes.
          </p>
        ) : null}

        <PendingButton
          pendingLabel="Sending…"
          className="h-12 w-full rounded-pill bg-green-main px-6 text-label text-ink disabled:opacity-50"
        >
          Email me a sign-in link
        </PendingButton>
      </form>

      <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
        No shop yet?{' '}
        <a href="/start" className="text-green-deep underline underline-offset-2">
          Create one in two minutes
        </a>
        .
      </p>
    </div>
  );
}
