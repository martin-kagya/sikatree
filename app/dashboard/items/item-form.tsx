'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Dropdown } from '@/components/ui/dropdown';
import type { EditableItem, ItemKind } from '@/lib/catalogue';
import { saveItemAction, type ItemFormState } from './actions';

const initial: ItemFormState = {};

const field =
  'h-11 w-full rounded-[12px] border border-hairline bg-white px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-150 hover:border-ink/20 focus:border-green-deep focus:ring-2 focus:ring-green-deep';
const label = 'mb-1.5 block text-[13px] font-medium text-ink';

export function ItemForm({
  item,
  categories,
  vendorType = 'products',
}: {
  item: EditableItem | null;
  categories: string[];
  vendorType?: 'products' | 'services' | 'both';
}) {
  const [state, action, pending] = useActionState(saveItemAction, initial);
  const [kind, setKind] = useState<ItemKind>(
    item?.kind ?? (vendorType === 'services' ? 'service' : 'product'),
  );
  const [preview, setPreview] = useState(item?.imageUrl ?? null);
  const [newFile, setNewFile] = useState(false);
  const [remove, setRemove] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  return (
    <form action={action} encType="multipart/form-data" className="mt-5 grid gap-6 md:grid-cols-[260px_1fr]">
      <input type="hidden" name="id" value={item?.id ?? ''} />

      <aside className="space-y-3">
        <div className="aspect-square overflow-hidden rounded-[20px] border border-hairline bg-surface-soft">
          {preview && !remove ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-ink-muted">
              No photo yet. A photo makes the item easier to trust.
            </div>
          )}
        </div>

        <div>
          <label htmlFor="image" className={label}>
            {item?.imageUrl ? 'Replace photos' : 'Photos'}
          </label>
          <input
            id="image"
            name="image"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              const total = files.reduce((sum, file) => sum + file.size, 0);
              setSizeError(
                total > 30 * 1024 * 1024
                  ? 'Those photos are too large together (30MB total). Use fewer or smaller photos.'
                  : null,
              );
              const file = event.target.files?.[0];
              if (file) {
                setPreview(URL.createObjectURL(file));
                setNewFile(true);
                setRemove(false);
              } else {
                setPreview(item?.imageUrl ?? null);
                setNewFile(false);
              }
            }}
            className="block w-full text-[12px] text-ink-muted file:mr-3 file:rounded-pill file:border-0 file:bg-ink file:px-3 file:py-2 file:text-[12px] file:text-white"
          />
          <p className="mt-1.5 text-[11px] text-ink-muted">
            Up to 5 photos (JPG, PNG, WebP or AVIF, up to 10MB each, 30MB total). The first is the
            cover. Re-uploading replaces all photos.
          </p>
          {sizeError ? (
            <p role="alert" className="mt-1.5 text-[11px] text-danger">
              {sizeError}
            </p>
          ) : null}
        </div>

        {item?.imageUrl && !newFile ? (
          <label className="flex items-center gap-2 text-[12px] text-ink">
            <input
              type="checkbox"
              name="removeImage"
              checked={remove}
              onChange={(event) => {
                setRemove(event.target.checked);
                setPreview(event.target.checked ? null : (item.imageUrl ?? null));
              }}
              className="h-4 w-4 rounded border-hairline"
            />
            Remove all photos
          </label>
        ) : null}

      </aside>

      <div className="space-y-4">
        {state.error ? (
          <p role="alert" className="rounded-[12px] bg-danger-bg p-3 text-[13px] text-danger">
            {state.error}
          </p>
        ) : null}

        {vendorType === 'both' ? (
          <div>
            <label htmlFor="kind" className={label}>
              Type
            </label>
            <Dropdown
              id="kind"
              name="kind"
              value={kind}
              onChange={(value) => setKind(value === 'service' ? 'service' : 'product')}
              ariaLabel="Item type"
              size="lg"
              options={[
                { value: 'product', label: 'Product' },
                { value: 'service', label: 'Service' },
              ]}
            />
            <p className="mt-1.5 text-[11px] text-ink-muted">
              Services are booked, not shipped: no stock, and customers pick a time.
            </p>
          </div>
        ) : (
          <input type="hidden" name="kind" value={kind} />
        )}

        <div>
          <label htmlFor="name" className={label}>
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={item?.name ?? ''}
            placeholder="Vitamin C serum"
            className={field}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className={label}>
              Price (GH₵)
            </label>
            <input
              id="price"
              name="price"
              required
              inputMode="decimal"
              defaultValue={item ? (item.pricePesewas / 100).toFixed(2) : ''}
              placeholder="120.00"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="compareAt" className={label}>
              Compare-at price
            </label>
            <input
              id="compareAt"
              name="compareAt"
              inputMode="decimal"
              defaultValue={item?.compareAtPesewas ? (item.compareAtPesewas / 100).toFixed(2) : ''}
              placeholder="Optional"
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className={label}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={500}
            defaultValue={item?.description ?? ''}
            placeholder="What it is, what it does, and anything the buyer should know."
            className="w-full rounded-[12px] border border-hairline bg-white p-3 text-[14px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className={label}>
              Category
            </label>
            <input
              id="category"
              name="category"
              maxLength={40}
              list="item-categories"
              defaultValue={item?.category ?? ''}
              placeholder="Serums"
              className={field}
            />
            <datalist id="item-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          {kind !== 'service' ? (
            <div>
              <label htmlFor="stock" className={label}>
                Stock
              </label>
              <input
                id="stock"
                name="stock"
                inputMode="numeric"
                defaultValue={item?.stock ?? ''}
                placeholder="Blank means unlimited"
                className={field}
              />
              {item ? (
                <input
                  name="stockReason"
                  maxLength={120}
                  defaultValue=""
                  placeholder="Why stock changed (optional)"
                  className={`${field} mt-1.5`}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className={label}>
              Visibility
            </label>
            <Dropdown
              id="status"
              name="status"
              defaultValue={item?.status ?? 'active'}
              ariaLabel="Visibility"
              size="lg"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'sold_out', label: kind === 'service' ? 'Unavailable' : 'Sold out' },
                { value: 'hidden', label: 'Hidden' },
              ]}
            />
          </div>
          <div>
            <label htmlFor="badge" className={label}>
              Badge
            </label>
            <Dropdown
              id="badge"
              name="badge"
              defaultValue={item?.badge ?? ''}
              ariaLabel="Badge"
              size="lg"
              options={[
                { value: '', label: 'None' },
                { value: 'discount', label: 'Discount' },
                { value: 'popular', label: 'Popular' },
                { value: 'new', label: 'New' },
              ]}
            />
          </div>
        </div>

        <div>
          <label htmlFor="position" className={label}>
            Position
          </label>
          <input
            id="position"
            name="position"
            inputMode="numeric"
            defaultValue={item?.position ?? ''}
            placeholder="Blank puts it last"
            className={field}
          />
          <p className="mt-1.5 text-[11px] text-ink-muted">
            Lower numbers show first. Leave blank on a new item to add it at the end.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
          <button
            type="submit"
            disabled={pending || Boolean(sizeError)}
            className="inline-flex h-11 items-center rounded-pill bg-green-main px-6 text-label text-ink transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-green-main/90 active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? 'Saving…' : item ? 'Save changes' : 'Add item'}
          </button>
          <Link
            href="/dashboard"
            className="text-[13px] text-ink-muted transition-colors duration-150 hover:text-ink"
          >
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
