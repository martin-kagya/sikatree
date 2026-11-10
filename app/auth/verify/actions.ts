'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { redeemLoginToken } from '@/lib/login-links';
import { safeNext } from '@/lib/safe-next';
import { authEnabled, setVendorSessionCookie } from '@/lib/vendor-auth';

// The magic link is redeemed only here, on an explicit POST from the
// confirmation page. A GET never changes auth state, so an email preview or
// scanner cannot consume the token before the vendor taps Continue.
export async function verifyLinkAction(formData: FormData): Promise<void> {
  if (!authEnabled()) redirect('/auth/login?disabled=1');

  // Login-CSRF defence in depth. The real control is the shop name and masked
  // account shown on the confirmation page (AUTH.md section 8); this header check
  // only turns away an obvious cross-site submit. Next.js already enforces an
  // Origin check on server actions, so a forged cross-site POST never reaches
  // here. 'none' is allowed on purpose: a top-level navigation (and some mobile
  // in-app browsers) send no Sec-Fetch-Site, and those are legitimate.
  const site = (await headers()).get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'same-site' && site !== 'none') {
    redirect('/auth/login?error=1');
  }

  const token = String(formData.get('token') ?? '');
  // Checkbox checked by default; absent means the vendor unticked it on a
  // shared device, so the cookie should die when the browser closes.
  const persist = formData.get('persist') !== null;

  const result = await redeemLoginToken(token).catch((error) => {
    // A thrown error here is a database fault, not a bad token. Log it so an
    // outage is distinguishable from the "link expired" screen the vendor sees.
    console.error('[verify] redeem failed', error);
    return { ok: false as const, reason: 'invalid' as const };
  });
  if (!result.ok) redirect('/auth/login?error=1');

  await setVendorSessionCookie(result.vendorId, { persist });

  redirect(safeNext(result.nextPath));
}
