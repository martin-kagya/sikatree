'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createItem,
  getVendorItem,
  itemError,
  ITEM_STATUSES,
  setItemStatus,
  updateItem,
  type ItemBadge,
  type ItemInput,
  type ItemStatus,
} from '@/lib/catalogue';
import { query } from '@/lib/db';
import { recordStockMovement } from '@/lib/inventory';
import { parsePesewas } from '@/lib/money';
import { requireVendor } from '@/lib/vendor-auth';
import { extensionFor, uploadItemImage } from '@/lib/whatsapp/media';

export type ItemFormState = { error?: string };

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim();
}

async function revalidateStore(vendorId: string): Promise<void> {
  const rows = await query<{ handle: string }>('select handle from vendors where id = $1', [
    vendorId,
  ]);
  revalidatePath('/dashboard');
  if (rows[0]) revalidatePath(`/${rows[0].handle}`);
}

export async function saveItemAction(
  _previous: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const vendorId = await requireVendor();
  const id = text(formData, 'id');
  const existing = id ? await getVendorItem(vendorId, id) : null;
  if (id && !existing) return { error: 'Item not found.' };

  let imageUrl = existing?.imageUrl ?? null;
  const file = formData.get('image');
  if (file instanceof File && file.size > 0) {
    const mime = file.type.split(';')[0].trim().toLowerCase();
    if (!extensionFor(mime)) {
      return { error: 'Use a JPG, PNG, WebP or AVIF image.' };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { error: 'Images must be 10MB or smaller.' };
    }
    const uploaded = await uploadItemImage({
      vendorId,
      bytes: Buffer.from(await file.arrayBuffer()),
      mime,
    });
    if (!uploaded) {
      return { error: 'Could not upload the image. Check storage settings and try again.' };
    }
    imageUrl = uploaded;
  } else if (formData.get('removeImage') === 'on') {
    imageUrl = null;
  }

  const priceRaw = text(formData, 'price');
  const pricePesewas = parsePesewas(priceRaw);
  if (pricePesewas === null || priceRaw === '') {
    return { error: 'Enter a valid price.' };
  }

  const compareRaw = text(formData, 'compareAt');
  const compareAtPesewas = compareRaw ? parsePesewas(compareRaw) : null;
  if (compareRaw && compareAtPesewas === null) {
    return { error: 'Enter a valid compare-at price.' };
  }

  const stockRaw = text(formData, 'stock');
  const stock = stockRaw === '' ? null : Number(stockRaw);
  if (stock !== null && !Number.isInteger(stock)) {
    return { error: 'Stock must be a whole number, or blank for unlimited.' };
  }

  const positionRaw = text(formData, 'position');
  const position = positionRaw === '' ? null : Number(positionRaw);
  if (position !== null && !Number.isInteger(position)) {
    return { error: 'Position must be a whole number.' };
  }

  const status = (text(formData, 'status') || 'active') as ItemStatus;
  if (!ITEM_STATUSES.includes(status)) return { error: 'Choose a valid visibility.' };

  const badgeRaw = text(formData, 'badge');
  const badge = (badgeRaw || null) as ItemBadge;

  const input: ItemInput = {
    name: text(formData, 'name'),
    description: text(formData, 'description') || null,
    pricePesewas,
    compareAtPesewas,
    category: text(formData, 'category') || null,
    stock,
    status,
    imageUrl,
    imageUrlAlt: existing?.imageUrlAlt ?? null,
    badge,
    position,
  };

  const problem = itemError(input);
  if (problem) return { error: problem };

  const result = id
    ? await updateItem(vendorId, id, input)
    : await createItem(vendorId, input);
  if (!result.ok) return { error: result.error };

  // Manual stock adjustments are recorded with a reason (INV-05).
  if (id && existing && existing.stock !== input.stock) {
    const delta = (input.stock ?? 0) - (existing.stock ?? 0);
    await recordStockMovement(id, delta, 'manual', text(formData, 'stockReason') || null);
  }

  await revalidateStore(vendorId);
  redirect('/dashboard?item=saved');
}

export async function setItemStatusAction(formData: FormData): Promise<void> {
  const vendorId = await requireVendor();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as ItemStatus;
  if (!id || !ITEM_STATUSES.includes(status)) return;

  await setItemStatus(vendorId, id, status);
  await revalidateStore(vendorId);
}
