# Storefront customization

Status: Proposed. Version 1.1. 2026-11-10.

Changelog: v1.1 adds cover and tint, starter defaults, client-side logo processing, a category dropdown, handle-based links, one-save editing with live preview and reset, generated Open Graph cards, and polish tokens.

Companion docs: [`DESIGN.md`](DESIGN.md) sections 5.8, 5.9 and 14, [`requirement.md`](requirement.md) PG-02 to PG-09, and [`PLAN.md`](PLAN.md) Phase 2 and Phase 3.

## 1. Why

A vendor's shop should feel like their shop. At the same time, buyers must be able to trust the page, checkout must stay
identical for every shop, and the page must stay fast on a weak phone. Customization is therefore **curated ownership**:

- The vendor owns their name, story, logo, links, colour and product content.
- sikatree owns the layout system, typography scale, checkout, order flow, trust marks, accessibility and performance.

The principle is **identity and content, not the machine**. A vendor choosing a logo and writing a tagline will do more
for trust and sales than a page builder. A free-form editor would multiply support, accessibility and performance risk
before the pilot proves demand.

## 2. Principles

1. **Curated choice beats infinite freedom.** Presets, allow-lists and validated fields.
2. **Defaults look finished.** A vendor who changes nothing still has a good page.
3. **Content before colour.** Logo, tagline, links and about text come before themes.
4. **Nothing ships without a fallback.** Missing logo falls back to initials; missing tagline collapses.
5. **No buyer-side JavaScript cost.** Themes are CSS variables; no per-vendor scripts or stylesheets.
6. **Checkout is sacred.** Customization never changes cart, checkout, payment, tracking or status colours.
7. **Preview and reverse.** The editor shows a live preview, and every section can be reset to defaults before saving.
8. **Mobile first.** 360px is the design width. Fields stay at 16px to avoid iOS focus zoom.
9. **Polish through tokens, not options.** One radius scale, one shadow set, one icon set and semantic tokens. Vendors choose content and presets, not implementation details.

## 3. Current state

Already in the database and rendered by the storefront:

- `vendors.bio`, `location`, `category`, `accent`, `card_image_ratio`.
- Six pre-tested accents in `lib/shop-accent.ts`, each with a 4.5:1 label colour.
- Card ratios `1/1`, `4/5`, `5/4`.
- Category order, item badges, item positions, item deep links and per-item Open Graph tags.
- The vendor header, sticky bar, cart, checkout and item page all read these values.

Missing today:

- No editor for any of the fields above.
- No logo, tagline, cover or announcement.
- No link buttons (PG-03).
- No preview or reset.
- The storefront has one layout.

The highest-return work is therefore to expose what already exists, then add a logo and links.

## 4. Scope

| Phase | Scope | Goal |
| --- | --- | --- |
| **Phase 1** | Brand fields, logo, cover, links, accent, card ratio, starter defaults, live preview, reset, generated Open Graph card, live save | A vendor can make the shop recognisably theirs in ten minutes, with a preview before saving |
| **Phase 2** | Theme presets, header layouts and cover focal point, announcement, featured items, about and policy sections, draft and publish | A shop can have a distinct look without losing the system |
| **Phase 3** | Custom domain, hide "Powered by Ostra", advanced themes, per-shop analytics | Pro revenue and a fully branded surface |

This document specifies Phase 1 completely and outlines the later phases.

## 5. Phase 1

### 5.1 What the vendor can change

| Group | Field | Notes |
| --- | --- | --- |
| Brand | Shop name | Display name, 2 to 80 characters. The URL handle stays immutable |
| Brand | Tagline | 2 to 80 characters, shown under the name |
| Brand | About | Existing `bio`, up to 500 characters |
| Brand | Location | Optional, up to 60 characters |
| Brand | Category | Optional fixed short list. Also suggests a default accent |
| Brand | Logo | Square image, processed to WebP, with alt text |
| Brand | Cover | Optional 16:9 image. Missing cover falls back to an accent gradient |
| Look | Accent | One of the existing allow-list keys. Derives a soft tint |
| Look | Card image ratio | `1/1`, `4/5` or `5/4` |
| Links | Link buttons | Up to 8. Vendor enters a handle, number or URL depending on kind; the server builds or validates it |

Not in Phase 1: announcement bar, themes, vendor-selected fonts, policies, featured items, header layouts, cover focal
point, custom domain.

### 5.2 Schema

Existing columns are reused: `vendors.name`, `bio`, `location`, `category`, `accent`, `card_image_ratio`.

```sql
-- 0025_storefront_customization.sql
alter table vendors
  add column if not exists tagline text,
  add column if not exists logo_url text,
  add column if not exists logo_alt text,
  add column if not exists logo_bg text not null default 'white'
    check (logo_bg in ('white', 'mint')),
  add column if not exists cover_url text,
  add column if not exists verified_at timestamptz;

create table if not exists vendor_links (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors (id) on delete cascade,
  kind text not null,
  label text not null,
  url text not null,
  position integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_links_kind_check check (kind in (
    'whatsapp', 'instagram', 'tiktok', 'snapchat', 'facebook',
    'website', 'maps', 'phone', 'custom'
  ))
);

create index if not exists vendor_links_vendor_idx
  on vendor_links (vendor_id, position);

-- One link per social channel, website, maps and phone. Custom links can repeat.
create unique index if not exists vendor_links_one_per_kind
  on vendor_links (vendor_id, kind)
  where kind <> 'custom';
```

Notes:

- No new bucket. Logo files go to the existing public storage bucket under
  `${vendorId}/brand/logo-${uuid}.${ext}`; covers use `${vendorId}/brand/cover-${uuid}.${ext}`.
- Existing rows need no backfill. Null tagline, logo, cover and links render exactly like today; `logo_bg` defaults to
  white.
- `verified_at` is set by admin only. The trust badge is hidden while it is null.
- Existing free-text categories are preserved. The editor shows an unknown value as **Other** and saves one of the fixed
  values on the next edit.
- No draft table in Phase 1. Saves go live immediately. Phase 2 adds draft and publish once there are sections and
  themes worth staging.

### 5.3 Validation

All values are trimmed and length-checked on the server, not only in the browser.

| Field | Rule |
| --- | --- |
| Name | 2 to 80 characters, plain text |
| Tagline | 2 to 80 characters, plain text |
| Bio | 500 characters or fewer |
| Location | 60 characters or fewer, optional |
| Category | One of the fixed list, optional. Legacy values outside it map to **Other** |
| Logo | Input JPG, PNG, WebP or AVIF, 2MB or less, at least 128 by 128. Stored WebP, max 512px, with the original as a decode-failure fallback |
| Logo alt | 120 characters or fewer. Defaults to "{shop name} logo" |
| Logo background | Not user input. Editor samples the corner and stores `white` or `mint`; fallback white |
| Cover | Input JPG, PNG, WebP or AVIF, 5MB or less. Stored WebP, max 1600px wide, 16:9, with the original as a decode-failure fallback |
| Accent | Must be a key in `SHOP_ACCENTS`. The tint is derived, never set |
| Card ratio | `1/1`, `4/5` or `5/4` |
| Link input | Handle, number or URL depending on kind, 300 characters or fewer. The server builds or validates the URL |
| Link URL | Built URL, 300 characters or fewer, host and protocol checked |
| Link count | 8 visible or hidden rows per vendor. One row per social, website, maps and phone |
| Link label | 2 to 40 characters |

Fixed category list and suggested accent:

| Category | Suggested accent |
| --- | --- |
| Beauty | rose |
| Fashion | ink |
| Food and drink | clay |
| Home | sage |
| Health | green |
| Services | green |
| Photography | ink |
| Arts and crafts | sand |
| Electronics | sage |
| Other | green |

The server builds the canonical URL before storing it:

| Kind | Vendor enters | Server stores |
| --- | --- | --- |
| WhatsApp | Phone number | `https://wa.me/<8 to 15 digits>` |
| Instagram | Handle, with or without `@` | `https://instagram.com/<handle>` |
| TikTok | Handle | `https://www.tiktok.com/@<handle>` |
| Snapchat | Handle | `https://www.snapchat.com/add/<handle>` |
| Facebook | Handle | `https://facebook.com/<handle>` |
| Phone | Number | `tel:+<digits>` |
| Website | Full URL | As entered, `https://` only |
| Maps | Full URL | As entered, `https://` only |
| Custom | Full URL | As entered, `https://` only |

The host and protocol checks below remain a safety net on the built URL:

| Kind | Accepted |
| --- | --- |
| WhatsApp | `https://wa.me/<digits>` |
| Instagram | `https://instagram.com/...` or `https://www.instagram.com/...` |
| TikTok | `https://tiktok.com/@...` or `https://www.tiktok.com/@...` |
| Snapchat | `https://snapchat.com/add/...` or `https://www.snapchat.com/add/...` |
| Facebook | `https://facebook.com/...` or `https://www.facebook.com/...` |
| Website | Any `https://` URL |
| Maps | `https://maps.google.com/...`, `https://www.google.com/maps/...` or `https://goo.gl/maps/...` |
| Phone | `tel:` followed by 8 to 15 digits and an optional leading `+` |
| Custom | Any `https://` URL |

Reject `javascript:`, `data:`, `file:`, relative URLs and anything that is not `https` (except `tel:` and `wa.me`).
Server-side rate limit: 30 storefront saves per vendor per hour. Logo input may be 2MB; the stored WebP is normally under
200KB.

### 5.4 Editor

New route: `/dashboard/storefront`. Guarded by `requireVendor()`.

Entry points:

- A "Customize your shop" card on `/dashboard`, above Items.
- A link from `/dashboard/settings`.

Starter defaults on the first visit, when the shop has no customization:

- Initials avatar, no logo.
- Accent suggested from the category (5.3).
- Placeholder rows for WhatsApp, Instagram and Website. They are examples and are not saved until edited.

Sections:

1. **Brand**
   - Shop name, tagline, about, location.
   - Category as a short Dropdown from the fixed list.
   - Logo: upload, client-side resize and WebP conversion, 56px circle preview using the sampled background, alt text,
     remove.
   - Cover: upload, 16:9 preview, gradient fallback, remove.
2. **Links**
   - Kind Dropdown, handle, number or URL input depending on kind, optional label.
   - The row shows the canonical URL the server will store.
   - List with icon, label and host, plus show or hide, move up, move down, delete and add.
   - Link operations save immediately with their own pending state, because they are list operations.
3. **Look**
   - Accent swatches from `SHOP_ACCENTS`, each shown with its derived tint.
   - Card ratio: three visual choices with a sample tile.

Single save:

- One sticky **Save changes** button for brand, look and cover.
- A dirty-state indicator ("Unsaved changes") appears when a field differs from the saved value.
- `PendingButton`, inline result and toast on success, preserved input and a specific error on failure.
- Links are outside this save; they save as list operations.

Preview:

- Desktop: a sticky, side-by-side mini header and sample product card that update as fields, logo, cover, accent and
  ratio change.
- Mobile: **View shop** instead of a second preview.
- The preview uses the same tokens, cover and gradient rules as the live page.

Reset:

- **Reset brand** clears tagline, about, location, category, logo, cover and logo alt. The shop name stays.
- **Reset look** returns the accent to green and the ratio to `1/1`.
- **Remove cover** clears only the cover.
- Reset marks the form dirty; the sticky Save persists it.

Interaction rules:

- No autosave.
- Copy: "Changes go live when you save."
- Mobile fields are 16px through the global rule.

### 5.5 Storefront rendering

Data additions in `app/[handle]/page.tsx` and the shared types:

- `StorefrontVendor`: `tagline`, `logoUrl`, `logoAlt`, `logoBg`, `coverUrl`, `links`, `verifiedAt`.
- Links are fetched once with the vendor, ordered by `position` and filtered to `visible`.
- Item pages (`app/[handle]/i/[item]/page.tsx`) also read the logo and tagline.

Header changes:

- The cover is the header card background, `object-cover`, 16:9 source, cropped to the card. A fixed scrim keeps the name
  and tagline at 4.5:1. No cover uses a soft gradient derived from the accent. The header still respects the 200px
  desktop and 260px mobile maximum.
- `--shop-tint` is the accent at about 8% over white. It paints the header fallback, pills and badges. Text on the tint
  is checked at 4.5:1.
- The logo is a 56px circle with an 8px inner padding and `object-contain`. The circle background is `logoBg`, white or
  mint. No logo keeps the initials avatar.
- The shop name uses the display font from 5.11. The tagline replaces the current bio line. Bio moves to the Phase 2 about
  section; it is not shown in the header.
- A quiet "Verified by sikatree" badge sits near the name only when `verifiedAt` is set. It is admin-controlled and
  never a vendor toggle.
- Location and category line, copyable address chip and WhatsApp CTA are unchanged.

Link buttons:

- A single row of 44px pills between the header and the toolbar, wrapping on mobile and desktop. It adds 16px above
  and 16px below, and `DESIGN.md` 14.1 is updated when it ships.
- Each pill has a 16px icon and a short label, with `rel="noreferrer"` and a new tab for external links.
- Two per row on mobile when labels fit, otherwise full width. A single link can be full width.
- Empty links render no section and no gap.
- Icon mapping: WhatsApp `MessageCircle`, Instagram `AtSign`, TikTok `Music` or a simple video glyph, Snapchat
  `Ghost`, Facebook `Facebook`, website `Globe`, maps `MapPin`, phone `Phone`, custom `ArrowUpRight`. Add the missing
  glyphs to `components/icons.tsx` in Phase 1; the current local set does not yet include all of them.
- This introduces a compact variant of the 5.9 link button. Record it in `DESIGN.md` when implemented.

Sticky bar:

- Uses the logo if present, otherwise initials, at 32px.
- It fades in on scroll with CSS only (5.11); the cart behaviour stays as it is.

Open Graph:

- A generated card route at `app/[handle]/opengraph-image.tsx` composes the logo, name, tagline, accent and location. It
  replaces the old logo-only rule.
- The route is cached and revalidated when the storefront is saved.
- Item pages keep the item photo as their Open Graph image.

Typography:

- The shop name uses the one self-hosted display font from 5.11 on the storefront, item page and generated card. Body
  copy keeps the current font.

Fallbacks:

- No logo: initials.
- No cover: accent gradient.
- No tagline: nothing, header height collapses.
- No links: no row.
- Broken or deleted logo or cover URL: initials and gradient, with a server-side check that the URL is a string.

### 5.6 Logo and cover upload

- Reuse the Supabase Storage setup from item images.
- New helper `uploadVendorImage(vendorId, kind, bytes, mime)` in `lib/vendor-assets.ts`, writing to
  `${vendorId}/brand/logo-${uuid}.${ext}` or `${vendorId}/brand/cover-${uuid}.${ext}`.
- Logo input accepts JPG, PNG, WebP and AVIF up to 2MB, at least 128 by 128. In the editor, resize to a maximum of 512px
  and convert to WebP before upload; the stored output is WebP. If the browser cannot decode the file, upload the
  original and keep the 2MB guard.
- The logo circle background is chosen in the editor by sampling the logo corner pixel. Transparent or dark corners get
  mint; light corners get white. If sampling is unavailable or ambiguous, fall back to white. Store the choice in
  `logo_bg`; buyer pages read the stored value and run no sampling code.
- Cover input accepts JPG, PNG, WebP and AVIF up to 5MB. Resize to a maximum of 1600px wide and convert to WebP, keeping a
  16:9 preview. If processing fails, upload the original and keep the guard.
- Render with `object-contain` for the logo and `object-cover` for the cover; never crop a wordmark.
- Alt text is required in the UI only when the logo is present. Default to "{shop name} logo" when blank. Cover alt
  defaults to "{shop name} cover".
- Replacing an image leaves the old object in storage. Add a cleanup job in Phase 2; do not block Phase 1 on it.
- Delete the database URL on remove; do not delete the object immediately. Removing the logo also resets `logo_bg` to
  white.

### 5.7 Actions and data layer

New server actions in `app/dashboard/storefront/actions.ts`:

- `saveStorefrontAction` (name, tagline, bio, location, category, logo, logo alt, logo background, cover, accent and
  card ratio) as one save for brand, look and cover.
- `addLinkAction`
- `updateLinkAction`
- `deleteLinkAction`
- `moveLinkAction`

Link actions stay separate because they are list operations and save immediately. Reset is a client-side operation that
clears the fields and marks the form dirty; the single save persists it.

All actions return `{ ok?: true; error?: string }`, revalidate `/dashboard/storefront`, `/${handle}` and the generated
Open Graph route, and are wrapped so an unexpected failure returns a readable error instead of an application error. Use
the same toast then refresh pattern as the order actions.

New domain helpers in `lib/storefront.ts`:

- `getStorefrontSettings(vendorId)`
- `saveStorefrontSettings(vendorId, input)`
- `listVendorLinks(vendorId, options)`
- `createVendorLink`, `updateVendorLink`, `deleteVendorLink`, `moveVendorLink`
- `buildVendorLinkUrl(kind, input)` exported for unit tests
- `validateVendorLink(kind, url)` exported for unit tests
- `suggestAccentForCategory(category)` for starter defaults

The storefront is `force-dynamic`, so no cache invalidation is required for correctness, but `revalidatePath` keeps the
dashboard, share card and any prefetched payload in step.

### 5.8 Tests

Unit:

- URL validation for every kind, including rejected protocols and wrong hosts.
- `buildVendorLinkUrl` for every kind: handle cleanup, `@` removal, phone digits, `wa.me`, `tel:`, and pass-through for
  website, maps and custom.
- Category list validation, legacy mapping and `suggestAccentForCategory`.
- Accent fallback, card ratio and tint contrast.
- Tagline, label and cover validation.
- Link count and one-per-kind rules.

Integration (`lib/storefront.integration.test.ts`):

- Save brand, look and cover in one `saveStorefrontAction`; read them back.
- Logo URL, alt and `logo_bg` persist; removal sets null.
- Cover persists and removal returns the gradient fallback.
- Reset brand and reset look persist nulls, green accent and `1/1`.
- Category saves only from the fixed list; an old free-text value maps to Other.
- Add, reorder, hide and delete links.
- One link per social kind; custom links can repeat.
- Max 8 links.
- Invalid URL, invalid accent and invalid ratio are rejected.
- Existing vendors without settings keep working.

Browser smoke:

- 360px and 1440px: cover or gradient fallback, logo circle background, tagline, links order and hiding, tint, accent and
  card ratio.
- The desktop live preview updates as fields and look change; the dirty indicator appears and reset clears a section.
- Single save shows the toast and preserves input on error.
- Item page uses the logo and tagline.
- The generated Open Graph route returns an image and reflects the saved accent and logo.
- Logo processing produces a WebP at 512px or less and falls back safely when decoding fails.
- No horizontal overflow.
- The display font is preloaded and within its file budget.

Budget:

- Landing page JS unchanged.
- Storefront adds no client JavaScript for themes; only the editor adds JS.
- The display font is a single WOFF2 under 30KB.
- The generated card route adds no buyer-side JavaScript.

### 5.9 Acceptance checklist

- [ ] A vendor can upload a cover and see it as the header background, or the accent gradient when none is set.
- [ ] A vendor can upload a logo and see it in the header, sticky bar, item page and generated card.
- [ ] The logo circle background is white or mint from the sampled corner, with white as the fallback.
- [ ] A vendor can set a tagline and see it under the shop name.
- [ ] Up to 8 links can be added from a handle, number or URL, reordered, hidden and removed.
- [ ] The category is chosen from the fixed list, and the suggested accent matches it.
- [ ] The accent tint is derived, reaches 4.5:1 for text on it, and cannot be vendor-set.
- [ ] The desktop live preview updates while editing; mobile has View shop.
- [ ] Reset brand and reset look clear a section and mark the form dirty.
- [ ] One sticky Save changes saves brand, look and cover, with a dirty indicator, inline result and toast.
- [ ] Invalid links, accents, ratios, categories and images are rejected with a clear message and preserved input.
- [ ] The generated Open Graph card route returns an image with the logo, name, tagline, accent and location.
- [ ] Logo processing stores a WebP at 512px or less, with a safe fallback when decoding fails.
- [ ] The verified badge appears only when an admin sets `verified_at`.
- [ ] Item pages keep the item photo as their share image.
- [ ] A vendor with no customization sees exactly the current storefront.
- [ ] No buyer-side JavaScript is added by customization.
- [ ] The display font is self-hosted, Latin subset, one weight, preloaded and within 30KB.
- [ ] The mobile page has no horizontal overflow at 360px.
- [ ] Every field is 16px on mobile.
- [ ] The landing performance budget still passes.

### 5.10 Rollout

1. Apply the migration. Existing shops are unchanged.
2. Ship the editor behind a dashboard link, visible to all vendors. No public surface changes until they save.
3. Update the vendor guide with "Customize your shop".
4. Test with three design partners: upload a real logo and cover, add two links, check the live preview, reset, and the
   generated share card.
5. Watch support tickets and contrast or layout complaints for a week.

A feature flag is optional. The migration is additive and the UI is the only new surface, so an environment flag can gate
the dashboard card if needed.

### 5.11 Polish foundations

These apply to the storefront and the editor preview.

- **Tokens:** one radius scale (`--r-panel`, `--r-card`, `--r-tile`, `--r-control`, `--r-inner`, `--r-pill`), one soft
  shadow set (`--shadow-card`, `--shadow-raised`), and semantic names (`--surface`, `--surface-muted`, `--text`,
  `--text-muted`, `--border`, `--accent`, `--accent-tint`) aliased to the current values. Dark mode stays out, but the
  names make it a later theme swap instead of a rewrite.
- **Press and hover:** every pill and card has a 150ms press at scale 0.98. Hover lift only on fine pointers, and none
  under reduced motion.
- **Images:** every item image reserves its aspect ratio and shows a tiny blur-up placeholder or skeleton. Never a blank
  white box, never a layout shift.
- **Sticky bar:** CSS-only fade and slide on scroll where supported, with a visible fallback and no added JavaScript. The
  current observer is replaced when this ships; flag the `DESIGN.md` change.
- **Icons:** one local set, one stroke width (1.75) and two sizes (16 and 20). No mixed icon libraries.
- **Trust badge:** quiet "Verified by sikatree" pill near the shop name, shown only when `verifiedAt` is set. It is not a
  vendor toggle and not a paid feature in Phase 1.
- **Display font:** **Playfair Display 500 roman**, self-hosted as one Latin-subset WOFF2, preloaded with
  `next/font/local`, used for shop names on the storefront, item page and generated card. Target under 30KB. The existing
  italic 400 stays for accent words and body copy keeps Inter Tight. No vendor font choice.
- **Performance:** the display font is added to the font line in `PERFORMANCE.md`. None of these polish items may add
  buyer-side JavaScript.
- **Dark mode:** out of scope. Semantic tokens are ready for it later.

Record the token names, display font, radius and shadow scale in `DESIGN.md`, and the font file in `PERFORMANCE.md`, before
implementation.

## 6. Phase 2

### 6.1 Theme presets

Two or three presets, each a class that sets the existing `--shop-*` variables:

- **Classic** (current white and light grey)
- **Warm** (soft cream page, white cards, clay accent default)
- **Editorial** (larger name, tighter grid, serif accent on the shop name)

No free-form colours, no custom fonts, no dark mode yet. Every preset is checked at 4.5:1 and at 360px.

### 6.2 Structure

- Cover focal point and header layouts: compact or cover.
- Announcement bar, 80 characters, dismissible, no countdown.
- Featured items section.
- About section and two policy blocks: delivery and returns.
- Link button style: icon row or full-width.

### 6.3 Draft and publish

- `vendor_page_draft` and `vendor_page_published` JSON settings, or draft columns beside the published ones.
- `Preview` with a signed token, `Publish`, `Discard`, and a last-published timestamp.
- Version history limited to the last 10 publishes.
- Because sections and themes are now larger changes, live editing is no longer acceptable.

### 6.4 Sharing

- QR code for the shop and for items.
- Share message uses the tagline.

## 7. Phase 3

- Custom domain: verification, SSL, fallback to the handle path, one domain per Pro shop.
- Hide "Powered by Ostra" on Pro.
- Advanced themes and an analytics panel for the vendor.
- Possibly curated font pairings, only if they do not add network cost. Custom CSS and custom fonts stay out.

## 8. Guardrails and non-goals

Non-negotiable:

- No arbitrary CSS, HTML or JavaScript from vendors.
- No free colour picker. Extend the accent allow-list instead. The accent tint is derived from the allowed accent and
  is never vendor-set.
- No custom checkout, payment, tracking or status styling.
- No external hotlinked images. No vendor-supplied fonts or custom CSS.
- No per-vendor JavaScript.
- No vendor toggle for the verified badge; verification is admin-set.
- No vendor page that hides the sikatree trust footer until a paid plan explicitly allows it.
- No customization that breaks the 360px layout, contrast or the performance budget.
- No free-form page builder. Fixed sections only.

## 9. Free and Pro

| Capability | Free | Pro |
| --- | --- | --- |
| Name, tagline, bio, location, category | Yes | Yes |
| Logo | Yes | Yes |
| Links | Up to 8 | Yes |
| Accent and card ratio | Yes | Yes |
| Theme presets | Classic only | All |
| Cover photo (basic 16:9) | Yes | Yes |
| Header layouts | No | Yes |
| Announcement, featured, policies | No | Yes |
| Draft and publish | No | Yes |
| Custom domain | No | Yes |
| Hide powered-by | No | Yes |
| Generated Open Graph card | Yes | Yes |
| QR code | No | Yes |

Pricing is not part of this document. The gating above matches the Pro direction in `PLAN.md` section 16.

## 10. Metrics

- Share of live vendors with a logo, tagline or link within 7 days.
- Share of live vendors with a cover within 7 days.
- Share of shop shares whose preview is served by the generated card.
- Share of vendors who save the editor twice within 30 days.
- Storefront conversion for customized versus default shops, once there are orders.
- Support tickets per vendor related to customization.
- Contrast or layout failures found in review.
- Landing and storefront performance before and after.

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Ugly or broken logos | Square recommendation, contain, preview, fallback, support reset |
| Link phishing or impersonation | Host checks for socials, https only, report and takedown |
| Contrast failures | Accent allow-list only, no free colour |
| Slow storefront | CSS variables, no per-vendor JS, compressed images, budget |
| Support load | Limited fields, defaults, no page builder |
| Half-finished live pages | Phase 1 fields are small and reversible; Phase 2 adds draft and publish |
| Storage abuse | 2MB logo and 5MB cover input limits, processed output, per-vendor quota, content moderation |
| Logo background sampling edge cases | White fallback when canvas is unavailable or the corner is ambiguous; store `logo_bg` so buyer pages do not sample |
| Vendor confusion | "Changes go live immediately" copy and View shop |

## 12. Decisions and recommendations

| Decision | Recommendation |
| --- | --- |
| Draft and publish in Phase 1 | **No.** One save goes live with clear copy. Phase 2 adds draft and publish |
| Single save | **Yes.** One sticky Save for brand, look and cover; links save immediately as list operations |
| Shop name editable | **Yes.** Display name can change; handle stays immutable |
| Logo crop | **No crop in Phase 1.** Square recommended, `object-contain` in a circle, client resized to 512px WebP |
| Logo circle background | **Sampled in the editor**, white or mint, white fallback, stored in `logo_bg` |
| Cover photo | **Phase 1, basic 16:9.** Focal point and header layouts in Phase 2 |
| Category | **Fixed list.** Unknown legacy values map to Other |
| Link count | **Eight.** Enough for socials, website, maps and phone |
| One link per social | **Yes.** Unique except custom links |
| Themes | **Phase 2.** Accent and card ratio first |
| Open Graph | **Phase 1 generated card.** Item pages keep the item photo |
| Accent tint | **Derived only.** Never vendor-set |
| Display font | **One self-hosted font, no vendor choice** |
| Verified badge | **Admin-set.** Hidden until `verifiedAt`, not a paid feature in Phase 1 |
| Gating | Basics free; themes, header layouts, domain and powered-by removal Pro |

## 13. Open questions

1. Should a custom link allow `mailto:`, or should email be a separate kind?
2. Who reviews reported logos, covers and shop pages during the pilot, and how fast?
3. Should Phase 1 ship to every vendor or only design partners first? Recommendation: design partners first.

## 14. Build order for Phase 1

1. Migration (tagline, logo, cover, links) and `lib/storefront.ts` with tests.
2. Handle-to-URL link building.
3. Header with cover or gradient fallback, accent tint and sticky bar.
4. Single-save editor with live preview and reset.
5. Logo and cover upload with client-side processing.
6. Generated Open Graph card.
7. Browser smoke at 360px and 1440px, plus the performance budget.
8. Vendor guide, dashboard entry and design partner review.
