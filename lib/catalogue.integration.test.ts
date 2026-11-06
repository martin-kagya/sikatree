import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createItem,
  getVendorItem,
  itemError,
  listCategories,
  listItemImages,
  listManagedCategories,
  moveItem,
  replaceItemImages,
  saveCategories,
  setItemStatus,
  updateItem,
  type ItemInput,
} from '@/lib/catalogue';
import { db, query } from '@/lib/db';

let vendorId = '';
let otherVendorId = '';

const base: ItemInput = {
  name: 'Vitamin C serum',
  description: 'Brightening serum for everyday use.',
  pricePesewas: 12000,
  compareAtPesewas: 15000,
  category: 'Serums',
  stock: 8,
  status: 'active',
  imageUrl: null,
  imageUrlAlt: null,
  badge: 'discount',
  kind: 'product',
  position: null,
};

beforeEach(async () => {
  await query('truncate items, vendors, orders restart identity cascade');
  const vendors = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at)
     values ('+233241234567', 'Ama Glow', 'amaglow', 'products', 'live', now()),
            ('+233249999999', 'Other Shop', 'othershop', 'products', 'live', now())
     returning id`,
  );
  vendorId = vendors[0].id;
  otherVendorId = vendors[1].id;
});

afterAll(async () => {
  await db().end();
});

describe('catalogue editor', () => {
  it('creates items with an automatic position and reads them back', async () => {
    const first = await createItem(vendorId, base);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await createItem(vendorId, { ...base, name: 'Hyaluronic serum', category: 'Serums' });
    expect(second.ok).toBe(true);

    const item = await getVendorItem(vendorId, first.id);
    expect(item).toMatchObject({
      name: 'Vitamin C serum',
      pricePesewas: 12000,
      compareAtPesewas: 15000,
      category: 'Serums',
      stock: 8,
      status: 'active',
      position: 0,
    });

    expect(await listCategories(vendorId)).toEqual(['Serums']);
  });

  it('updates price, stock, description and visibility', async () => {
    const created = await createItem(vendorId, base);
    if (!created.ok) throw new Error(created.error);

    const updated = await updateItem(vendorId, created.id, {
      ...base,
      name: 'Vitamin C serum 30ml',
      pricePesewas: 13500,
      stock: null,
      status: 'hidden',
      description: null,
      badge: null,
      compareAtPesewas: null,
    });
    expect(updated.ok).toBe(true);

    const item = await getVendorItem(vendorId, created.id);
    expect(item).toMatchObject({
      name: 'Vitamin C serum 30ml',
      pricePesewas: 13500,
      stock: null,
      status: 'hidden',
      description: null,
      badge: null,
      compareAtPesewas: null,
    });
  });

  it('toggles sold out without changing the stock count', async () => {
    const created = await createItem(vendorId, base);
    if (!created.ok) throw new Error(created.error);

    expect(await setItemStatus(vendorId, created.id, 'sold_out')).toEqual({
      ok: true,
      id: created.id,
    });
    const item = await getVendorItem(vendorId, created.id);
    expect(item?.status).toBe('sold_out');
    expect(item?.stock).toBe(8);
  });

  it('does not let another vendor edit or toggle the item', async () => {
    const created = await createItem(vendorId, base);
    if (!created.ok) throw new Error(created.error);

    expect((await getVendorItem(otherVendorId, created.id))).toBeNull();
    expect((await updateItem(otherVendorId, created.id, base)).ok).toBe(false);
    expect((await setItemStatus(otherVendorId, created.id, 'hidden')).ok).toBe(false);
    expect((await getVendorItem(vendorId, created.id))?.status).toBe('active');
  });

  it('rejects invalid prices, compare-at prices and stock', async () => {
    expect(itemError({ ...base, name: 'A' })).toContain('2 to 80');
    expect(itemError({ ...base, pricePesewas: -1 })).toContain('price');
    expect(itemError({ ...base, compareAtPesewas: 10000 })).toContain('higher');
    expect(itemError({ ...base, stock: -2 })).toContain('Stock');
    expect(itemError({ ...base, status: 'hidden' })).toBeNull();
  });

  it('moves an item up and down by swapping positions', async () => {
    const a = await createItem(vendorId, { ...base, name: 'Item A' });
    const b = await createItem(vendorId, { ...base, name: 'Item B' });
    const c = await createItem(vendorId, { ...base, name: 'Item C' });
    if (!a.ok || !b.ok || !c.ok) throw new Error('create failed');

    await moveItem(vendorId, c.id, 'up');
    expect((await getVendorItem(vendorId, c.id))?.position).toBe(1);
    expect((await getVendorItem(vendorId, b.id))?.position).toBe(2);

    await moveItem(vendorId, a.id, 'down');
    expect((await getVendorItem(vendorId, a.id))?.position).toBe(1);
    expect((await getVendorItem(vendorId, c.id))?.position).toBe(0);
  });

  it('stores and lists additional item images', async () => {
    const created = await createItem(vendorId, base);
    if (!created.ok) throw new Error(created.error);

    await replaceItemImages(created.id, ['/a.jpg', '/b.jpg']);
    expect(await listItemImages(created.id)).toEqual(['/a.jpg', '/b.jpg']);

    await replaceItemImages(created.id, ['/c.jpg']);
    expect(await listItemImages(created.id)).toEqual(['/c.jpg']);
  });

  it('saves and lists managed categories in order', async () => {
    expect((await saveCategories(vendorId, ['Body', 'Serums', 'Gift sets'])).ok).toBe(true);
    expect(await listManagedCategories(vendorId)).toEqual(['Body', 'Serums', 'Gift sets']);

    // Re-saving replaces the whole ordered list.
    expect((await saveCategories(vendorId, ['Gift sets', 'Body'])).ok).toBe(true);
    expect(await listManagedCategories(vendorId)).toEqual(['Gift sets', 'Body']);
  });
});
