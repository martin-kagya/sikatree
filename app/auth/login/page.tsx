import type { Metadata } from 'next';
import Link from 'next/link';
import { authEnabled } from '@/lib/vendor-auth';

export const metadata: Metadata = {
  title: 'Sign in | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; disabled?: string }>;
}) {
  const params = await searchParams;
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
