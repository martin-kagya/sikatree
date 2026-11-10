'use client';

import { useActionState } from 'react';
import { saveCategoriesAction, type CategoriesState } from './actions';
import { PendingButton } from '@/components/system/pending-button';

const initial: CategoriesState = {};

export function CategoriesSettings({ categories }: { categories: string[] }) {
  const [state, action] = useActionState(saveCategoriesAction, initial);

  return (
    <form action={action} className="mt-4">
      {state.error ? (
        <p role="alert" className="mb-4 rounded-[12px] bg-danger-bg p-3 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="feedback-rise mb-4 rounded-[12px] bg-mint-100 p-3 text-[13px] text-green-deep">
          Categories saved.
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">
          Categories (one per line, in display order)
        </span>
        <textarea
          name="categories"
          rows={6}
          defaultValue={categories.join('\n')}
          placeholder={'Serums\nBody care\nGift sets'}
          className="w-full rounded-[12px] border border-hairline bg-white p-3 text-[14px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep"
        />
      </label>
      <p className="mt-1.5 text-[11px] text-ink-muted">
        Sets the order of the category chips on your page. Items keep their own category text; a
        category not listed here is appended alphabetically.
      </p>

      <PendingButton
        pendingLabel="Saving…"
        className="mt-4 inline-flex h-10 items-center rounded-pill bg-ink px-5 text-small text-white hover:bg-ink/90 disabled:opacity-50"
      >
        Save categories
      </PendingButton>
    </form>
  );
}
