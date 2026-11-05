import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { redeemLoginToken } from '@/lib/login-links';
import { authEnabled, createSessionToken, VENDOR_COOKIE } from '@/lib/vendor-auth';

export const metadata: Metadata = {
  title: 'Sign in | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// One route for both jobs: with a token it exchanges and redirects, without it
// it renders the fallback message. The exchange is single-use.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; disabled?: string }>;
}) {
  const params = await searchParams;

  if (params.token) {
    const result = await redeemLoginToken(params.token).catch(
      () => ({ ok: false as const, reason: 'invalid' as const }),
    );

    if (result.ok) {
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

    redirect('/auth/login?error=1');
  }

  const disabled = !authEnabled();

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-[400px] rounded-panel bg-white p-8 shadow-card">
        <p className="text-[22px] font-semibold tracking-[-0.03em] text-ink">sikatree</p>
        <h1 className="mt-4 text-h2 text-ink">Vendor sign in</h1>

        {disabled ? (
          <p className="mt-4 text-small text-danger">
            Sign in is disabled. Set <code className="font-mono">AUTH_SECRET</code> and restart the
            server.
          </p>
        ) : params.error ? (
          <p className="mt-4 text-small text-danger">
            That link is invalid, already used, or has expired. Reply to the bot with{' '}
            <strong>dashboard</strong> for a fresh one.
          </p>
        ) : (
          <p className="mt-4 text-small text-ink-muted">
            Open the link the bot sent you. This page only handles the link after you tap it.
          </p>
        )}

        <p className="mt-6 text-small text-ink-muted">
          <Link href="/" className="text-green-deep underline underline-offset-2">
            Back to the site
          </Link>
        </p>
      </div>
    </div>
  );
}
