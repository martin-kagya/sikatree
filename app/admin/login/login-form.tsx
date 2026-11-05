'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from '@/app/admin/actions';

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-label text-ink">
          Admin password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="h-12 w-full rounded-inner border border-hairline bg-white px-4 text-[16px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-small text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-pill bg-green-main px-6 text-label text-ink disabled:opacity-50"
      >
        {pending ? 'Checking…' : 'Sign in'}
      </button>
    </form>
  );
}
