'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { ChevronDown } from '@/components/icons';
import type { EditableItem } from '@/lib/catalogue';
import { saveItemAction, type ItemFormState } from './actions';

const initial: ItemFormState = {};

const field =
  'h-11 w-full rounded-[12px] border border-hairline bg-white px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-150 hover:border-ink/20 focus:border-green-deep focus:ring-2 focus:ring-green-deep';
const select = `${field} appearance-none pr-10`;
const label = 'mb-1.5 block text-[13px] font-medium text-ink';

export function ItemForm({
  item,
  categories,
}: {
  item: EditableItem | null;
  categories: string[];
}) {
  const [state, action, pending] = useActionState(saveItemAction, initial);
  const [preview, setPreview] = useState(item?.imageUrl ?? null);
  const [newFile, setNewFile] = useState(false);
  const [remove, setRemove] = useState(false);

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
            {item?.imageUrl ? 'Replace photo' : 'Photo'}
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => {
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
          <p className="mt-1.5 text-[11px] text-ink-muted">JPG, PNG, WebP or AVIF, up to 10MB.</p>
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
            Remove current photo
          </label>
        ) : null}

      </aside>

      <div className="space-y-4">
        {state.error ? (
          <p role="alert" className="rounded-[12px] bg-danger-bg p-3 text-[13px] text-danger">
            {state.error}
          </p>
        ) : null}

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
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className={label}>
              Visibility
            </label>
            <div className="relative">
              <select
                id="status"
                name="status"
                defaultValue={item?.status ?? 'active'}
                className={`${select} peer`}
              >
                <option value="active">Active</option>
                <option value="sold_out">Sold out</option>
                <option value="hidden">Hidden</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted transition-transform duration-200 peer-focus:rotate-180" />
            </div>
          </div>
          <div>
            <label htmlFor="badge" className={label}>
              Badge
            </label>
            <div className="relative">
              <select
                id="badge"
                name="badge"
                defaultValue={item?.badge ?? ''}
                className={`${select} peer`}
              >
                <option value="">None</option>
                <option value="discount">Discount</option>
                <option value="popular">Popular</option>
                <option value="new">New</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted transition-transform duration-200 peer-focus:rotate-180" />
            </div>
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
            disabled={pending}
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
