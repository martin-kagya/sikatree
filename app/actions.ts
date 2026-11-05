'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { site } from '@/lib/brand';
import { clientIp } from '@/lib/admin-auth';
import { normalizeGhanaPhone } from '@/lib/phone';
import { checkHandle, normalizeHandle } from '@/lib/handle';
import { hitRateLimit } from '@/lib/rate-limit';
import {
  BUSINESS_TYPES,
  checkHandleAvailability,
  createSignup,
  findByPhone,
  reserveHandle,
  suggestAvailable,
  updateDetails,
  type BusinessType,
} from '@/lib/waitlist';

export type WaitlistState = {
  ok: boolean;
  error?: string;
  phone?: string;
  handle?: string | null;
  handleTaken?: boolean;
  handleSuggestion?: string;
  position?: number;
  referralCode?: string;
  referralUrl?: string;
  already?: boolean;
  message?: string;
};

export type DetailsState = {
  ok: boolean;
  message?: string;
  error?: string;
};

export type ClaimState = {
  ok: boolean;
  handle?: string;
  error?: string;
};

const GENERIC_ERROR = 'Something went wrong on our side. Try again in a minute.';
const RATE_ERROR = 'Too many attempts. Give it a few minutes and try again.';

function asBusinessType(raw: FormDataEntryValue | null): BusinessType | null {
  const value = String(raw ?? '');
  return (BUSINESS_TYPES as readonly string[]).includes(value) ? (value as BusinessType) : null;
}

function isBot(formData: FormData): boolean {
  // Honeypot: a real person cannot see or focus this field.
  if (String(formData.get('website') ?? '').length > 0) return true;

  // Time trap: a form filled in under half a second is a script. Missing value
  // means JavaScript is off, which is allowed (LP-18).
  const elapsed = Number(formData.get('elapsed'));
  if (Number.isFinite(elapsed) && elapsed > 0 && elapsed < 500) return true;

  return false;
}

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  if (isBot(formData)) {
    // Pretend it worked so scripts do not learn the rule.
    return { ok: true, message: 'You’re in.' };
  }

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);

  const phoneRaw = String(formData.get('phone') ?? '');
  const phone = normalizeGhanaPhone(phoneRaw);
  if (!phone) {
    return { ok: false, error: 'That doesn’t look like a Ghana number. Try 024 123 4567.' };
  }

  if (formData.get('consent') !== 'on') {
    return {
      ok: false,
      error: 'Tick the consent box so we can message you about your spot.',
    };
  }

  const businessType = asBusinessType(formData.get('businessType'));
  const businessNameRaw = String(formData.get('businessName') ?? '').trim().slice(0, 80);
  const handleRaw = String(formData.get('handle') ?? '');
  const handle = handleRaw ? normalizeHandle(handleRaw) : null;

  if (handle) {
    const status = checkHandle(handle);
    if (status === 'too-short' || status === 'invalid') {
      return {
        ok: false,
        error: 'Your link can use letters, numbers and dashes (3 to 24 characters).',
      };
    }
    if (status === 'reserved' || status === 'blocked') {
      return { ok: false, error: `/${handle} is reserved. Try another link.` };
    }
  }

  // Cheap, per-IP throttle first, then a tighter per-number one. Both fail open
  // if the counter table is unavailable; the unique phone index still protects
  // the data.
  let limited = false;
  try {
    const ipLimit = await hitRateLimit(`signup:ip:${ip}`, 6, 3600);
    const phoneLimit = await hitRateLimit(`signup:phone:${phone}`, 4, 3600);
    limited = !ipLimit.allowed || !phoneLimit.allowed;
  } catch (error) {
    console.error('[waitlist] rate limit check failed', error);
  }
  if (limited) return { ok: false, error: RATE_ERROR };

  if (handle) {
    const availability = await checkHandleAvailability(handle);
    if (!availability.available) {
      if (availability.reason === 'reserved' || availability.reason === 'blocked') {
        return { ok: false, error: `/${handle} is reserved. Try another link.` };
      }
      if (availability.reason === 'too-short' || availability.reason === 'invalid') {
        return { ok: false, error: 'Your link can use letters, numbers and dashes (3 to 24 characters).' };
      }
      const suggestion = (await suggestAvailable(handle)) ?? `${handle}gh`;
      return { ok: false, error: `/${handle} was taken. Try /${suggestion}.` };
    }
  }

  const referralCode = String(formData.get('ref') ?? '').trim() || null;

  try {
    const { entry, created, handleResult } = await createSignup({
      phone,
      businessType,
      businessName: businessNameRaw || null,
      handle,
      referralCode,
      source: String(formData.get('source') ?? 'landing').slice(0, 40) || 'landing',
      utm: {
        source: String(formData.get('utmSource') ?? '').slice(0, 80) || null,
        medium: String(formData.get('utmMedium') ?? '').slice(0, 80) || null,
        campaign: String(formData.get('utmCampaign') ?? '').slice(0, 80) || null,
      },
      consent: true,
    });

    const reserved = handleResult?.ok ? handleResult.handle : entry.handle;
    const handleTaken = handleResult !== undefined && !handleResult.ok;

    return {
      ok: true,
      phone: entry.phone,
      handle: reserved,
      handleTaken,
      handleSuggestion: handleTaken ? handleResult?.suggestion ?? undefined : undefined,
      position: entry.position,
      referralCode: entry.referralCode,
      referralUrl: `${site.url}/?ref=${entry.referralCode}`,
      already: !created,
      message: created ? 'You’re in.' : 'You’re already on the list.',
    };
  } catch (error) {
    console.error('[waitlist] signup failed', error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function saveShopDetails(
  _prev: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  const phone = normalizeGhanaPhone(String(formData.get('phone') ?? ''));
  if (!phone) return { ok: false, error: GENERIC_ERROR };

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const limit = await hitRateLimit(`details:ip:${ip}`, 20, 3600).catch(() => null);
  if (limit && !limit.allowed) return { ok: false, error: RATE_ERROR };

  const businessName = String(formData.get('businessName') ?? '').trim().slice(0, 80) || null;
  const businessType = asBusinessType(formData.get('businessType'));

  try {
    const updated = await updateDetails(phone, { businessType, businessName });
    if (!updated) return { ok: false, error: 'We could not find that signup. Join again above.' };
    return { ok: true, message: 'Thanks, that helps.' };
  } catch (error) {
    console.error('[waitlist] details update failed', error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

// After signup, a vendor without a handle (or who lost a race) can claim one
// without creating a second waitlist row.
export async function claimHandle(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const limit = await hitRateLimit(`claim:ip:${ip}`, 10, 3600).catch(() => null);
  if (limit && !limit.allowed) return { ok: false, error: RATE_ERROR };

  const phone = normalizeGhanaPhone(String(formData.get('phone') ?? ''));
  if (!phone) return { ok: false, error: GENERIC_ERROR };

  const handle = normalizeHandle(String(formData.get('handle') ?? ''));
  if (!handle) return { ok: false, error: 'Pick a link first.' };

  const status = checkHandle(handle);
  if (status === 'too-short' || status === 'invalid') {
    return {
      ok: false,
      error: 'Your link can use letters, numbers and dashes (3 to 24 characters).',
    };
  }
  if (status === 'reserved' || status === 'blocked') {
    return { ok: false, error: `/${handle} is reserved. Try another link.` };
  }

  try {
    const entry = await findByPhone(phone);
    if (!entry) return { ok: false, error: 'We could not find that signup.' };

    const availability = await checkHandleAvailability(handle);
    if (!availability.available) {
      const suggestion = (await suggestAvailable(handle)) ?? `${handle}gh`;
      return { ok: false, error: `/${handle} is taken. Try /${suggestion}.` };
    }

    const result = await reserveHandle(entry.id, handle);
    if (!result.ok) {
      const suggestion = result.suggestion ?? `${handle}gh`;
      return { ok: false, error: `/${handle} was just taken. Try /${suggestion}.` };
    }

    revalidatePath('/');
    return { ok: true, handle };
  } catch (error) {
    console.error('[waitlist] claim failed', error);
    return { ok: false, error: GENERIC_ERROR };
  }
}
