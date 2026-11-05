import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from '@/components/icons';
import { query } from '@/lib/db';
import type { DeliveryFeeMode } from '@/lib/shop';
import { requireVendor } from '@/lib/vendor-auth';
import { logoutAction } from '../actions';
import { DeliverySettings } from '../delivery-settings';
import { EtaSettings } from '../eta-settings';

export const metadata: Metadata = {
  title: 'Settings | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type VendorSettings = {
  name: string;
  delivery_fee_mode: string;
  delivery_fee_pesewas: number;
  delivery_fee_outside_pesewas: number;
  eta_delivery_within_text: string;
  eta_delivery_outside_text: string;
  eta_pickup_text: string;
};

export default async function SettingsPage() {
  const vendorId = await requireVendor();
  const vendors = await query<VendorSettings>(
    `select name, delivery_fee_mode, delivery_fee_pesewas, delivery_fee_outside_pesewas,
            eta_delivery_within_text, eta_delivery_outside_text, eta_pickup_text
       from vendors where id = $1`,
    [vendorId],
  );
  const vendor = vendors[0];
  if (!vendor) notFound();

  const deliveryFeeMode = vendor.delivery_fee_mode as DeliveryFeeMode;

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[720px]">
        <header className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-1 rounded-pill border border-hairline bg-white px-3 text-small text-ink hover:border-ink/40"
          >
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-pill border border-hairline bg-white px-4 text-small text-ink hover:border-ink/40"
            >
              Sign out
            </button>
          </form>
        </header>

        <main className="mt-6 space-y-5 stagger">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-ink-muted">Settings</p>
            <h1 className="mt-1 text-h1 text-ink">{vendor.name}</h1>
          </div>

          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-h2 text-ink">Delivery fee</h2>
            <p className="mt-1 text-small text-ink-muted">
              How customers are charged for delivery. Pickup is always free.
            </p>
            <DeliverySettings
              mode={deliveryFeeMode}
              fixedPesewas={vendor.delivery_fee_pesewas}
              outsidePesewas={vendor.delivery_fee_outside_pesewas}
            />
          </section>

          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-h2 text-ink">Delivery time</h2>
            <p className="mt-1 text-small text-ink-muted">
              What the customer sees about when their order will arrive, for their delivery zone.
            </p>
            <EtaSettings
              withinText={vendor.eta_delivery_within_text}
              outsideText={vendor.eta_delivery_outside_text}
              pickupText={vendor.eta_pickup_text}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
