'use server';

import { headers } from 'next/headers';
import { clientIp } from '@/lib/admin-auth';
import { hitRateLimit } from '@/lib/rate-limit';
import { safeNext } from '@/lib/safe-next';
import { requestEmailLogin } from '@/lib/vendor-login';

export type LoginState =
  | { status: 'idle' }
  | { status: 'sent' }
  | { status: 'error'; error: string };

export async function requestLoginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const ip = clientIp(await headers());
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const nextPath = safeNext(String(formData.get('next') ?? ''), '');

  const ipLimit = await hitRateLimit(`login:ip:${ip}`, 10, 900).catch(() => null);
  if (ipLimit && !ipLimit.allowed) {
    return { status: 'error', error: 'Too many attempts. Try again in a few minutes.' };
  }
  const emailLimit = await hitRateLimit(`login:email:${email}`, 5, 900).catch(() => null);
  if (emailLimit && !emailLimit.allowed) {
    return { status: 'error', error: 'Too many attempts. Try again in a few minutes.' };
  }

  try {
    const result = await requestEmailLogin(email, { nextPath: nextPath || undefined });
    if (!result.configured) {
      return { status: 'error', error: 'Email sign-in is not configured yet.' };
    }
    // Same answer whether or not the address has a shop.
    return { status: 'sent' };
  } catch (error) {
    console.error('[login] email link failed', error);
    return { status: 'error', error: 'Could not send the link. Try again in a minute.' };
  }
}
