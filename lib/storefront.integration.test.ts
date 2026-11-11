import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import { getStorefrontSettings, saveStorefrontSettings, type StorefrontInput } from '@/lib/storefront';

beforeEach(async () => {
  await query(
    'truncate login_code, vendor_session, auth_event, vendors restart identity cascade',
  );
});

afterAll(async () => {
  await db().end();
});

async function seedVendor(): Promise<string> {
  const rows = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at, bio, location, category)
     values ('+233241111111', 'Ama Glow', 'amaglow', 'products', 'live', now(),
             'Old bio', 'Accra', 'Beauty')
     returning id`,
  );
  return rows[0].id;
}

function input(overrides: Partial<StorefrontInput> = {}): StorefrontInput {
  return {
    name: 'Ama Glow',
    tagline: 'Skin that feels like you',
    bio: 'Handmade skincare in Accra.',
    location: 'East Legon, Accra',
    category: 'Beauty',
    accent: 'rose',
    cardImageRatio: '4/5',
    logoUrl: 'https://cdn.test/logo.webp',
    logoAlt: 'Ama Glow logo',
    coverUrl: 'https://cdn.test/cover.webp',
    ...overrides,
  };
}

describe('storefront settings', () => {
  it('saves and reads the full brand, look and image set', async () => {
    const vendorId = await seedVendor();
    const saved = await saveStorefrontSettings(vendorId, input());
    expect(saved.ok).toBe(true);

    const settings = await getStorefrontSettings(vendorId);
    expect(settings).toMatchObject({
      name: 'Ama Glow',
      tagline: 'Skin that feels like you',
      bio: 'Handmade skincare in Accra.',
      location: 'East Legon, Accra',
      category: 'Beauty',
      accent: 'rose',
      cardImageRatio: '4/5',
      logoUrl: 'https://cdn.test/logo.webp',
      logoAlt: 'Ama Glow logo',
      coverUrl: 'https://cdn.test/cover.webp',
    });
  });

  it('clears brand fields and images for reset', async () => {
    const vendorId = await seedVendor();
    await saveStorefrontSettings(vendorId, input());
    const saved = await saveStorefrontSettings(
      vendorId,
      input({
        name: 'Ama Glow',
        tagline: '',
        bio: '',
        location: '',
        category: '',
        accent: 'green',
        cardImageRatio: '1/1',
        logoUrl: null,
        logoAlt: '',
        coverUrl: null,
      }),
    );
    expect(saved.ok).toBe(true);

    const settings = await getStorefrontSettings(vendorId);
    expect(settings).toMatchObject({
      tagline: null,
      bio: null,
      location: null,
      category: null,
      accent: 'green',
      cardImageRatio: '1/1',
      logoUrl: null,
      logoAlt: null,
      coverUrl: null,
    });
  });

  it('keeps a vendor without settings working with defaults', async () => {
    const vendorId = await seedVendor();
    const settings = await getStorefrontSettings(vendorId);
    expect(settings).toMatchObject({
      name: 'Ama Glow',
      tagline: null,
      accent: 'green',
      cardImageRatio: '1/1',
      logoUrl: null,
      coverUrl: null,
    });
  });

  it('rejects invalid input without writing', async () => {
    const vendorId = await seedVendor();
    const saved = await saveStorefrontSettings(vendorId, input({ accent: 'neon' }));
    expect(saved.ok).toBe(false);

    const settings = await getStorefrontSettings(vendorId);
    expect(settings?.accent).toBe('green');
    expect(settings?.bio).toBe('Old bio');
  });
});
