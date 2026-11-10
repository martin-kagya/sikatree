'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { saveAvailability } from '@/lib/availability';
import { WEEKDAY_NAMES, isDateOnly, timeToMinute } from '@/lib/availability-shared';
import { moveItem, saveCategories } from '@/lib/catalogue';
import { query } from '@/lib/db';
import { updateLowStockThreshold } from '@/lib/inventory';
import { parsePesewas } from '@/lib/money';
import {
  ORDER_STATUSES,
  setOrderDeliveryFee,
  updateDeliverySettings,
  updateEtaSettings,
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
  const reason = String(formData.get('reason') ?? '').trim() || null;

  if (!id || !ORDER_STATUSES.includes(status)) return;

  await updateOrderStatus(id, vendorId, status, reason);
  revalidatePath('/dashboard');
}

export type OrderStatusState = { ok?: boolean; message?: string; error?: string };

// State-returning variant for client forms: the toast needs the outcome.
export async function updateOrderStatusState(
  _previous: OrderStatusState,
  formData: FormData,
): Promise<OrderStatusState> {
  const vendorId = await requireVendor();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as OrderStatus;
  const reason = String(formData.get('reason') ?? '').trim() || null;

  if (!id || !ORDER_STATUSES.includes(status)) {
    return { error: 'That order update is not valid.' };
  }

  try {
    const result = await updateOrderStatus(id, vendorId, status, reason);
    if (!result.ok) return { error: result.error };
    const message =
      status === 'cancelled'
        ? 'Order cancelled.'
        : status === 'confirmed'
          ? 'Order confirmed.'
          : status === 'ready'
            ? 'Order marked ready.'
            : 'Order completed.';
    return { ok: true, message };
  } catch (error) {
    console.error('[orders] status update failed', error);
    return { error: 'That update did not save. Try again.' };
  }
}

export type OrderFeeState = { ok?: boolean; message?: string; error?: string };

export async function setOrderDeliveryFeeState(
  _previous: OrderFeeState,
  formData: FormData,
): Promise<OrderFeeState> {
  const vendorId = await requireVendor();
  const id = String(formData.get('id') ?? '');
  const feeRaw = String(formData.get('fee') ?? '').trim();
  if (!id || feeRaw === '') return { error: 'Enter the delivery fee.' };

  const fee = parsePesewas(feeRaw);
  if (fee === null) return { error: 'Enter a valid delivery fee.' };

  try {
    const result = await setOrderDeliveryFee(id, vendorId, fee);
    if (!result.ok) return { error: result.error };
    return { ok: true, message: 'Delivery fee set.' };
  } catch (error) {
    console.error('[orders] delivery fee failed', error);
    return { error: 'That fee did not save. Try again.' };
  }
}

export async function moveItemAction(formData: FormData): Promise<void> {
  const vendorId = await requireVendor();
  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? '') as 'up' | 'down';

  if (!id || (direction !== 'up' && direction !== 'down')) return;

  await moveItem(vendorId, id, direction);
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

  let withinPesewas = 0;
  let outsidePesewas = 0;
  if (mode === 'fixed') {
    const withinRaw = String(formData.get('within') ?? '').trim();
    const outsideRaw = String(formData.get('outside') ?? '').trim();
    if (withinRaw === '' || outsideRaw === '') return { error: 'Enter both delivery fees.' };
    const within = parsePesewas(withinRaw);
    const outside = parsePesewas(outsideRaw);
    if (within === null || outside === null) return { error: 'Enter valid delivery fees.' };
    withinPesewas = within;
    outsidePesewas = outside;
  }

  const result = await updateDeliverySettings(vendorId, mode, withinPesewas, outsidePesewas);
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

export type EtaSettingsState = { error?: string; saved?: boolean };

export async function updateEtaSettingsAction(
  _previous: EtaSettingsState,
  formData: FormData,
): Promise<EtaSettingsState> {
  const vendorId = await requireVendor();
  const withinText = String(formData.get('etaWithin') ?? '');
  const outsideText = String(formData.get('etaOutside') ?? '');
  const pickupText = String(formData.get('etaPickup') ?? '');

  const result = await updateEtaSettings(vendorId, withinText, outsideText, pickupText);
  if (!result.ok) return { error: result.error };

  return { saved: true };
}

export type LowStockState = { error?: string; saved?: boolean };

export async function updateLowStockThresholdAction(
  _previous: LowStockState,
  formData: FormData,
): Promise<LowStockState> {
  const vendorId = await requireVendor();
  const raw = String(formData.get('threshold') ?? '').trim();
  const threshold = raw === '' ? null : Number(raw);
  if (threshold !== null && !Number.isInteger(threshold)) {
    return { error: 'Enter a whole number, or leave blank to turn alerts off.' };
  }

  const result = await updateLowStockThreshold(vendorId, threshold);
  if (!result.ok) return { error: result.error };

  return { saved: true };
}

export type CategoriesState = { error?: string; saved?: boolean };

export async function saveCategoriesAction(
  _previous: CategoriesState,
  formData: FormData,
): Promise<CategoriesState> {
  const vendorId = await requireVendor();
  const raw = String(formData.get('categories') ?? '');
  const names = raw.split('\n');

  const result = await saveCategories(vendorId, names);
  if (!result.ok) return { error: result.error };

  revalidatePath('/dashboard/settings');
  const rows = await query<{ handle: string }>('select handle from vendors where id = $1', [
    vendorId,
  ]);
  if (rows[0]) revalidatePath(`/${rows[0].handle}`);
  return { saved: true };
}

export type AvailabilitySettingsState = { error?: string; saved?: boolean };

export async function saveAvailabilityAction(
  _previous: AvailabilitySettingsState,
  formData: FormData,
): Promise<AvailabilitySettingsState> {
  const vendorId = await requireVendor();

  const windows: { weekday: number; startMinute: number; endMinute: number }[] = [];
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    if (formData.get(`enabled-${weekday}`) !== 'on') continue;
    const start = timeToMinute(String(formData.get(`start-${weekday}`) ?? ''));
    const end = timeToMinute(String(formData.get(`end-${weekday}`) ?? ''));
    if (start === null || end === null) {
      return { error: `Add both start and end times for ${WEEKDAY_NAMES[weekday]}.` };
    }
    if (end <= start) {
      return { error: `${WEEKDAY_NAMES[weekday]}: end time must be after the start time.` };
    }
    windows.push({ weekday, startMinute: start, endMinute: end });
  }

  const blockedDates = formData
    .getAll('blockedDate')
    .map((value) => String(value))
    .filter((value) => isDateOnly(value));

  const slotMinutes = Number(String(formData.get('slotMinutes') ?? '60'));
  if (!Number.isInteger(slotMinutes)) return { error: 'Pick a valid slot length.' };

  const capRaw = String(formData.get('weeklyCap') ?? '').trim();
  const weeklyCap = capRaw === '' ? null : Number(capRaw);
  if (weeklyCap !== null && !Number.isInteger(weeklyCap)) {
    return { error: 'Enter a whole number for the weekly cap, or leave it off.' };
  }

  const result = await saveAvailability(vendorId, { windows, blockedDates, slotMinutes, weeklyCap });
  if (!result.ok) return { error: result.error };

  revalidatePath('/dashboard/settings');
  const rows = await query<{ handle: string }>('select handle from vendors where id = $1', [
    vendorId,
  ]);
  if (rows[0]) revalidatePath(`/${rows[0].handle}`);
  return { saved: true };
}
