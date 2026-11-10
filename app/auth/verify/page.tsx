import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { peekLoginToken } from '@/lib/login-links';
import { authEnabled, currentVendorId } from '@/lib/vendor-auth';
import { verifyLinkAction } from '@/app/auth/verify/actions';

export const metadata: Metadata = {
  title: 'Sign in | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// The magic link lands here. This is a page, not a redeem-on-GET route: it only
// reads the token (peekLoginToken) and asks the vendor to confirm. Redemption
// happens in verifyLinkAction on POST.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if (!authEnabled()) redirect('/auth/login?disabled=1');

  // Opening the link twice, or while already signed in, is not an error.
  if (await currentVendorId()) redirect('/dashboard');

  const token = (await searchParams).token ?? '';
  const peek = await peekLoginToken(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-[400px] rounded-panel bg-white p-8 shadow-card">
        <p className="text-[22px] font-semibold tracking-[-0.03em] text-ink">sikatree</p>

        {peek.ok ? (
          <>
            <h1 className="mt-4 text-h2 text-ink">Sign in to sikatree</h1>
            <p className="mt-2 text-small text-ink-muted">
              Continue to <strong className="text-ink">{peek.vendorName}</strong>
              <br />
              <span className="font-mono">{peek.maskedIdentifier}</span>
            </p>

            <form action={verifyLinkAction} className="mt-6 space-y-4">
              <input type="hidden" name="token" value={token} />

              <label className="flex items-start gap-2 text-small text-ink-muted">
                <input
                  type="checkbox"
                  name="persist"
                  defaultChecked
                  className="mt-0.5 h-4 w-4 rounded border-hairline text-green-deep focus:ring-green-deep"
                />
                Keep me signed in on this device. Untick on a shared phone.
              </label>

              <button
                type="submit"
                className="h-12 w-full rounded-pill bg-green-main px-6 text-label text-ink"
              >
                Continue
              </button>
            </form>

            <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
              This link works once. If you did not ask to sign in, close this page.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-h2 text-ink">
              {peek.reason === 'used' ? 'This link has already been used' : 'This link has expired'}
            </h1>
            <p className="mt-2 text-small text-ink-muted">
              {peek.reason === 'used'
                ? 'Each sign-in link works once.'
                : 'This link is invalid or has expired.'}{' '}
              Request a new one, or reply to the bot with <strong>dashboard</strong>.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-pill bg-green-main px-6 text-label text-ink"
            >
              Email me a new link
            </Link>
          </>
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
