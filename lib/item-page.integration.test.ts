import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import { getSharedItem } from '@/lib/item-page';

let vendorId = '';
let itemId = '';
let hiddenId = '';
let soldOutId = '';
let draftItemId = '';

beforeEach(async () => {
  await query(
    `truncate item_images, stock_movement, order_items, orders, items, vendors restart identity cascade`,
  );

  const vendor = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at, location, category)
     values ('+233241234567', 'Ama''s Glow Studio', 'amasglow', 'products', 'live', now(),
             'Kumasi', 'Beauty')
     returning id`,
  );
  vendorId = vendor[0].id;

  const items = await query<{ id: string }>(
    `insert into items (vendor_id, name, price_pesewas, compare_at_pesewas, category, stock,
                        status, kind, badge, image_url, image_url_alt, description)
     values ($1, 'Vitamin C serum', 12000, 15000, 'Serums', 4, 'active', 'product', 'popular',
             'https://cdn.example.com/serum-cover.jpg', 'https://cdn.example.com/serum-alt.jpg',
             'A brightening serum.'),
            ($1, 'Hidden butter', 4500, null, 'Body', 3, 'hidden', 'product', null, null, null, null),
            ($1, 'Sold out oil', 8000, null, 'Body', 0, 'sold_out', 'product', null,
             'https://cdn.example.com/oil.jpg', null, null)
     returning id`,
    [vendorId],
  );
  itemId = items[0].id;
  hiddenId = items[1].id;
  soldOutId = items[2].id;

  await query(
    `insert into item_images (item_id, url, position)
     values ($1, 'https://cdn.example.com/serum-1.jpg', 0),
            ($1, 'https://cdn.example.com/serum-2.jpg', 1)`,
    [itemId],
  );

  const draft = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at)
     values ('+233240000001', 'Draft Shop', 'draftshop', 'products', 'draft', now())
     returning id`,
  );
  const draftItems = await query<{ id: string }>(
    `insert into items (vendor_id, name, price_pesewas, stock, status, kind)
     values ($1, 'Draft item', 1000, 1, 'active', 'product') returning id`,
    [draft[0].id],
  );
  draftItemId = draftItems[0].id;
});

afterAll(async () => {
  await db().end();
});

describe('shared item page data', () => {
  it('returns a live item with its vendor and every photo', async () => {
    const item = await getSharedItem('amasglow', itemId);
    expect(item).not.toBeNull();
    if (!item) return;

    expect(item).toMatchObject({
      name: 'Vitamin C serum',
      pricePesewas: 12000,
      compareAtPesewas: 15000,
      category: 'Serums',
      stock: 4,
      status: 'active',
      kind: 'product',
      badge: 'popular',
    });
    expect(item.vendor).toMatchObject({ name: "Ama's Glow Studio", handle: 'amasglow' });
    expect(item.images).toEqual([
      'https://cdn.example.com/serum-cover.jpg',
      'https://cdn.example.com/serum-alt.jpg',
      'https://cdn.example.com/serum-1.jpg',
      'https://cdn.example.com/serum-2.jpg',
    ]);
  });

  it('keeps a sold-out item shareable', async () => {
    const item = await getSharedItem('amasglow', soldOutId);
    expect(item).not.toBeNull();
    expect(item?.status).toBe('sold_out');
  });

  it('hides hidden items and items from shops that are not live', async () => {
    expect(await getSharedItem('amasglow', hiddenId)).toBeNull();
    expect(await getSharedItem('draftshop', draftItemId)).toBeNull();
  });

  it('rejects unknown ids and malformed ids', async () => {
    expect(await getSharedItem('amasglow', '00000000-0000-4000-8000-000000000000')).toBeNull();
    expect(await getSharedItem('amasglow', 'not-a-uuid')).toBeNull();
    expect(await getSharedItem('noshop', itemId)).toBeNull();
  });
});
