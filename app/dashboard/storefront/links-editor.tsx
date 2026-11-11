'use client';

import { useActionState, useState } from 'react';
import { PendingButton } from '@/components/system/pending-button';
import {
  LINK_KINDS,
  LINK_LABELS,
  normalizeVendorLink,
  type VendorLinkKind,
} from '@/lib/storefront-shared';
import { saveLinksAction, type LinksFormState } from './actions';

const initial: LinksFormState = {};

type Row = {
  kind: VendorLinkKind;
  label: string;
  raw: string;
  visible: boolean;
};

const field =
  'h-11 w-full rounded-inner border border-hairline bg-white px-3 text-[16px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep';
const smallField =
  'h-10 w-full rounded-inner border border-hairline bg-white px-3 text-[14px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep';

function placeholder(kind: VendorLinkKind): string {
  switch (kind) {
    case 'whatsapp':
    case 'phone':
      return '024 123 4567';
    case 'instagram':
    case 'tiktok':
    case 'snapchat':
    case 'facebook':
      return '@yourhandle';
    case 'maps':
    case 'website':
    case 'custom':
      return 'https://example.com';
    default:
      return '';
  }
}

export function LinksEditor({
  links,
}: {
  links: { kind: VendorLinkKind; label: string; url: string; visible: boolean }[];
}) {
  const [state, action] = useActionState(saveLinksAction, initial);
  const [rows, setRows] = useState<Row[]>(() =>
    links.map((link) => ({
      kind: link.kind,
      label: link.label,
      raw: link.url,
      visible: link.visible,
    })),
  );
  const [dirty, setDirty] = useState(false);

  function update(index: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
    setDirty(true);
  }

  function move(index: number, delta: number) {
    setRows((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  function remove(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    setDirty(true);
  }

  function add() {
    if (rows.length >= 8) return;
    const kind =
      LINK_KINDS.find((candidate) => candidate !== 'custom' && !rows.some((row) => row.kind === candidate)) ??
      'custom';
    setRows((current) => [
      ...current,
      { kind, label: LINK_LABELS[kind], raw: '', visible: true },
    ]);
    setDirty(true);
  }

  return (
    <section className="mt-5 rounded-panel bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h2 text-ink">Links</h2>
          <p className="mt-1 text-small text-ink-muted">
            WhatsApp, socials, your website or directions. Up to 8.
          </p>
        </div>
        <span className="rounded-pill bg-page px-3 py-1 text-[12px] text-ink-muted">
          {rows.length}/8
        </span>
      </div>

      {state.error ? (
        <p role="alert" className="mt-4 rounded-[12px] bg-danger-bg p-3 text-small text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-hairline p-5 text-center text-small text-ink-muted">
            No links yet. Add WhatsApp, Instagram or your website.
          </p>
        ) : null}

        {rows.map((row, index) => {
          const canonical = normalizeVendorLink(row.kind, row.raw);
          return (
            <div key={`${row.kind}-${index}`} className="rounded-[14px] border border-hairline p-3">
              <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                <label className="block text-[12px] font-medium text-ink">
                  Type
                  <select
                    value={row.kind}
                    onChange={(event) =>
                      update(index, { kind: event.target.value as VendorLinkKind })
                    }
                    className={`${smallField} mt-1`}
                  >
                    {LINK_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {LINK_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[12px] font-medium text-ink">
                  Label
                  <input
                    value={row.label}
                    maxLength={40}
                    onChange={(event) => update(index, { label: event.target.value })}
                    placeholder={LINK_LABELS[row.kind]}
                    className={`${smallField} mt-1`}
                  />
                </label>
              </div>

              <label className="mt-3 block text-[12px] font-medium text-ink">
                {row.kind === 'website' || row.kind === 'maps' || row.kind === 'custom'
                  ? 'URL'
                  : 'Handle, number or URL'}
                <input
                  value={row.raw}
                  maxLength={300}
                  onChange={(event) => update(index, { raw: event.target.value })}
                  placeholder={placeholder(row.kind)}
                  inputMode={row.kind === 'whatsapp' || row.kind === 'phone' ? 'tel' : 'url'}
                  className={`${field} mt-1`}
                />
              </label>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className={`text-[11px] ${canonical ? 'text-ink-muted' : 'text-danger'}`}>
                  {canonical ?? 'Enter a handle, number or https URL.'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                    <input
                      type="checkbox"
                      checked={row.visible}
                      onChange={(event) => update(index, { visible: event.target.checked })}
                      className="h-4 w-4 rounded border-hairline"
                    />
                    Show
                  </label>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="h-8 rounded-pill border border-hairline px-2.5 text-[12px] text-ink disabled:opacity-30"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === rows.length - 1}
                    className="h-8 rounded-pill border border-hairline px-2.5 text-[12px] text-ink disabled:opacity-30"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="h-8 rounded-pill border border-hairline px-2.5 text-[12px] text-danger"
                  >
                    Remove link
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={add}
          disabled={rows.length >= 8}
          className="pressable inline-flex h-9 items-center rounded-pill border border-hairline px-4 text-[12px] text-ink hover:border-ink/40 disabled:opacity-40"
        >
          Add link
        </button>

        <form action={action} className="flex items-center gap-3">
          <input type="hidden" name="links" value={JSON.stringify(rows)} />
          <p className="text-[11px] text-ink-muted">
            {dirty ? 'Unsaved changes.' : 'Links save separately.'}
          </p>
          <PendingButton
            pendingLabel="Saving…"
            className="h-10 rounded-pill bg-green-main px-5 text-[13px] text-ink disabled:opacity-50"
          >
            Save links
          </PendingButton>
        </form>
      </div>
    </section>
  );
}
