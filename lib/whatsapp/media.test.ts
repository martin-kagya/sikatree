import { afterAll, describe, expect, it } from 'vitest';
import { extensionFor, publicObjectUrl, saveItemImage, storageConfig } from '@/lib/whatsapp/media';

const saved = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
};

afterAll(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('storage config', () => {
  it('is disabled without a URL or secret key', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    expect(storageConfig()).toBeNull();
  });

  it('reads the bucket name, defaulting to items', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co/';
    process.env.SUPABASE_SECRET_KEY = 'secret';
    delete process.env.SUPABASE_STORAGE_BUCKET;
    expect(storageConfig()).toEqual({
      url: 'https://example.supabase.co',
      key: 'secret',
      bucket: 'items',
    });
  });
});

describe('media helpers', () => {
  it('maps supported mime types and rejects others', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(extensionFor('image/png; charset=binary')).toBe('png');
    expect(extensionFor('image/webp')).toBe('webp');
    expect(extensionFor('image/gif')).toBeNull();
    expect(extensionFor('application/pdf')).toBeNull();
  });

  it('builds the public object URL', () => {
    expect(
      publicObjectUrl(
        { url: 'https://example.supabase.co', key: 'k', bucket: 'items' },
        'vendor/photo.jpg',
      ),
    ).toBe('https://example.supabase.co/storage/v1/object/public/items/vendor/photo.jpg');
  });

  it('does nothing when storage is not configured', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    await expect(saveItemImage({ mediaId: 'media-1', vendorId: 'v1' })).resolves.toBeNull();
  });
});
