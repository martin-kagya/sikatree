'use client';

import Link from 'next/link';
import { useActionState, useRef, useState, type CSSProperties } from 'react';
import { PendingButton } from '@/components/system/pending-button';
import {
  CARD_IMAGE_RATIOS,
  CATEGORY_SUGGESTIONS,
  type CardImageRatio,
  type StorefrontSettings,
} from '@/lib/storefront-shared';
import { SHOP_ACCENTS, accentFor, tintForAccent } from '@/lib/shop-accent';
import { saveStorefrontAction, type StorefrontFormState } from './actions';

const initial: StorefrontFormState = {};

const field =
  'mt-1.5 h-12 w-full rounded-inner border border-hairline bg-white px-4 text-[16px] text-ink outline-none transition-colors focus:border-green-deep focus:ring-2 focus:ring-green-deep';
const label = 'block text-label font-medium text-ink';
const hint = 'mt-1.5 text-[12px] leading-relaxed text-ink-muted';

type Fields = {
  name: string;
  tagline: string;
  bio: string;
  location: string;
  category: string;
  accent: string;
  cardImageRatio: CardImageRatio;
  logoAlt: string;
};

function fieldsFrom(settings: StorefrontSettings): Fields {
  return {
    name: settings.name,
    tagline: settings.tagline ?? '',
    bio: settings.bio ?? '',
    location: settings.location ?? '',
    category: settings.category ?? '',
    accent: settings.accent,
    cardImageRatio: settings.cardImageRatio,
    logoAlt: settings.logoAlt ?? '',
  };
}

export function StorefrontEditor({
  settings,
  saved,
}: {
  settings: StorefrontSettings;
  saved: boolean;
}) {
  const [state, action] = useActionState(saveStorefrontAction, initial);
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(settings));
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl);
  const [coverPreview, setCoverPreview] = useState<string | null>(settings.coverUrl);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [dirty, setDirty] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  function update<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function chooseImage(kind: 'logo' | 'cover', file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (kind === 'logo') {
      setLogoPreview(url);
      setRemoveLogo(false);
    } else {
      setCoverPreview(url);
      setRemoveCover(false);
    }
    setDirty(true);
  }

  function resetBrand() {
    setFields((current) => ({
      ...current,
      tagline: '',
      bio: '',
      location: '',
      category: '',
      logoAlt: '',
    }));
    setLogoPreview(null);
    setCoverPreview(null);
    setRemoveLogo(true);
    setRemoveCover(true);
    if (logoInput.current) logoInput.current.value = '';
    if (coverInput.current) coverInput.current.value = '';
    setDirty(true);
  }

  function resetLook() {
    setFields((current) => ({ ...current, accent: 'green', cardImageRatio: '1/1' }));
    setDirty(true);
  }

  const accent = accentFor(fields.accent);
  const tint = tintForAccent(accent.hex);
  const coverTint = tintForAccent(accent.hex, 0.16);
  const showLogo = Boolean(logoPreview) && !removeLogo;
  const showCover = Boolean(coverPreview) && !removeCover;
  const previewStyle = {
    '--preview-accent': accent.hex,
    '--preview-label': accent.label,
    '--preview-tint': tint,
  } as CSSProperties;

  return (
    <form action={action} encType="multipart/form-data" className="mt-6">
      <input type="hidden" name="accent" value={fields.accent} />
      <input type="hidden" name="cardImageRatio" value={fields.cardImageRatio} />
      <input type="hidden" name="removeLogo" value={removeLogo ? 'on' : ''} />
      <input type="hidden" name="removeCover" value={removeCover ? 'on' : ''} />

      {saved ? (
        <p className="feedback-rise mb-5 rounded-card bg-mint-100 p-4 text-small text-green-deep">
          Saved. Your shop is live with the new look.
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="mb-5 rounded-card bg-danger-bg p-4 text-small text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-5 pb-24">
          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-h2 text-ink">Brand</h2>
                <p className={hint}>The name, story and details customers see first.</p>
              </div>
              <button
                type="button"
                onClick={resetBrand}
                className="pressable inline-flex h-8 shrink-0 items-center rounded-pill border border-hairline px-3 text-[12px] text-ink-muted hover:border-ink/40 hover:text-ink"
              >
                Reset brand
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="name" className={label}>
                  Shop name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  value={fields.name}
                  onChange={(event) => update('name', event.target.value)}
                  className={field}
                />
                <p className={hint}>Your link stays sikatree.africa/{settings.handle}.</p>
              </div>

              <div>
                <label htmlFor="tagline" className={label}>
                  Tagline
                </label>
                <input
                  id="tagline"
                  name="tagline"
                  maxLength={80}
                  value={fields.tagline}
                  onChange={(event) => update('tagline', event.target.value)}
                  placeholder="Skin that feels like you"
                  className={field}
                />
                <p className={hint}>One short line under your name. Leave blank to hide it.</p>
              </div>

              <div>
                <label htmlFor="bio" className={label}>
                  About
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={5}
                  maxLength={500}
                  value={fields.bio}
                  onChange={(event) => update('bio', event.target.value)}
                  placeholder="What you make, who it is for, and how customers can reach you."
                  className="mt-1.5 w-full rounded-inner border border-hairline bg-white p-4 text-[16px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep"
                />
                <p className={hint}>{fields.bio.length}/500</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="location" className={label}>
                    Location
                  </label>
                  <input
                    id="location"
                    name="location"
                    maxLength={60}
                    value={fields.location}
                    onChange={(event) => update('location', event.target.value)}
                    placeholder="East Legon, Accra"
                    className={field}
                  />
                </div>
                <div>
                  <label htmlFor="category" className={label}>
                    Category
                  </label>
                  <input
                    id="category"
                    name="category"
                    maxLength={40}
                    list="storefront-categories"
                    value={fields.category}
                    onChange={(event) => update('category', event.target.value)}
                    placeholder="Beauty"
                    className={field}
                  />
                  <datalist id="storefront-categories">
                    {CATEGORY_SUGGESTIONS.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-h2 text-ink">Images</h2>
            <p className={hint}>
              A logo and cover make the page recognisably yours. Use JPG, PNG, WebP or AVIF.
            </p>

            <div className="mt-5 grid gap-6 sm:grid-cols-[180px_1fr]">
              <div>
                <p className={label}>Logo</p>
                <div className="mt-2 flex h-[112px] w-[112px] items-center justify-center overflow-hidden rounded-full border border-hairline bg-white p-2">
                  {showLogo && logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[26px] font-semibold text-green-deep">
                      {fields.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((word) => word[0]?.toUpperCase())
                        .join('') || 'S'}
                    </span>
                  )}
                </div>
                <input
                  ref={logoInput}
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(event) => chooseImage('logo', event.target.files?.[0])}
                  className="mt-3 block w-full text-[12px] text-ink-muted file:mr-3 file:rounded-pill file:border-0 file:bg-ink file:px-3 file:py-2 file:text-[12px] file:text-white"
                />
                <p className={hint}>Square, up to 2MB.</p>
                {showLogo ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveLogo(true);
                      setLogoPreview(null);
                      if (logoInput.current) logoInput.current.value = '';
                      setDirty(true);
                    }}
                    className="mt-2 text-[12px] text-danger underline underline-offset-2"
                  >
                    Remove logo
                  </button>
                ) : null}
                {showLogo ? (
                  <div className="mt-3">
                    <label htmlFor="logoAlt" className={label}>
                      Logo description
                    </label>
                    <input
                      id="logoAlt"
                      name="logoAlt"
                      maxLength={120}
                      value={fields.logoAlt}
                      onChange={(event) => update('logoAlt', event.target.value)}
                      placeholder={`${fields.name} logo`}
                      className={field}
                    />
                  </div>
                ) : (
                  <input type="hidden" name="logoAlt" value="" />
                )}
              </div>

              <div>
                <p className={label}>Cover</p>
                <div
                  className="mt-2 overflow-hidden rounded-[16px] border border-hairline"
                  style={{ aspectRatio: '16 / 9' }}
                >
                  {showCover && coverPreview ? (
                    <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-[12px] text-ink-muted"
                      style={{ background: `linear-gradient(135deg, ${coverTint}, #ffffff 72%)` }}
                    >
                      A soft accent gradient is used until you add a cover.
                    </div>
                  )}
                </div>
                <input
                  ref={coverInput}
                  id="cover"
                  name="cover"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(event) => chooseImage('cover', event.target.files?.[0])}
                  className="mt-3 block w-full text-[12px] text-ink-muted file:mr-3 file:rounded-pill file:border-0 file:bg-ink file:px-3 file:py-2 file:text-[12px] file:text-white"
                />
                <p className={hint}>16:9, up to 5MB.</p>
                {showCover ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveCover(true);
                      setCoverPreview(null);
                      if (coverInput.current) coverInput.current.value = '';
                      setDirty(true);
                    }}
                    className="mt-2 text-[12px] text-danger underline underline-offset-2"
                  >
                    Remove cover
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-h2 text-ink">Look</h2>
                <p className={hint}>Pick an accent and the shape of your product cards.</p>
              </div>
              <button
                type="button"
                onClick={resetLook}
                className="pressable inline-flex h-8 shrink-0 items-center rounded-pill border border-hairline px-3 text-[12px] text-ink-muted hover:border-ink/40 hover:text-ink"
              >
                Reset look
              </button>
            </div>

            <div className="mt-5">
              <p className={label}>Accent</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(SHOP_ACCENTS).map(([key, value]) => {
                  const selected = fields.accent === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => update('accent', key)}
                      className={
                        selected
                          ? 'flex h-11 items-center gap-2 rounded-pill border-2 border-ink px-3 text-[12px] text-ink'
                          : 'flex h-11 items-center gap-2 rounded-pill border border-hairline px-3 text-[12px] text-ink hover:border-ink/40'
                      }
                    >
                      <span
                        className="h-6 w-6 rounded-full"
                        style={{
                          backgroundColor: value.hex,
                          boxShadow: `inset 0 0 0 1px rgba(16,17,31,0.08), 0 0 0 4px ${tintForAccent(
                            value.hex,
                          )}`,
                        }}
                      />
                      {value.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className={label}>Card shape</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CARD_IMAGE_RATIOS.map((ratio) => {
                  const selected = fields.cardImageRatio === ratio;
                  return (
                    <button
                      key={ratio}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => update('cardImageRatio', ratio)}
                      className={
                        selected
                          ? 'flex h-11 items-center gap-2 rounded-pill border-2 border-ink px-3 text-[12px] text-ink'
                          : 'flex h-11 items-center gap-2 rounded-pill border border-hairline px-3 text-[12px] text-ink hover:border-ink/40'
                      }
                    >
                      <span
                        className="rounded-[4px] bg-page"
                        style={{ width: 18, height: 18 / Number(ratio.split('/')[0]) * Number(ratio.split('/')[1]) }}
                      />
                      {ratio}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="sticky bottom-0 z-20 -mx-1 rounded-[16px] border border-hairline bg-white/95 p-3 shadow-float backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-ink-muted">
                {dirty ? 'Unsaved changes.' : 'Changes go live when you save.'}
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href={`/${settings.handle}`}
                  target="_blank"
                  className="text-[12px] text-green-deep underline underline-offset-2 lg:hidden"
                >
                  View shop
                </Link>
                <PendingButton
                  pendingLabel="Saving…"
                  className="h-11 rounded-pill bg-green-main px-6 text-label text-ink disabled:opacity-50"
                >
                  Save changes
                </PendingButton>
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium uppercase tracking-wide text-ink-muted">Preview</p>
              <Link
                href={`/${settings.handle}`}
                target="_blank"
                className="text-[12px] text-green-deep underline underline-offset-2"
              >
                View shop
              </Link>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-hairline bg-white shadow-card" style={previewStyle}>
              <div className="relative">
                <div className="overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                  {showCover && coverPreview ? (
                    <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{ background: `linear-gradient(135deg, ${coverTint}, #ffffff 72%)` }}
                    />
                  )}
                </div>
                <div className="absolute -bottom-6 left-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white p-1 shadow-sm">
                  {showLogo && logoPreview ? (
                    <img src={logoPreview} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[17px] font-semibold text-green-deep">
                      {fields.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((word) => word[0]?.toUpperCase())
                        .join('') || 'S'}
                    </span>
                  )}
                </div>
              </div>

              <div className="px-4 pb-4 pt-9">
                <p className="truncate text-[24px] font-medium tracking-[-0.03em] text-ink">
                  {fields.name || 'Your shop'}
                </p>
                {fields.tagline ? (
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-muted">
                    {fields.tagline}
                  </p>
                ) : null}
                {fields.category || fields.location ? (
                  <p className="mt-1 text-[12px] text-ink-muted">
                    {[fields.category, fields.location].filter(Boolean).join(', ')}
                  </p>
                ) : null}

                <div className="mt-4 overflow-hidden rounded-[14px] border border-hairline">
                  <div
                    className="flex items-center justify-center bg-page text-[28px] text-ink/25"
                    style={{ aspectRatio: fields.cardImageRatio.replace('/', ' / ') }}
                  >
                    A
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-[12px] font-medium text-ink">Sample item</p>
                    <p className="text-[12px] text-ink">GH₵120</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-1.5">
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px]"
                    style={{ backgroundColor: tint, color: 'var(--ink)' }}
                  >
                    {fields.category || 'Category'}
                  </span>
                  <span className="rounded-full bg-page px-2.5 py-1 text-[11px] text-ink-muted">
                    sikatree.africa/{settings.handle}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-ink-muted">
              The preview uses the same accent tint and card ratio as your live page.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
