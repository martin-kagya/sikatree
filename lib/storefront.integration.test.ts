import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import {
  getStorefrontSettings,
  listVendorLinks,
  saveStorefrontSettings,
  saveVendorLinks,
  type StorefrontInput,
} from '@/lib/storefront';

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


describe('vendor links', () => {
  it('saves, orders, hides and deletes links', async () => {
    const vendorId = await seedVendor();
    const saved = await saveVendorLinks(vendorId, [
      { kind: 'whatsapp', label: 'Chat', raw: '024 111 1111', visible: true },
      { kind: 'instagram', label: 'Instagram', raw: '@amaglow', visible: true },
      { kind: 'website', label: 'Shop site', raw: 'https://amaglow.com', visible: false },
    ]);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;

    expect(saved.value.map((link) => link.kind)).toEqual(['whatsapp', 'instagram', 'website']);
    expect(saved.value[0].url).toBe('https://wa.me/233241111111');
    expect(saved.value[1].url).toBe('https://instagram.com/amaglow');
    expect(saved.value[2].visible).toBe(false);

    const visible = await listVendorLinks(vendorId, { visibleOnly: true });
    expect(visible.map((link) => link.kind)).toEqual(['whatsapp', 'instagram']);

    const reordered = await saveVendorLinks(vendorId, [
      { kind: 'instagram', label: 'Instagram', raw: '@amaglow', visible: true },
      { kind: 'whatsapp', label: 'Chat', raw: '024 111 1111', visible: true },
    ]);
    expect(reordered.ok).toBe(true);
    const after = await listVendorLinks(vendorId);
    expect(after.map((link) => link.kind)).toEqual(['instagram', 'whatsapp']);
    expect(after.map((link) => link.position)).toEqual([0, 1]);
  });

  it('allows repeated custom links but one per social kind', async () => {
    const vendorId = await seedVendor();
    const custom = await saveVendorLinks(vendorId, [
      { kind: 'custom', label: 'Press', raw: 'https://press.example', visible: true },
      { kind: 'custom', label: 'Lookbook', raw: 'https://look.example', visible: true },
    ]);
    expect(custom.ok).toBe(true);

    const duplicate = await saveVendorLinks(vendorId, [
      { kind: 'instagram', label: 'One', raw: '@one', visible: true },
      { kind: 'instagram', label: 'Two', raw: '@two', visible: true },
    ]);
    expect(duplicate.ok).toBe(false);
  });

  it('rejects more than eight links and invalid URLs', async () => {
    const vendorId = await seedVendor();
    const tooMany = await saveVendorLinks(
      vendorId,
      Array.from({ length: 9 }, (_, index) => ({
        kind: 'custom' as const,
        label: `Link ${index}`,
        raw: `https://example.com/${index}`,
        visible: true,
      })),
    );
    expect(tooMany.ok).toBe(false);

    const invalid = await saveVendorLinks(vendorId, [
      { kind: 'website', label: 'Site', raw: 'http://example.com', visible: true },
    ]);
    expect(invalid.ok).toBe(false);
  });
});
