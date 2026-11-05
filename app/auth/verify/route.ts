import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { redeemLoginToken } from '@/lib/login-links';
import { createSessionToken, VENDOR_COOKIE } from '@/lib/vendor-auth';

export const dynamic = 'force-dynamic';

// The magic link lands here. A route handler (not a page) is required because
// only route handlers and server actions may set cookies.
export async function GET(request: Request): Promise<never> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const result = await redeemLoginToken(token).catch(
    () => ({ ok: false as const, reason: 'invalid' as const }),
  );

  if (!result.ok) {
    redirect('/auth/login?error=1');
  }

  const store = await cookies();
  store.set(VENDOR_COOKIE, createSessionToken(result.vendorId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  redirect('/dashboard');
}
