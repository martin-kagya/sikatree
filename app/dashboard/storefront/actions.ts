'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  getStorefrontSettings,
  saveStorefrontSettings,
  saveVendorLinks,
  validateStorefrontInput,
  type CardImageRatio,
  type StorefrontInput,
  type VendorLinkInput,
} from '@/lib/storefront';
import { uploadVendorImage } from '@/lib/vendor-assets';
import { requireVendor } from '@/lib/vendor-auth';

export type StorefrontFormState = { error?: string; ok?: true };
export type LinksFormState = { error?: string };

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim();
}

async function uploadedUrl(
  formData: FormData,
  field: 'logo' | 'cover',
  vendorId: string,
): Promise<{ url?: string; remove?: boolean; error?: string }> {
  const file = formData.get(field);
  if (file instanceof File && file.size > 0) {
    const result = await uploadVendorImage({
      vendorId,
      kind: field,
      bytes: Buffer.from(await file.arrayBuffer()),
      mime: file.type,
    });
    return result.ok ? { url: result.url } : { error: result.error };
  }
  return { remove: formData.get(`remove${field === 'logo' ? 'Logo' : 'Cover'}`) === 'on' };
}

export async function saveStorefrontAction(
  _previous: StorefrontFormState,
  formData: FormData,
): Promise<StorefrontFormState> {
  const vendorId = await requireVendor('/dashboard/storefront');

  try {
    const existing = await getStorefrontSettings(vendorId);
    if (!existing) return { error: 'Shop not found.' };

    const draft: StorefrontInput = {
      name: text(formData, 'name'),
      tagline: text(formData, 'tagline'),
      bio: text(formData, 'bio'),
      location: text(formData, 'location'),
      category: text(formData, 'category'),
      accent: text(formData, 'accent'),
      cardImageRatio: text(formData, 'cardImageRatio') as CardImageRatio,
      logoUrl: existing.logoUrl,
      logoAlt: text(formData, 'logoAlt'),
      coverUrl: existing.coverUrl,
    };
    // Validate before uploading so a bad tagline or accent cannot leave an
    // orphaned brand image in storage.
    const preflight = validateStorefrontInput(draft);
    if (!preflight.ok) return { error: preflight.error };

    const logo = await uploadedUrl(formData, 'logo', vendorId);
    if (logo.error) return { error: logo.error };
    const cover = await uploadedUrl(formData, 'cover', vendorId);
    if (cover.error) return { error: cover.error };

    const input: StorefrontInput = {
      ...draft,
      logoUrl: logo.url ?? (logo.remove ? null : existing.logoUrl),
      coverUrl: cover.url ?? (cover.remove ? null : existing.coverUrl),
    };

    const saved = await saveStorefrontSettings(vendorId, input);
    if (!saved.ok) return { error: saved.error };

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/storefront');
    revalidatePath(`/${existing.handle}`);
  } catch (error) {
    console.error('[storefront] save failed', error instanceof Error ? error.message : error);
    return { error: 'Could not save your shop. Try again.' };
  }

  redirect('/dashboard/storefront?saved=1');
}


export async function saveLinksAction(
  _previous: LinksFormState,
  formData: FormData,
): Promise<LinksFormState> {
  const vendorId = await requireVendor('/dashboard/storefront');
  const existing = await getStorefrontSettings(vendorId);
  if (!existing) return { error: 'Shop not found.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get('links') ?? '[]'));
  } catch {
    return { error: 'Could not read the links. Remove the last change and try again.' };
  }
  if (!Array.isArray(parsed)) return { error: 'Could not read the links.' };

  const inputs: VendorLinkInput[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') return { error: 'One of the links is not valid.' };
    const row = entry as Record<string, unknown>;
    inputs.push({
      kind: String(row.kind ?? '') as VendorLinkInput['kind'],
      label: String(row.label ?? ''),
      raw: String(row.raw ?? ''),
      visible: row.visible !== false,
    });
  }

  try {
    const saved = await saveVendorLinks(vendorId, inputs);
    if (!saved.ok) return { error: saved.error };
    revalidatePath('/dashboard/storefront');
    revalidatePath(`/${existing.handle}`);
  } catch (error) {
    console.error('[storefront] link save failed', error instanceof Error ? error.message : error);
    return { error: 'Could not save the links. Try again.' };
  }

  redirect('/dashboard/storefront?saved=links');
}
