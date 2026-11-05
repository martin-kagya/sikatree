import { randomUUID } from 'node:crypto';

// WhatsApp media -> Supabase Storage (ONB-10, CAT-04).
//
// Cloud mode: resolve the media id through the Graph API, download the bytes,
// upload them to the public `items` bucket, return the public URL.
// Dev mode: the simulator sends a media id that is already an http URL, so the
// same path works without a Meta account.

const MAX_BYTES = 10 * 1024 * 1024; // the bucket limit
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

type StorageConfig = { url: string; key: string; bucket: string };

export function storageConfig(): StorageConfig | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(
    /\/$/,
    '',
  );
  const key = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'items';
  if (!url || !key) return null;
  return { url, key, bucket };
}

export function extensionFor(mime: string): string | null {
  return ALLOWED_MIME[mime.split(';')[0].trim().toLowerCase()] ?? null;
}

export function publicObjectUrl(config: StorageConfig, path: string): string {
  return `${config.url}/storage/v1/object/public/${config.bucket}/${path}`;
}

async function resolveSource(
  mediaId: string,
): Promise<{ url: string; auth?: string } | null> {
  if (/^https?:\/\//i.test(mediaId)) {
    return { url: mediaId };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_API_VERSION ?? 'v21.0';
  if (!token) return null;

  const response = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(mediaId)}`,
    {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    console.error('[media] lookup failed', response.status);
    return null;
  }

  const data = (await response.json()) as { url?: string };
  return data.url ? { url: data.url, auth: token } : null;
}

export async function saveItemImage(input: {
  mediaId: string;
  vendorId: string;
}): Promise<string | null> {
  const config = storageConfig();
  if (!config) return null;

  try {
    const source = await resolveSource(input.mediaId);
    if (!source) return null;

    const response = await fetch(source.url, {
      headers: source.auth ? { authorization: `Bearer ${source.auth}` } : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.error('[media] download failed', response.status);
      return null;
    }

    const mime = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const extension = extensionFor(mime);
    if (!extension) {
      console.error('[media] unsupported type', mime);
      return null;
    }

    return uploadItemImage({
      vendorId: input.vendorId,
      bytes: Buffer.from(await response.arrayBuffer()),
      mime,
    });
  } catch (error) {
    console.error('[media] save failed', error);
    return null;
  }
}

// Shared byte upload for files coming from the dashboard as well as WhatsApp.
export async function uploadItemImage(input: {
  vendorId: string;
  bytes: Buffer;
  mime: string;
}): Promise<string | null> {
  const config = storageConfig();
  if (!config) return null;

  const mime = input.mime.split(';')[0].trim().toLowerCase();
  const extension = extensionFor(mime);
  if (!extension) {
    console.error('[media] unsupported type', mime);
    return null;
  }
  if (!input.bytes.length || input.bytes.length > MAX_BYTES) {
    console.error('[media] rejected size', input.bytes.length);
    return null;
  }

  try {
    const path = `${input.vendorId}/${randomUUID()}.${extension}`;
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
      console.error('[media] upload failed', upload.status, detail.slice(0, 200));
      return null;
    }

    return publicObjectUrl(config, path);
  } catch (error) {
    console.error('[media] upload failed', error);
    return null;
  }
}
