import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminEnabled, isAdmin } from '@/lib/admin-auth';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Admin | sikatree',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin');

  const enabled = adminEnabled();

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-[400px] rounded-panel bg-white p-8 shadow-card">
        <p className="text-[22px] font-semibold tracking-[-0.03em] text-ink">sikatree</p>
        <h1 className="mt-4 text-h2 text-ink">Waitlist admin</h1>
        <p className="mt-1 text-small text-ink-muted">Staff only.</p>

        <div className="mt-6">
          {enabled ? (
            <LoginForm />
          ) : (
            <p className="text-small text-danger">
              Admin is disabled. Set <code className="font-mono">ADMIN_PASSWORD</code> in the
              environment, then restart the server.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
