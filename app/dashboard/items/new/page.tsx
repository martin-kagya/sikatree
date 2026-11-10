import type { Metadata } from 'next';
import Link from 'next/link';
import { getVendorType, listCategories } from '@/lib/catalogue';
import { requireVendor } from '@/lib/vendor-auth';
import { ItemForm } from '../item-form';

export const metadata: Metadata = {
  title: 'Add item | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function NewItemPage() {
  const vendorId = await requireVendor('/dashboard/items/new');
  const [categories, vendorType] = await Promise.all([
    listCategories(vendorId),
    getVendorType(vendorId),
  ]);

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[900px]">
        <Link href="/dashboard" className="text-[13px] text-ink-muted hover:text-ink">
          Back to dashboard
        </Link>
        <h1 className="mt-1 text-h1 text-ink">Add item</h1>
        <p className="mt-1 text-small text-ink-muted">
          Add a photo, a clear name and the price. You can hide it or mark it{' '}
          {vendorType === 'services' ? 'unavailable' : 'sold out'} at any time.
        </p>
        <ItemForm item={null} categories={categories} vendorType={vendorType} />
      </div>
    </div>
  );
}
