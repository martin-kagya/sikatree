'use server';

import { normalizeGhanaPhone } from '@/lib/phone';
import { checkHandle, normalizeHandle, suggestHandle } from '@/lib/handle';

export type WaitlistState = {
  ok: boolean;
  phone?: string;
  handle?: string;
  error?: string;
  message?: string;
};

export type DetailsState = {
  ok: boolean;
  message?: string;
  error?: string;
};

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const phoneRaw = String(formData.get('phone') ?? '');
  const handleRaw = String(formData.get('handle') ?? '');

  const phone = normalizeGhanaPhone(phoneRaw);
  if (!phone) {
    return {
      ok: false,
      error: 'That doesn’t look like a Ghana number. Try 024 123 4567.',
    };
  }

  const handle = normalizeHandle(handleRaw);
  if (handle) {
    const status = checkHandle(handle);
    if (status === 'too-short' || status === 'invalid') {
      return {
        ok: false,
        error: 'Your link can use letters, numbers and dashes (3 to 24 characters).',
      };
    }
    if (status === 'reserved') {
      return { ok: false, error: `/${handle} is taken. Try /${suggestHandle(handle)}.` };
    }
  }

  // TODO(Phase L): insert into Supabase `waitlist_signup` (insert-only, rate-limited,
  // duplicate-phone aware) and `reserved_handle`. This validated stub is the seam for it.
  console.log('[waitlist]', { phone, handle });

  return { ok: true, phone, handle, message: 'You’re in.' };
}

export async function saveShopDetails(
  _prev: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  const phone = String(formData.get('phone') ?? '');
  const handle = String(formData.get('handle') ?? '');
  const businessType = String(formData.get('businessType') ?? '');
  const businessName = String(formData.get('businessName') ?? '').trim();

  // TODO(Phase L): update the waitlist row with the optional shop details.
  console.log('[waitlist:details]', { phone, handle, businessType, businessName });

  return { ok: true, message: 'Thanks — that helps.' };
}
