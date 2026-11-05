'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { parsePesewas } from '@/lib/money';
import {
  ORDER_STATUSES,
  setOrderDeliveryFee,
  updateDeliverySettings,
  updateOrderStatus,
  type OrderStatus,
} from '@/lib/orders';
import { DELIVERY_FEE_MODES, type DeliveryFeeMode } from '@/lib/shop';
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

export type DeliverySettingsState = { error?: string; saved?: boolean };

export async function updateDeliverySettingsAction(
  _previous: DeliverySettingsState,
  formData: FormData,
): Promise<DeliverySettingsState> {
  const vendorId = await requireVendor();
  const mode = String(formData.get('mode') ?? '') as DeliveryFeeMode;
  if (!DELIVERY_FEE_MODES.includes(mode)) return { error: 'Choose a delivery fee mode.' };

  let fixedPesewas = 0;
  if (mode === 'fixed') {
    const feeRaw = String(formData.get('fee') ?? '').trim();
    if (feeRaw === '') return { error: 'Enter a fixed delivery fee.' };
    const parsed = parsePesewas(feeRaw);
    if (parsed === null || parsed < 0 || parsed > 10_000_000) {
      return { error: 'Enter a delivery fee between GH₵0 and GH₵100,000.' };
    }
    fixedPesewas = parsed;
  }

  const result = await updateDeliverySettings(vendorId, mode, fixedPesewas);
  if (!result.ok) return { error: result.error };

  revalidatePath('/dashboard');
  const rows = await query<{ handle: string }>('select handle from vendors where id = $1', [
    vendorId,
  ]);
  if (rows[0]) revalidatePath(`/${rows[0].handle}`);
  return { saved: true };
}

export async function setOrderDeliveryFeeAction(formData: FormData): Promise<void> {
  const vendorId = await requireVendor();
  const id = String(formData.get('id') ?? '');
  const feeRaw = String(formData.get('fee') ?? '').trim();
  if (!id || feeRaw === '') return;

  const fee = parsePesewas(feeRaw);
  if (fee === null) return;

  await setOrderDeliveryFee(id, vendorId, fee);
  revalidatePath('/dashboard');
}
