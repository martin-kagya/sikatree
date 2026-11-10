import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVendorItem, getVendorType, listCategories } from '@/lib/catalogue';
import { requireVendor } from '@/lib/vendor-auth';
import { ItemForm } from '../item-form';

export const metadata: Metadata = {
  title: 'Edit item | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendorId = await requireVendor(`/dashboard/items/${id}`);
  const [item, categories, vendorType] = await Promise.all([
    getVendorItem(vendorId, id),
    listCategories(vendorId),
    getVendorType(vendorId),
  ]);
  if (!item) notFound();

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[900px]">
        <Link href="/dashboard" className="text-[13px] text-ink-muted hover:text-ink">
          Back to dashboard
        </Link>
        <h1 className="mt-1 text-h1 text-ink">Edit item</h1>
        <p className="mt-1 text-small text-ink-muted">
          Changes appear on your page as soon as you save.
        </p>
        <ItemForm item={item} categories={categories} vendorType={vendorType} />
      </div>
    </div>
  );
}
