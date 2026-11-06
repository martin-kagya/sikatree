import { db } from '@/lib/db';

export type ItemStatus = 'active' | 'sold_out' | 'hidden';
export const ITEM_STATUSES: ItemStatus[] = ['active', 'sold_out', 'hidden'];

export type ItemBadge = 'discount' | 'popular' | 'new' | null;

export type ItemInput = {
  name: string;
  description: string | null;
  pricePesewas: number;
  compareAtPesewas: number | null;
  category: string | null;
  stock: number | null;
  status: ItemStatus;
  imageUrl: string | null;
  imageUrlAlt: string | null;
  badge: ItemBadge;
  position: number | null;
};

export type EditableItem = ItemInput & { id: string };

export function itemError(input: ItemInput): string | null {
  if (input.name.length < 2 || input.name.length > 80) {
    return 'Item name must be 2 to 80 characters.';
  }
  if (input.description && input.description.length > 500) {
    return 'Description must be 500 characters or fewer.';
  }
  if (input.category && input.category.length > 40) {
    return 'Category must be 40 characters or fewer.';
  }
  if (!Number.isInteger(input.pricePesewas) || input.pricePesewas < 0 || input.pricePesewas > 10_000_000) {
    return 'Enter a price between GH₵0 and GH₵100,000.';
  }
  if (
    input.compareAtPesewas !== null &&
    (!Number.isInteger(input.compareAtPesewas) || input.compareAtPesewas <= input.pricePesewas)
  ) {
    return 'Compare-at price must be higher than the selling price.';
  }
  if (input.stock !== null && (!Number.isInteger(input.stock) || input.stock < 0 || input.stock > 999_999)) {
    return 'Stock must be a whole number from 0 to 999,999, or blank for unlimited.';
  }
  if (!ITEM_STATUSES.includes(input.status)) return 'Choose a valid visibility.';
  if (input.badge !== null && !['discount', 'popular', 'new'].includes(input.badge)) {
    return 'Choose a valid badge.';
  }
  if (input.position !== null && (!Number.isInteger(input.position) || input.position < 0 || input.position > 9999)) {
    return 'Position must be a whole number from 0 to 9999.';
  }
  if (input.imageUrlAlt && input.imageUrlAlt.length > 120) {
    return 'Image description must be 120 characters or fewer.';
  }
  return null;
}

export type ItemResult = { ok: true; id: string } | { ok: false; error: string };

const COLUMNS = `name, description, price_pesewas, compare_at_pesewas, category, stock,
  status, image_url, image_url_alt, badge, position`;

function values(input: ItemInput): unknown[] {
  return [
    input.name,
    input.description,
    input.pricePesewas,
    input.compareAtPesewas,
    input.category,
    input.stock,
    input.status,
    input.imageUrl,
    input.imageUrlAlt,
    input.badge,
  ];
}

export async function createItem(vendorId: string, input: ItemInput): Promise<ItemResult> {
  const problem = itemError(input);
  if (problem) return { ok: false, error: problem };

  const rows = await db().query<{ id: string }>(
    `insert into items (vendor_id, ${COLUMNS})
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
             coalesce($12, (select coalesce(max(position), -1) + 1 from items where vendor_id = $1)))
     returning id`,
    [vendorId, ...values(input), input.position],
  );

  return { ok: true, id: rows.rows[0].id };
}

export async function updateItem(
  vendorId: string,
  id: string,
  input: ItemInput,
): Promise<ItemResult> {
  const problem = itemError(input);
  if (problem) return { ok: false, error: problem };

  const rows = await db().query<{ id: string }>(
    `update items
        set name = $2, description = $3, price_pesewas = $4, compare_at_pesewas = $5,
            category = $6, stock = $7, status = $8, image_url = $9, image_url_alt = $10,
            badge = $11, position = coalesce($12, position)
      where id = $1 and vendor_id = $13
      returning id`,
    [id, ...values(input), input.position, vendorId],
  );

  if (!rows.rows[0]) return { ok: false, error: 'Item not found.' };
  return { ok: true, id };
}

export async function getVendorItem(vendorId: string, id: string): Promise<EditableItem | null> {
  const rows = await db().query<{
    id: string;
    name: string;
    description: string | null;
    price_pesewas: number;
    compare_at_pesewas: number | null;
    category: string | null;
    stock: number | null;
    status: ItemStatus;
    image_url: string | null;
    image_url_alt: string | null;
    badge: ItemBadge;
    position: number;
  }>(
    `select id, name, description, price_pesewas, compare_at_pesewas, category, stock,
            status, image_url, image_url_alt, badge, position
       from items where id = $1 and vendor_id = $2`,
    [id, vendorId],
  );
  const row = rows.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pricePesewas: row.price_pesewas,
    compareAtPesewas: row.compare_at_pesewas,
    category: row.category,
    stock: row.stock,
    status: row.status,
    imageUrl: row.image_url,
    imageUrlAlt: row.image_url_alt,
    badge: row.badge,
    position: row.position,
  };
}

export async function setItemStatus(
  vendorId: string,
  id: string,
  status: ItemStatus,
): Promise<ItemResult> {
  if (!ITEM_STATUSES.includes(status)) return { ok: false, error: 'Unknown status.' };

  const rows = await db().query<{ id: string }>(
    'update items set status = $3 where id = $1 and vendor_id = $2 returning id',
    [id, vendorId, status],
  );
  if (!rows.rows[0]) return { ok: false, error: 'Item not found.' };
  return { ok: true, id };
}

export async function listCategories(vendorId: string): Promise<string[]> {
  const rows = await db().query<{ category: string }>(
    `select distinct category from items
      where vendor_id = $1 and category is not null and category <> ''
      order by category`,
    [vendorId],
  );
  return rows.rows.map((row) => row.category);
}

// Additional item photos live in item_images; the primary photo stays on
// items.image_url. Ordered by position.
export async function listItemImages(itemId: string): Promise<string[]> {
  const rows = await db().query<{ url: string }>(
    `select url from item_images where item_id = $1 order by position, id`,
    [itemId],
  );
  return rows.rows.map((row) => row.url);
}

export async function replaceItemImages(itemId: string, urls: string[]): Promise<void> {
  await db().query('delete from item_images where item_id = $1', [itemId]);
  for (let index = 0; index < urls.length; index += 1) {
    await db().query('insert into item_images (item_id, url, position) values ($1, $2, $3)', [
      itemId,
      urls[index],
      index,
    ]);
  }
}

// Reorder by swapping the item's numeric position with its neighbour (CAT-09).
// Mobile-friendly up/down controls drive this; drag-and-drop can layer on top.
export async function moveItem(
  vendorId: string,
  itemId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const client = await db().connect();
  try {
    await client.query('begin');

    const current = await client.query<{ position: number }>(
      'select position from items where id = $1 and vendor_id = $2 for update',
      [itemId, vendorId],
    );
    const item = current.rows[0];
    if (!item) {
      await client.query('rollback');
      return;
    }

    const cmp = direction === 'up' ? '<' : '>';
    const order = direction === 'up' ? 'desc' : 'asc';
    const neighbour = await client.query<{ id: string; position: number }>(
      `select id, position from items
        where vendor_id = $1 and id <> $2 and position ${cmp} $3
        order by position ${order}, created_at ${order}
        limit 1 for update`,
      [vendorId, itemId, item.position],
    );
    const other = neighbour.rows[0];
    if (!other) {
      await client.query('rollback');
      return;
    }

    await client.query('update items set position = $2 where id = $1', [itemId, other.position]);
    await client.query('update items set position = $2 where id = $1', [other.id, item.position]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Vendor-defined category order (CAT-03). Items still use a free-text name;
// this list supplies the display order and the managed set.
export async function listManagedCategories(vendorId: string): Promise<string[]> {
  const rows = await db().query<{ name: string }>(
    `select name from vendor_categories where vendor_id = $1 order by position, name`,
    [vendorId],
  );
  return rows.rows.map((row) => row.name);
}

export type CategoriesResult = { ok: true } | { ok: false; error: string };

export async function saveCategories(vendorId: string, names: string[]): Promise<CategoriesResult> {
  const cleaned = names.map((name) => name.trim()).filter(Boolean).slice(0, 50);
  if (cleaned.some((name) => name.length > 40)) {
    return { ok: false, error: 'Category names must be 40 characters or fewer.' };
  }
  const unique = [...new Set(cleaned)];

  const client = await db().connect();
  try {
    await client.query('begin');
    await client.query('delete from vendor_categories where vendor_id = $1', [vendorId]);
    for (let index = 0; index < unique.length; index += 1) {
      await client.query('insert into vendor_categories (vendor_id, name, position) values ($1, $2, $3)', [
        vendorId,
        unique[index],
        index,
      ]);
    }
    await client.query('commit');
    return { ok: true };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Service vendors book appointments instead of selling stock.
export async function vendorIsService(vendorId: string): Promise<boolean> {
  const rows = await db().query<{ type: string | null }>(
    'select type from vendors where id = $1',
    [vendorId],
  );
  const type = rows.rows[0]?.type;
  return type === 'services' || type === 'both';
}
