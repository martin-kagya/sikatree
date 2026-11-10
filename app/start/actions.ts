'use server';

import { headers } from 'next/headers';
import { clientIp } from '@/lib/admin-auth';
import { hitRateLimit } from '@/lib/rate-limit';
import { createVendorFromWeb } from '@/lib/vendor-signup';

export type StartState =
  | { status: 'idle' }
  | { status: 'ok'; handle: string; email: string; emailSent: boolean }
  | { status: 'error'; error: string };

export async function startVendorAction(
  _prev: StartState,
  formData: FormData,
): Promise<StartState> {
  const ip = clientIp(await headers());
  const limit = await hitRateLimit(`signup:ip:${ip}`, 10, 3600).catch(() => null);
  if (limit && !limit.allowed) {
    return { status: 'error', error: 'Too many attempts. Try again in a little while.' };
  }

  try {
    const result = await createVendorFromWeb({
      name: String(formData.get('name') ?? ''),
      type: String(formData.get('type') ?? ''),
      handle: String(formData.get('handle') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      email: String(formData.get('email') ?? ''),
      consent: formData.get('consent') === 'on',
    });
    if (!result.ok) return { status: 'error', error: result.error };

    return {
      status: 'ok',
      handle: result.handle,
      email: String(formData.get('email') ?? '').trim().toLowerCase(),
      emailSent: result.emailSent,
    };
  } catch (error) {
    console.error('[signup] failed', error);
    return { status: 'error', error: 'Something went wrong. Try again in a minute.' };
  }
}
