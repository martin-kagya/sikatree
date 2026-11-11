import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStorefrontSettings } from '@/lib/storefront';
import { requireVendor } from '@/lib/vendor-auth';
import { StorefrontEditor } from './storefront-editor';

export const metadata: Metadata = {
  title: 'Customize your shop | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function StorefrontSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const vendorId = await requireVendor('/dashboard/storefront');
  const settings = await getStorefrontSettings(vendorId);
  if (!settings) notFound();

  const params = await searchParams;

  return (
    <main className="mx-auto mt-6 max-w-[1120px] space-y-5 stagger">
      <Link href="/dashboard" className="text-[13px] text-ink-muted hover:text-ink">
        Back to dashboard
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] uppercase tracking-wide text-ink-muted">Storefront</p>
          <h1 className="mt-1 text-h1 text-ink">Customize your shop</h1>
          <p className="mt-1 text-small text-ink-muted">
            Make the page recognisably yours. Checkout and the catalogue stay the same.
          </p>
        </div>
        <Link
          href={`/${settings.handle}`}
          target="_blank"
          className="pressable inline-flex h-9 items-center rounded-pill border border-hairline bg-white px-4 text-[12px] text-ink hover:border-ink/40"
        >
          View live shop
        </Link>
      </div>

      <StorefrontEditor settings={settings} saved={params.saved === '1'} />
    </main>
  );
}
