'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ORDER_STATUSES, updateOrderStatus, type OrderStatus } from '@/lib/orders';
import { VENDOR_COOKIE, requireVendor } from '@/lib/vendor-auth';

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(VENDOR_COOKIE);
  redirect('/');
}

export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  const vendorId = await requireVendor();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as OrderStatus;

  if (!id || !ORDER_STATUSES.includes(status)) return;

  await updateOrderStatus(id, vendorId, status);
  revalidatePath('/dashboard');
}
