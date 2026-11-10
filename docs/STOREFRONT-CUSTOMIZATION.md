# Storefront customization

Status: Proposed. Version 1.0. 2026-11-10.

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
7. **Preview and reverse.** Every change is visible immediately and can be reset.
8. **Mobile first.** 360px is the design width. Fields stay at 16px to avoid iOS focus zoom.

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
| **Phase 1** | Brand fields, logo, links, accent, card ratio, live save | A vendor can make the shop recognisably theirs in ten minutes |
| **Phase 2** | Theme presets, cover and header layouts, announcement, featured items, about and policy sections, draft and publish | A shop can have a distinct look without losing the system |
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
| Brand | Category | Optional, up to 40 characters |
| Brand | Logo | Square image, up to 2MB, with alt text |
| Look | Accent | One of the existing allow-list keys |
| Look | Card image ratio | `1/1`, `4/5` or `5/4` |
| Links | Link buttons | Up to 8, ordered, show or hide |

Not in Phase 1: cover photo, announcement bar, themes, custom fonts, policies, featured items, custom domain.

### 5.2 Schema

Existing columns are reused: `vendors.name`, `bio`, `location`, `category`, `accent`, `card_image_ratio`.

```sql
-- 0025_storefront_customization.sql
alter table vendors
  add column if not exists tagline text,
  add column if not exists logo_url text,
  add column if not exists logo_alt text;

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
  `${vendorId}/brand/logo-${uuid}.${ext}`.
- Existing rows need no backfill. Null tagline, logo and links render exactly like today.
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
| Category | 40 characters or fewer, optional |
| Logo | JPG, PNG, WebP or AVIF, 2MB or less, at least 128 by 128. Square is recommended, not required |
| Logo alt | 120 characters or fewer. Defaults to "{shop name} logo" |
| Accent | Must be a key in `SHOP_ACCENTS` |
| Card ratio | `1/1`, `4/5` or `5/4` |
| Link count | 8 visible or hidden rows per vendor |
| Link label | 2 to 40 characters |
| Link URL | 300 characters or fewer, protocol checked per kind |
| Link kind | One of the allow-list values. One row per social, website, maps and phone |

URL rules:

| Kind | Accepted |
| --- | --- |
| WhatsApp | `https://wa.me/<8 to 15 digits>` |
| Instagram | `https://instagram.com/...` or `https://www.instagram.com/...` |
| TikTok | `https://tiktok.com/@...` or `https://www.tiktok.com/@...` |
| Snapchat | `https://snapchat.com/add/...` |
| Facebook | `https://facebook.com/...` or `https://www.facebook.com/...` |
| Website | Any `https://` URL |
| Maps | `https://maps.google.com/...`, `https://www.google.com/maps/...` or `https://goo.gl/maps/...` |
| Phone | `tel:` followed by 8 to 15 digits and an optional leading `+` |
| Custom | Any `https://` URL |

Reject `javascript:`, `data:`, `file:`, relative URLs and anything that is not `https` (except `tel:` and `wa.me`).
Server-side rate limit: 30 storefront saves per vendor per hour.

### 5.4 Editor

New route: `/dashboard/storefront`. Guarded by `requireVendor()`.

Entry points:

- A "Customize your shop" card on `/dashboard`, above Items.
- A link from `/dashboard/settings`.
- A link from the shop preview itself for the signed-in vendor is not needed in Phase 1.

Sections, each with its own Save button and inline result:

1. **Brand**
   - Shop name
   - Tagline
   - About
   - Location
   - Category
   - Logo: upload, preview in a 56px circle with `object-contain`, alt text, remove
2. **Links**
   - List of current links in order, each with a 32px icon, label and host
   - Show or hide, move up, move down, delete
   - Add link: kind picker (shared Dropdown), label, URL
   - Empty state: "Add WhatsApp, Instagram or your website."
3. **Look**
   - Accent swatches from `SHOP_ACCENTS`, each labelled and shown as the primary button fill
   - Card ratio: three visual choices with a sample tile
4. **Footer of the editor**
   - "View shop" link, always available
   - "Changes save immediately. Your shop updates as soon as you tap Save."

Interaction rules:

- `PendingButton` with "Saving…" for every save.
- Success: inline mint note and a toast ("Storefront updated.").
- Failure: inline error with the specific reason, input preserved, retry by saving again.
- Logo upload uses the same multipart form action pattern as the item editor.
- Mobile fields are 16px through the global rule.
- No autosave. Each section saves explicitly.

### 5.5 Storefront rendering

Data additions in `app/[handle]/page.tsx` and the shared types:

- `StorefrontVendor`: `tagline`, `logoUrl`, `logoAlt`, `links`.
- Links are fetched once with the vendor and ordered by `position`, filtered to `visible`.
- Item pages (`app/[handle]/i/[item]/page.tsx`) also read the logo and tagline.

Header changes:

- Avatar becomes a 56px white or mint circle with the logo inside, `object-contain`, 8px inner padding.
- No logo keeps the existing initials avatar.
- Tagline replaces the current bio line under the name when present. Bio moves to the Phase 2 about section; it is not
  shown in the header.
- Location and category line is unchanged.
- Copyable address chip and WhatsApp CTA are unchanged.
- The header still respects the 200px desktop and 260px mobile maximum.

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
- Cart behaviour stays as it is.

Open Graph:

- Phase 1 uses the logo as `og:image` only when it is at least 400 by 400. Otherwise it keeps the existing brand card.
- The title and description use the tagline when present.
- Item pages keep the item photo as their Open Graph image.
- Phase 2 replaces this with a generated per-shop card that composes the logo, name and accent.

Fallbacks:

- No logo: initials.
- No tagline: nothing, header height collapses.
- No links: no row.
- Broken or deleted logo URL: initials, with a server-side check that the URL is still a string.

### 5.6 Logo upload

- Reuse the Supabase Storage setup from item images.
- New helper `uploadVendorImage(vendorId, bytes, mime)` in `lib/vendor-assets.ts`, writing to
  `${vendorId}/brand/logo-${uuid}.${ext}`.
- Accept JPG, PNG, WebP and AVIF up to 2MB.
- Client-side check that the image is at least 128 by 128; warn when it is not square but allow it.
- Render with `object-contain`; never crop a wordmark.
- Alt text is required in the UI only when the logo is present. Default to "{shop name} logo" when blank.
- Replacing a logo leaves the old object in storage. Add a cleanup job in Phase 2; do not block Phase 1 on it.
- Delete the database URL on remove; do not delete the object immediately.

### 5.7 Actions and data layer

New server actions in `app/dashboard/storefront/actions.ts`:

- `saveBrandAction` (name, tagline, bio, location, category, logo, logo alt, accent, card ratio)
- `addLinkAction`
- `updateLinkAction`
- `deleteLinkAction`
- `moveLinkAction`

All return `{ ok?: true; error?: string }`, revalidate `/dashboard/storefront` and `/${handle}`, and are wrapped so an
unexpected failure returns a readable error instead of an application error. Use the same toast then refresh pattern as
the order actions.

New domain helpers in `lib/storefront.ts`:

- `getStorefrontSettings(vendorId)`
- `saveStorefrontSettings(vendorId, input)`
- `listVendorLinks(vendorId, options)`
- `createVendorLink`, `updateVendorLink`, `deleteVendorLink`, `moveVendorLink`
- `validateVendorLink(kind, url)` exported for unit tests.

The storefront is `force-dynamic`, so no cache invalidation is required for correctness, but `revalidatePath` keeps the
dashboard and any prefetched payload in step.

### 5.8 Tests

Unit:

- URL validation for every kind, including rejected protocols and wrong hosts.
- Accent fallback and ratio validation.
- Tagline and link label length.

Integration (`lib/storefront.integration.test.ts`):

- Save brand fields and read them back.
- Logo URL and alt persist; removal sets null.
- Add, reorder, hide and delete links.
- One link per social kind; custom links can repeat.
- Max 8 links.
- Invalid URL, invalid accent and invalid ratio are rejected.
- Existing vendors without settings keep working.

Browser smoke:

- 360px and 1440px: logo and initials fallback, tagline, links order and hiding, accent and card ratio.
- Item page uses the logo.
- Open Graph tags use the logo only when it qualifies.
- No horizontal overflow.
- Save, toast, view shop.

Budget:

- Landing page JS unchanged.
- Storefront adds no client JavaScript for themes; only the editor adds JS.

### 5.9 Acceptance checklist

- [ ] A vendor can upload a logo and see it in the header, sticky bar and item page.
- [ ] A vendor can set a tagline and see it under the shop name.
- [ ] Up to 8 links can be added, reordered, hidden and removed.
- [ ] Invalid links, accents and ratios are rejected with a clear message and preserved input.
- [ ] Changes are live on save, with an inline confirmation and a toast.
- [ ] A vendor with no customization sees exactly the current storefront.
- [ ] No buyer-side JavaScript is added by customization.
- [ ] The mobile page has no horizontal overflow at 360px.
- [ ] Every field is 16px on mobile.
- [ ] The landing performance budget still passes.

### 5.10 Rollout

1. Apply the migration. Existing shops are unchanged.
2. Ship the editor behind a dashboard link, visible to all vendors. No public surface changes until they save.
3. Update the vendor guide with "Customize your shop".
4. Test with three design partners: upload a real logo, add two links, check the share preview.
5. Watch support tickets and contrast or layout complaints for a week.

A feature flag is optional. The migration is additive and the UI is the only new surface, so an environment flag can gate
the dashboard card if needed.

## 6. Phase 2

### 6.1 Theme presets

Two or three presets, each a class that sets the existing `--shop-*` variables:

- **Classic** (current white and light grey)
- **Warm** (soft cream page, white cards, clay accent default)
- **Editorial** (larger name, tighter grid, serif accent on the shop name)

No free-form colours, no custom fonts, no dark mode yet. Every preset is checked at 4.5:1 and at 360px.

### 6.2 Structure

- Cover photo, 16:9, with focal point.
- Header layout: compact or cover.
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

- Generated per-shop Open Graph card with logo, name, accent and location.
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
- No free colour picker. Extend the accent allow-list instead.
- No custom checkout, payment, tracking or status styling.
- No external hotlinked images or fonts.
- No per-vendor JavaScript.
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
| Cover and header layouts | No | Yes |
| Announcement, featured, policies | No | Yes |
| Draft and publish | No | Yes |
| Custom domain | No | Yes |
| Hide powered-by | No | Yes |
| QR and generated share card | Basic | Custom |

Pricing is not part of this document. The gating above matches the Pro direction in `PLAN.md` section 16.

## 10. Metrics

- Share of live vendors with a logo, tagline or link within 7 days.
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
| Storage abuse | 2MB logo limit, per-vendor quota, content moderation |
| Vendor confusion | "Changes go live immediately" copy and View shop |

## 12. Decisions and recommendations

| Decision | Recommendation |
| --- | --- |
| Draft and publish in Phase 1 | **No.** Save live with clear copy. Add draft and publish in Phase 2 with sections and themes |
| Shop name editable | **Yes.** Display name can change; handle stays immutable |
| Logo crop | **No crop in Phase 1.** Square recommended, `object-contain` in a circle |
| Cover photo | **Phase 2.** Logo, tagline and links first |
| Link count | **Eight.** Enough for socials, website, maps and phone |
| One link per social | **Yes.** Unique except custom links |
| Themes | **Phase 2.** Accent and card ratio first |
| Open Graph | **Phase 1 logo only when 400 by 400 or larger**, else the brand card |
| Gating | Basics free; themes, domain and powered-by removal Pro |

## 13. Open questions

1. Should the vendor be able to hide the location and category entirely, or only clear them? Clearing is the same as
   hiding for now.
2. Should a custom link allow `mailto:`? Recommendation: yes, add a `mailto:` kind rather than a free protocol.
3. Is a 2MB logo limit enough for real vendor files? Most logos are under 500KB after export.
4. Can a vendor delete the logo and fall back to initials? Yes, that must be possible.
5. Who reviews reported logos and shop pages during the pilot? Probably the operator, manually.
6. Should Phase 1 ship to every vendor or only design partners first? Recommendation: design partners first, then all.

## 14. Build order for Phase 1

1. Migration `0025_storefront_customization.sql` and the link table.
2. `lib/storefront.ts` validation, reads and writes, with unit and integration tests.
3. Server actions and the editor route.
4. Storefront and item page rendering with fallbacks.
5. Logo upload through the existing storage path.
6. Open Graph tagline and logo rules.
7. Browser smoke at 360px and 1440px, plus the performance budget.
8. Vendor guide and dashboard entry.
9. Design partner review.
