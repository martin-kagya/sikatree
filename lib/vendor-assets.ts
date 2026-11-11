import { randomUUID } from 'node:crypto';
import { extensionFor, publicObjectUrl, storageConfig } from '@/lib/whatsapp/media';

// Vendor brand images reuse the public item bucket under /brand. The editor
// resizes before upload where the browser can; the server still enforces the
// type and byte limit so a bad client cannot bypass it.

export type VendorImageKind = 'logo' | 'cover';

const LIMITS: Record<VendorImageKind, number> = {
  logo: 2 * 1024 * 1024,
  cover: 5 * 1024 * 1024,
};

export type VendorImageResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadVendorImage(input: {
  vendorId: string;
  kind: VendorImageKind;
  bytes: Buffer;
  mime: string;
}): Promise<VendorImageResult> {
  const config = storageConfig();
  if (!config) return { ok: false, error: 'Image storage is not configured yet.' };

  const mime = input.mime.split(';')[0].trim().toLowerCase();
  const extension = extensionFor(mime);
  if (!extension) return { ok: false, error: 'Use a JPG, PNG, WebP or AVIF image.' };
  if (!input.bytes.length || input.bytes.length > LIMITS[input.kind]) {
    const limit = input.kind === 'logo' ? '2MB' : '5MB';
    return { ok: false, error: `That image is too large. Use one under ${limit}.` };
  }

  const path = `${input.vendorId}/brand/${input.kind}-${randomUUID()}.${extension}`;
  try {
    const upload = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.key}`,
        apikey: config.key,
        'content-type': mime,
        'cache-control': '31536000',
        'x-upsert': 'true',
      },
      body: new Uint8Array(input.bytes),
      signal: AbortSignal.timeout(30_000),
    });

    if (!upload.ok) {
      const detail = await upload.text().catch(() => '');
      console.error('[vendor-assets] upload failed', upload.status, detail.slice(0, 200));
      return { ok: false, error: 'Could not upload the image. Try again.' };
    }

    return { ok: true, url: publicObjectUrl(config, path) };
  } catch (error) {
    console.error('[vendor-assets] upload failed', error);
    return { ok: false, error: 'Could not upload the image. Try again.' };
  }
}
