# DESIGN.md: sikatree Design Language

Status: Binding. Version 0.5 (draft)
Date: 2026-11-05
Applies to: the sikatree landing page and waitlist (Sections 1 to 13), the public storefront and checkout (Section 14), the vendor PWA and admin (Section 15), and WhatsApp message design (Section 16).
Companion docs: `requirement.md`, `PLAN.md`
Parent brand: Ostra. Minor accents only (Section 1 and Section 7).
Reference: Dribbble shot "Capture Photography Portfolio Website Design" by Tanvir for Yscale Studio (https://dribbble.com/shots/27649892-Capture-Photography-Portfolio-Website-Design), three screenshots. It sets the landing page direction. The earlier order timeline, order success card and product grid references still drive Sections 5 and 14. The earlier tilted floating-tile hero reference is superseded. Section 9 overrides every reference.

Version 0.5 records the shipped storefront cart, checkout and success patterns, compact control radii, and a stricter motion system: nothing appears or moves abruptly.

---

## 0. How to use this file (rules for the building agent)

- **MUST** and **MUST NOT** are binding. **SHOULD** is a strong default. Any deviation needs an explicit written note in the PR.
- Only use the tokens in Section 3. Do not invent colors, radii, shadows, fonts or font sizes.
- This file defines look and structure. Copy and claims are governed by Section 9, which overrides the reference wherever they conflict.
- Colors were sampled and sizes measured from the screenshots, so they are approximations. Once adopted here they are the source of truth. Do not "correct" them against the Dribbble image later.
- The reference's typefaces are not published. Section 3.3 records the closest free matches, chosen by eye. If the originals are identified, change 3.3 only.
- Items marked **(inferred)** were not visible in the screenshots and follow the style's logic. Items marked **(proposed)** are new decisions awaiting owner confirmation. Treat both as binding until changed.
- Sections 1 to 13 define the system and the landing page. Sections 14 to 16 extend it per surface and win over 1 to 13 where they conflict.
- **Nothing appears abruptly.** Every conditional element enters and exits under Section 8. A control that pops into place, jumps the layout or changes state in one frame is a bug. This applies to every surface: landing, waitlist, storefront, dashboard and admin.
- No em-dashes in any copy, comments or documentation.

---

## 1. Aesthetic summary (the one-paragraph brief)

Editorial and gallery-like. A light grey page with white cards, and a few large rounded panels inset from the screen edge: a photo hero, one near-black panel, a near-black footer. A floating black pill nav. A huge lowercase wordmark. Headlines in a tight, medium-weight sans, with one to three words swapped into an italic serif for contrast. Vendor photos and small app illustrations carry the page, so visitors see both the work and the product. One borrowed brand hue, Ostra mint green, appears only on the primary button, focus rings and small status accents.

Keywords: editorial, gallery, rounded panels, black pill nav, grey and white, italic accents, local.

### Parent brand accents (Ostra)

sikatree is a product of Ostra. Borrow these and nothing else:

1. **Mint green** for the primary button, focus rings and small Paid or Confirmed accents.
2. **Bold lowercase wordmark.** `sikatree` is set in the sans at weight 600, echoing Ostra's lowercase wordmark.
3. **Pearl and Shell mark**, small, in the spots listed in Section 7.
4. **Ostra ink** `#10111F` in place of pure black for text (proposed).

Do not copy the Ostra hero layout, cream colorwash, Plus Jakarta Sans, mint gradients or the green feature-card treatment. Those stay Ostra's.

---

## 2. Design principles

1. **The vendor's content is the hero.** Photos get the most space and the strongest contrast. Chrome, labels and borders stay quiet. Even a vendor with 4 items should look like a curated collection.
2. **Show the app.** Small illustrations built from the real components (chat, storefront, MoMo prompt, order tracking) let a visitor feel the product before they join.
3. **Editorial, not corporate.** Medium-weight tight sans, italic serif accents, big statements, generous space.
4. **Panels and large radii.** Hero, dark section and footer are rounded panels inset from the edge. Cards and tiles are rounded generously.
5. **Fast on weak phones.** Every visual idea has a lightweight fallback. Beauty must not cost data.
6. **Trust through clarity.** Prices in GH₵, visible order codes, obvious payment status, plain words.
7. **Local, not generic.** MoMo, GH₵, Ghanaian places and products in every example. No `$`, no Apple Pay.
8. **Nothing pops.** Motion is quiet and continuous. Elements fade and move a few pixels into place, exits finish before removal, and space is reserved so the layout never jumps. Section 8 is binding.

---

## 3. Tokens

### 3.1 Color

```css
:root {
  /* Surfaces */
  --bg-page: #f1f1f1; /* page canvas (sampled from the reference) */
  --surface-white: #ffffff; /* cards, FAQ rows, floating controls */
  --surface-soft: #f1f1f1; /* input fill inside white cards, skeletons */
  --tile: #ffffff; /* image tiles on the page canvas */
  --bg-dark: #0a0a0a; /* nav pill, dark panels, footer */
  --sage: #a5aeab; /* hero backdrop and photo tint */

  /* Ink */
  --ink: #10111f; /* headings, text, ink buttons (proposed, replaces #111111) */
  --ink-muted: #6b6b6b; /* secondary text, timestamps */
  --ink-on-dark: #ffffff;
  --ink-on-dark-muted: #a3a3a3;

  /* Brand green (borrowed from Ostra) */
  --green-main: #3fa55c; /* primary button fill, check icons */
  --green-deep: #1f7a45; /* focus ring, links, small green text, success text */
  --green-mark: #6dbe58; /* Ostra pearl only */
  --mint-100: #ddf3e5; /* success tint, icon circles, chat bubble */

  /* Status */
  --warn-bg: #fcf1c8;
  --warn-edge: #f2b632; /* also testimonial stars */
  --warn-text: #b8700e; /* never for text under 18px; use --ink instead */
  --danger: #b3261e;
  --danger-bg: #fdecec;

  /* Lines and overlays */
  --hairline: #e2e2df;
  --hairline-dark: rgba(255, 255, 255, 0.14);
  --glass-bg: rgba(255, 255, 255, 0.14); /* hero glass card only */
  --glass-border: rgba(255, 255, 255, 0.22);
  --scrim: rgba(16, 17, 31, 0.4); /* modal and sheet backdrop */
}
```

Usage rules:

- **Primary button:** `--green-main` fill with an `--ink` label (6.0:1). White on `--green-main` is 3.1:1 and MUST NOT be used for text. On dark panels, photos and the nav pill use the Inverse button (white fill, `--ink` label).
- **Success** reuses green: `--mint-100` background, `--green-deep` text. **Info** is neutral. **Links:** `--green-deep`, underlined. No blue anywhere.
- **Focus ring:** 2px `--green-deep`, 2px offset. On dark surfaces the ring is `--ink-on-dark`.
- `--sage` is a backdrop and tint only. It never carries text.
- Dark surfaces are limited to the nav pill, the "Made for" panel (6.4) and the footer panel (5.15).
- Removed from v0.2: `--success`, `--info`, the old `--warning` and the old `--danger` (`#D64545`).

**Vendor accent (optional).** Vendors may pick one accent from a fixed set of 8 to 10 muted colors (sand, sage, clay, ink blue, rose, charcoal and similar) defined in config. The set is pre-checked so the button label (`--ink` or white) reaches 4.5:1. The accent colors only: the primary button fill, link highlights and small badges on that vendor's page. Never panels or backgrounds. Status colors are never overridden.

### 3.2 Gradients and masks

No gradients on surfaces. Two exceptions: the blurred LQIP placeholder, and the hero scrim that keeps white text readable on a photo.

```css
--hero-scrim: linear-gradient(180deg, rgba(10, 10, 10, 0.25) 0%, rgba(10, 10, 10, 0.55) 100%);
```

The scrim MUST reach at least 40% black wherever text sits (white text on `--sage` alone is 2.3:1; at 40% it is 5.3:1). Check each approved hero photo.

### 3.3 Typography

**Typefaces (matched by eye from the reference, not confirmed):**

| Role                | Family                   | Source                  | Weights    | Fallback                                |
| ------------------- | ------------------------ | ----------------------- | ---------- | --------------------------------------- |
| Sans (everything)   | **Inter Tight**          | Google Fonts, SIL OFL   | 400, 500, 600 | `Inter, ui-sans-serif, system-ui, sans-serif` |
| Accent serif        | **Playfair Display**, italic only | Google Fonts, SIL OFL | 400 italic | `Georgia, "Times New Roman", serif`     |

What the screenshots show:

- **Sans:** a tight neo-grotesk with a double-story `a`, single-story `g` and slanted terminals. Headings read as weight 500 with strong negative tracking (about -0.04em at large sizes). The wordmark reads as weight 600, lowercase.
- **Accent serif:** a high-contrast italic with calligraphic `p` and `t`. It sits inside sans sentences, set slightly larger than the sans (about 1.08em), same color, weight 400.
- Load both through `next/font`, self-hosted WOFF2, `display: swap`, Latin subset. Load Playfair Display for italic 400 only.
- Geist (v0.3) is retired.

**Accent rule:** 1 to 3 words per heading or statement go in the accent serif, usually the emotional or key word. Never on prices, numbers, GH₵, Twi text or button labels, and never below 18px. Not used in body copy, tables or data screens. The accent is allowed on landing headings, statements, empty states and the vendor Home greeting.

**Glyph risk:** confirm that both fonts carry ɛ, ɔ, Ɛ, Ɔ and ₵ (U+20B5) in the shipped subset. If one does not, bundle a matching fallback so weight and shape stay consistent.

| Role                        | Mobile (size / line) | Desktop (size / line) | Weight | Tracking | Color        |
| --------------------------- | -------------------- | --------------------- | ------ | -------- | ------------ |
| Wordmark (nav)              | 22 / 24              | 22 / 24               | 600    | -0.03em  | --ink-on-dark |
| Display (hero)              | 40 / 42              | 64 / 64               | 500    | -0.04em  | --ink-on-dark (on photo) |
| Statement                   | 26 / 32              | 44 / 48               | 500    | -0.035em | --ink        |
| H1                          | 32 / 36              | 48 / 52               | 500    | -0.035em | --ink        |
| H2                          | 28 / 32              | 36 / 40               | 500    | -0.03em  | --ink        |
| List title (index list)     | 24 / 28              | 32 / 36               | 500    | -0.03em  | --ink-on-dark |
| H3 / card title             | 18 / 24              | 20 / 28               | 500    | -0.02em  | --ink        |
| Lead (subhead)              | 16 / 24              | 18 / 28               | 400    | 0        | --ink-muted  |
| Body                        | 16 / 24              | 16 / 26               | 400    | 0        | --ink        |
| Small / helper / caption    | 14 / 20              | 14 / 20               | 400    | 0        | --ink-muted  |
| Label (field, nav link, eyebrow) | 15 / 20         | 15 / 20               | 500    | 0        | --ink        |
| Button                      | 16 / 20              | 16 / 20               | 500    | 0        | per variant  |
| Price                       | 16 / 20              | 18 / 24               | 500    | 0        | --ink        |
| Stat number                 | 36 / 40              | 44 / 48               | 500    | -0.03em  | --ink        |
| Index number ("[01]")       | 12 / 16              | 12 / 16               | 500    | 0        | --ink-muted  |
| Badge                       | 13 / 18              | 13 / 18               | 600    | 0        | per variant  |
| Bottom nav label            | 12 / 16              | 12 / 16               | 500    | 0        | per variant  |
| Footer wordmark             | clamp(96px, 22vw, 320px), line 0.8 | same     | 600    | -0.05em  | --ink-on-dark |

Rules:

- **Sentence case everywhere**: headings, buttons, labels, badges, tabs. No uppercase headings, no letter-spaced all-caps. The reference's "ADD TO BAG +" becomes a white plus circle (5.6).
- Italic is allowed only for the accent serif.
- `font-variant-numeric: tabular-nums` on prices, order codes and timestamps.
- Inputs are 16px or larger (prevents iOS zoom). Body text never below 14px, except index numbers and bottom nav labels (12px) and badges (13px).

### 3.4 Spacing

Base unit 4px. Allowed scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96.

- Section vertical padding: **96px desktop**, 64px mobile.
- Section heading block to content: **48px**. Heading to subtext: 16px.
- Grid gap: 16px for bento and FAQ rows, **24px mobile and 32px desktop** for tile grids.
- Card padding: 24px (20px mobile).
- Page side padding (the inset around panels): 16px mobile, 24px tablet and up.
- Field gap: 20px.

### 3.5 Radius

| Token      | Value | Use                                                        |
| ---------- | ----- | ---------------------------------------------------------- |
| --r-pill   | 999px | buttons, chips, badges, nav pill, circles                  |
| --r-panel  | 32px (24px mobile) | hero panel, dark panel, footer panel           |
| --r-tile   | 28px  | product tiles, gallery tiles, bento image tiles            |
| --r-card   | 24px  | cards, success card, modals, sheets (top corners), glass card |
| --r-product | 20px | storefront product cards                                   |
| --r-inner  | 16px  | inputs, alerts, FAQ rows, small images, index preview      |
| --r-control | 12px | compact action buttons, segmented controls, checkout buttons |
| --r-chip   | 10px  | category and filter chips                                  |

No radius under 16px on cards, tiles or inputs. Compact controls use `--r-control` 12px or `--r-chip` 10px. Circles and pills stay 999px. This exception was added in 0.5 for the storefront cart and checkout.

### 3.6 Shadows and borders

- Default surfaces: **no shadow and no border**. White cards on the grey page separate by color. Use a 1px `--hairline` only for dividers and for white surfaces on white.
- `--shadow-card: 0 8px 24px rgba(16,17,31,0.06)`: order success card, toasts, popovers.
- `--shadow-float: 0 12px 32px rgba(16,17,31,0.10)`: modals and the app illustration frame.

### 3.7 Dark mode (reserved)

v1 ships a light page (proposed). The dark panels are a design choice, not dark mode. Values kept for a later release; status colors and `--mint-100` need dark variants first.

| Token           | Dark      |
| --------------- | --------- |
| --bg-page       | `#0e0e0e` |
| --surface-white | `#171717` |
| --tile          | `#1e1e1e` |
| --ink           | `#f5f5f4` |
| --ink-muted     | `#a3a3a3` |
| --hairline      | `#2a2a2a` |
| --green-main    | `#3ccb6b` |
| --danger        | `#f06a6a` |
| --warn-text     | `#e8b04a` |

---

## 4. Layout

- **Containers:** landing and storefront content max-width **1120px** (16px side padding mobile, 24px from tablet up), vendor PWA and admin **960px**. All centered.
- **Panels:** the hero, the "Made for" list and the footer are rounded panels (`--r-panel`) inset from the viewport by the page side padding, max-width 1360px. Content inside a panel follows the 1120px container. No edge-to-edge colored sections, no diagonal or wavy dividers.
- **Page canvas:** `--bg-page` with white cards. No other section backgrounds.
- **Section headers:** two patterns from the reference. Split: eyebrow left (25%), content right (75%). Centered: H2 plus optional pill button.
- **Grids:**
  - Product and gallery tiles: 2 columns below 640px, 3 columns from 640px (proposed).
  - Bento grid: 1 column on mobile, 2 from 640px, 4 from 900px. Cards span 1 or 2 columns, row height 220px (proposed).
- **Breakpoints:** 640, 900, 1200 (proposed). Design baseline is 360px. Below 900px every multi-column layout becomes a single column except tile grids.

---

## 5. Components

### 5.1 Navigation (floating pill)

- A black pill (`--bg-dark`, `--r-pill`, no shadow), 56px tall, floating 16px from the top of the viewport and sticky while scrolling. Desktop: centered, max-width 640px, padding 0 8px 0 24px.
- Left: `sikatree` wordmark (3.3). Center: 3 anchor links (How it works, Made for, FAQ), 15px medium, white at 90%, hover white. Right: Inverse pill "Join the waitlist" (44px high).
- Mobile: the pill spans the width minus the page padding, wordmark left, a 44px menu icon button right. The menu opens a sheet (radius `--r-card`, `--bg-dark`) with the links and the Inverse CTA. Focus trap, Esc closes.
- On the hero it sits on the photo, inside the panel. No other nav background, border or blur is used.

### 5.2 Buttons

Primary, Inverse, Secondary and Ghost are pills. Compact action buttons in checkout use `--r-control` 12px. Label 16px, weight 500.

| Variant     | Background     | Text    | Border         | Height | Padding |
| ----------- | -------------- | ------- | -------------- | ------ | ------- |
| Primary     | --green-main   | --ink   | none           | 48px   | 0 28px  |
| Inverse     | #fff           | --ink   | none           | 48px (44px in nav) | 0 28px |
| Secondary   | #fff           | --ink   | none on `--bg-page`, 1px --hairline on white | 48px | 0 28px |
| Ghost       | transparent    | --ink (`--ink-on-dark` on dark) | none, underline on hover | 44px | 0 16px |
| Compact action | --ink        | #fff    | none           | 48px   | 0 24px, radius --r-control, spring press |
| WhatsApp    | #fff           | --ink   | none on `--bg-page`, 1px --hairline on white | 48px | 0 28px, WhatsApp glyph in `--ink`, not brand green |

- One Primary per screen. The same action repeated (nav Inverse and hero Primary "Join the waitlist") counts as one.
- Use Inverse on `--bg-dark`, on `--sage` and on photos. Use Primary on the light canvas and in the hero.
- Disabled: `--hairline` fill, `--ink-muted` text, no hover, `aria-disabled="true"`.
- Loading: spinner replaces the label, width fixed, `aria-busy="true"`, clicks ignored.
- Hover: lifts 1px, 150ms. Press: scale 0.98, or 0.96 with the spring for compact actions. Focus per 3.1. Motion follows Section 8.
- Mobile forms: buttons full width, Primary first.

### 5.3 Inputs and forms

- Height 52px, padding 0 16px, radius `--r-inner`, 16px text, fill `--surface-soft`, 1px `--hairline` border. Focus: border `--green-main` plus the focus ring.
- Compact checkout fields use `--r-control` 12px and 44 to 48px height. Standard forms keep `--r-inner`.
- Label above (15px medium), always visible, never placeholder-only. Helper or error below, 14px. Placeholders show example values only.
- Phone field: fixed `+233` prefix, number formatting, numeric keyboard (`inputmode="tel"`). Set `autocomplete` and `enterkeyhint` on every field.
- Validate inline on blur and on submit. Error: border `--danger`, message 14px `--danger` with a 16px alert-circle icon, plain language, `aria-invalid="true"` and `aria-describedby`.
- Disabled: `--hairline` fill, `--ink-muted` text.

### 5.4 Chips and badges

- **Choice chip** (interactive: category filters, MoMo network, option pickers): 44px high, `--r-chip` 10px, white, 1px `--hairline`, 15px medium. Selected: `--ink` fill, white text. Colour changes over 200ms and the size never changes. Category chips sit in one horizontal scroll-snap row with no visible scrollbar.
- **Status badge** (display only): 28px high, padding 0 12px, pill, 13px semibold. Always shows text, never color alone.

| Status           | Background       | Text                                   |
| ---------------- | ---------------- | -------------------------------------- |
| Paid             | --green-deep     | #fff                                   |
| Confirmed        | --mint-100       | --green-deep                           |
| Pending          | --warn-bg        | --ink, with an 8px `--warn-edge` dot   |
| Failed, Cancelled | --danger-bg     | --danger                               |
| Refunded         | --surface-soft   | --ink                                  |
| Sold out         | --surface-soft   | --ink-muted                            |

- **Verification badge:** 20px `--green-deep` circle with a white check.
- Low stock is a caption, "Only 2 left", in `--danger` at 11px. The storefront never shows an exact count above 5. The dashboard may show "In stock (n)" and "Low stock (n)".

### 5.5 Icons

Lucide only. 1.75px stroke, rounded caps and joins, no fills. 20px inline, 24px in navigation. Icons stay secondary to text.

- **Success circle:** 56px `--mint-100` circle with a 28px `--green-deep` check.
- **Feature circle:** 56px `--mint-100` circle with a 24px `--green-deep` icon (proposed).
- Internal links use a chevron. The up-right arrow means "leaves sikatree" (external links) (proposed).

### 5.6 Product tile

```
+--------------------------+
|                          |   white card, 1px --hairline, --r-product
|      product image       |   1:1 box, cover, radius 14
|  [Enquire]         (+)   |   pill left, 36px circle right
+--------------------------+
 Vitamin C serum     GH₵120  title 14/16 semibold, price tabular
 Only 3 left                 stock caption 11px, --danger
```

- Compact padding is 8px mobile and 10px desktop on product cards only. The image box is 1:1 by default. A store may set `--card-image-ratio` to 1/1, 4/5 or 5/4. Use `object-fit: cover` and centre or the product focal point. Never size the box from the image's intrinsic height.
- The whole card is one link to the WhatsApp enquiry with the prefilled message "Hi, I'm interested in {name} ({price}). Is it available?". The name carries a stretched link, and the badge and actions sit above it.
- Enquire is a small white pill bottom-left. Add is a 36px white circle with a plus bottom-right. On hover devices both appear on hover and focus, following Section 8. On touch Add is always visible and Enquire is hidden because the card link opens the enquiry.
- Price is shown on every tile. Compare-at prices are struck through. Stock rules: 0 shows a Sold out overlay and a desaturated image; 1 to 5 shows "Only n left"; above 5 shows nothing.
- Optional badge top-left: translucent pill with Discount, Popular or New.
- Cards in a row are equal height: flex column, body flex 1, price row `margin-top: auto`. A card is never taller than 1.45x its width on mobile.
- Hover and focus: 3px lift, image zoom or second-image crossfade, name underline, badge nudge and description scrim. Touch: two-line description under the price, no scrim. Full motion in 8.3.

### 5.7 Gallery tile

The product tile without the action pill. Tap opens a full-screen swipeable lightbox. Optional caption and a "Book this look" link that preselects the related service. Portfolio ratio 4:5 or 3:4.

### 5.8 Vendor header

Compact white card, radius 28px mobile and 32px desktop, 1px `--hairline`, padding 20px mobile and 28px desktop. Maximum height 200px on desktop and 260px on mobile.

- Row: 56px initials avatar (`--mint-100` fill, `--green-deep` text), store name in `clamp(28px, 4vw, 44px)`, weight 500, letter-spacing -0.03em, tagline in `--ink-muted` clamped to 2 lines, location and category line at 14px `--ink-muted`.
- Address chip `sikatree.africa/{handle}` in a soft pill with a copy button. Copy writes the full https URL, shows Copied for 1.5s and announces through `aria-live="polite"`.
- CTA "Chat on WhatsApp" uses the Primary style, right aligned at 768px and above and full width below. The prefilled message is "Hi {store}, I found you on sikatree." 
- No standalone sikatree wordmark and no Powered by line in the header. Those belong in the footer.
- After the header leaves the viewport, a 56px sticky bar shows the store name on the left and the cart plus CTA on the right. The CTA is icon-only under 400px. Motion follows Section 8.

### 5.9 Link button

Full-width pill, 52px, 1px `--hairline` border, icon left, label centered, trailing chevron (internal) or up-right arrow (external). Used for "View catalogue", "Book a session" and external links.

### 5.10 Status stepper

Vertical on all breakpoints. Nodes are 24px circles on a 2px connector.

- **Done:** `--ink` filled circle with a white check. Connector segment `--ink`.
- **Current:** `--ink` ring with a soft pulse (motion rules in Section 8) and a medium-weight title.
- **Pending:** hollow `--hairline` circle, `--ink-muted` text. Connector `--hairline`.
- Each step shows a title and a timestamp. Future steps show "Estimated" or no time.

### 5.11 Order success card

Ticket-style, centred, max-width 520px, white card, `--r-card`, 1px `--hairline`, `--shadow-card`, padding 24px mobile and 32px desktop.

- Mint success circle with a check, "Thank you!" and "Your order has been placed".
- Dashed divider.
- Two columns: ORDER ID on the left and AMOUNT on the right, both 18px medium.
- Rows for Placed, ETA and Email. Label `--ink-muted` left, value `--ink` right, 13px, tabular numbers.
- Dashed divider, a barcode strip derived from the order code, and the short code beneath.
- Payment line: "Pay on delivery", "Pay at pickup" or "Pay at your appointment", followed by a sentence such as "{vendor} will confirm shortly." 
- Black compact Done button, full width, `--r-control`, press spring per 8.3.

Never claim a payment was received. Tracking and receipts are deferred. Booking success reuses this card with the appointment time in ETA and Add to calendar when that work lands.

### 5.12 Slot picker

A horizontal date strip (7 days, swipeable), then a grid of time pills (3 columns, choice chip style). Selected pill is `--ink` fill with white text. Unavailable times are hidden, not greyed. A sticky footer shows service, duration, price, deposit and a Primary "Continue".

### 5.13 Feedback

- **Alert (inline):** radius `--r-inner`, padding 16px, Lucide icon 20px, title 14px medium, body 14px. Draw the 3px edge as an inset bar, 12px from top and bottom, not as a border.

| Variant | Background       | Edge          | Title color  |
| ------- | ---------------- | ------------- | ------------ |
| Info    | --surface-soft   | --ink-muted   | --ink        |
| Success | --mint-100       | --green-main  | --green-deep |
| Warning | --warn-bg        | --warn-edge   | --ink        |
| Error   | --danger-bg      | --danger      | --danger     |

- **Toast:** alert anatomy plus `--shadow-card`. Bottom center, above any sticky bar. Auto-dismiss 4s (6s for errors). `aria-live="polite"`, errors `assertive`.
- **Skeleton:** `--surface-soft` or `--tile` blocks matching the final radius and size, 1.5s opacity pulse, static under reduced motion. No full-page spinners.
- **Empty state:** centered, 56px `--surface-soft` circle with a Lucide icon, H3, one sentence, one Primary button. Example: "No orders yet. Share your link to get your first one."
- **Empty image:** neutral `--tile` with a soft camera icon and "Add a photo". Never a broken image.

### 5.14 FAQ accordion

- Section header: eyebrow "FAQ" (5.16) left, H2 "Frequently asked *questions*" with an accent word, and a Secondary pill "Ask on WhatsApp" at the right.
- Rows are white (`--surface-white`), `--r-inner`, min-height 64px, padding 20px 24px, 8px apart. Question 18px medium with an index "[01]" (5.16) after it. A 20px plus icon at the right turns into a minus when open.
- Open row shows the answer in 16px `--ink-muted`, max-width 640px, padding-top 12px. One open at a time, height and opacity 200ms.
- `aria-expanded` required, Enter and Space toggle. Falls back to `<details>` without JavaScript.

### 5.15 Footer (dark panel)

- `--bg-dark` panel, `--r-panel`, padding 48px (24px mobile), `overflow: hidden`.
- Top: H2-size heading "Your shop is one *photo* away." in `--ink-on-dark` with a Primary pill "Join the waitlist".
- Middle, three columns: **WhatsApp** (chat link), **Email**, **Social** (44px outline circle icon buttons, 1px `--hairline-dark`). A menu column lists the page anchors. Contact values come from config.
- Bottom: copyright, data-privacy link, and "a product of Ostra" with the 20px Ostra mark.
- A giant `sikatree` wordmark (3.3) in `--ink-on-dark`, cropped by the panel's bottom edge. It is decorative: `aria-hidden`.

### 5.16 Eyebrow and index labels

- **Eyebrow:** a 16px Lucide `circle-dot` icon plus a 15px medium sentence-case label ("Why sikatree", "How it works", "FAQ"). `--ink`, or `--ink-on-dark` on dark.
- **Index number:** "[01]" in 12px `--ink-muted` (`--ink-on-dark-muted` on dark), raised beside a title with a 4px gap. Used on index list rows and FAQ questions.
- **Crosshair marks:** four 14px "+" marks, white at 70%, spaced across the hero content row. Decorative: `aria-hidden`.

### 5.17 Statement block

Two columns from 900px: eyebrow in the left 25%, statement in the right 75%. Statement type per 3.3, **right-aligned** on desktop and left-aligned on mobile, max-width 900px, with 1 to 3 accent words. Below it, a row with an app illustration (5.21) in a `--tile` frame on the left, a 16px paragraph on the right and a Ghost link "Ask on WhatsApp".

### 5.18 Index list (dark panel)

- Rows separated by 1px `--hairline-dark`. Each row: list title (3.3) plus an index number. The active row is `--ink-on-dark`, the others `--ink-on-dark-muted`. Default active is the first row.
- Left of the list, a 176px preview image (`--r-inner`) for the active row, crossfading in 200ms. Below it, a one-line description and an Inverse pill "See sample stores".
- Hover or tap sets the active row. Rows are buttons with `aria-selected`, arrow keys move.
- Mobile: the preview moves above the list.

### 5.19 Bento and stat cards

- Cards are `--surface-white`, `--r-card`, padding 24px, no shadow, no border. Image tiles use `--r-tile` and fill the cell.
- **Feature card:** feature circle (5.5), H3, one line of body text, optionally a small app illustration.
- **Stat card:** stat number (3.3) plus a 14px caption and, when real, an avatar stack (28px circles, 10px overlap, 2px white ring). Stat cards appear only with measured, sourced figures (9.2). Until then use a qualitative feature card.
- **Image tile:** a vendor photo or an app illustration with an optional caption.

### 5.20 Glass card (hero only)

`--glass-bg` with `backdrop-filter: blur(16px)`, 1px `--glass-border`, `--r-card`, padding 20px, white text. Holds a 20px medium title, an optional storefront peek (5.21) and an Inverse pill. Without `backdrop-filter` support, or under Save-Data, use a solid `rgba(10,10,10,0.55)` fill. Used nowhere else.

### 5.21 App illustration frame

Illustrations let visitors feel the app. They are drawn, not photographed.

- Phone frame: 9:19, `--r-card` outer radius, 6px `--bg-dark` bezel, `--bg-page` screen, `--shadow-float`.
- Built in HTML, CSS and inline SVG from the real components (tiles, badges, stepper, success card, link buttons, chat bubbles). Never raster screenshots. They stay crisp and tiny.
- Content uses sample Ghanaian data (GH₵ prices, MoMo, `ORD-4F9K`, local product names). Alt text starts with "Example:".
- Chat illustration: user bubbles `--mint-100`, replies white, plain timestamps. No WhatsApp logo or trademarked UI chrome.
- Screens to illustrate: WhatsApp chat (send photos and prices), storefront page, MoMo prompt, order tracking, bookings calendar.
- At most 3 per viewport. No gradients beyond the tokens.

### 5.22 Testimonial card (conditional)

White card, `--r-card`, padding 24px. Top: five 16px stars in `--warn-edge`. Quote 20px medium, supporting text 14px `--ink-muted`, then name and role. Pairs with a photo tile and two 44px arrow buttons. Only with real, permitted quotes (9.2). Until then, omit the section.

---

## 6. Landing page blueprint (order is binding)

**Goal:** a waitlist signup in under 20 seconds. **Single CTA:** Join the waitlist.

### 6.1 Hero panel

1. A rounded panel (`--r-panel`), min-height 640px mobile and `min(86dvh, 760px)` desktop. Background: one vendor photo, `object-fit: cover`, on `--sage`, saturation 80% (inferred), with `--hero-scrim` over it.
2. The nav pill (5.1) floats at the top, 16px inside the panel.
3. Four crosshair marks across the content row (5.16).
4. Bottom left: Display headline in `--ink-on-dark`, max-width 720px, from the Section 9.3 bank, with 1 to 3 accent words. Then the Lead subhead in white at 80%, max-width 480px. 24px below, Primary "Join the waitlist".
5. Bottom right: the glass card (5.20) with a storefront peek and an Inverse pill "See how it works" that scrolls to 6.5.
6. Optional: an avatar stack with a caption, only with real waitlist members (9.2).
7. Mobile: headline and CTA at the bottom, the glass card below the CTA at full width.
8. The hero photo is the LCP element: AVIF or WebP in 640, 1080 and 1600 widths, high priority, LQIP. Under Save-Data serve the 640 size and drop the blur.

### 6.2 Statement

The statement block (5.17). Eyebrow "Why sikatree". Statement: "Your DMs are not a shop. *This is.* Send photos on WhatsApp and get a *store link* with prices, MoMo payments and bookings." Below it the WhatsApp chat illustration (5.21). Then an optional "Works with" strip of payment network names, in grayscale at 70% opacity with faded ends. Include it only if brand usage rules allow, otherwise omit.

### 6.3 Problem and gallery

Centered H2: "Stop typing *how much?* 50 times a day." Three white problem cards (9.5). A Secondary pill "See sample stores". Then a masonry or grid of sample store tiles (hair, food, beauty, photography, thrift), `--r-tile`, labelled "Example" until real vendors are shown (9.2).

### 6.4 Made for (dark panel)

A `--bg-dark` panel with an eyebrow, an H2 in `--ink-on-dark` ("Made for hustlers who *sell* and serve") and the index list (5.18):

`[01] Hair and braids`, `[02] Beauty and perfume`, `[03] Fashion and thrift`, `[04] Food and cakes`, `[05] Photography and events`

### 6.5 How it works

Eyebrow, then H2 "From DM chaos to *checkout*." Three white cards (`--r-card`) with the steps in 9.6. Each card holds a phone illustration (5.21): chat, storefront, order alert. Desktop: 3 columns. Mobile: stacked.

### 6.6 The math

H2 "The *math*", then the comparison table (9.7) in a white card with hairline row dividers.

### 6.7 Why choose sikatree (bento)

H2 "Why choose *sikatree*". A bento grid (5.19) of 6 feature cards: Catalogue, MoMo checkout, Bookings, Order codes, WhatsApp alerts, Works on any phone. Mix in image tiles and small illustrations (a MoMo prompt, an order code chip). Stat cards only when real.

### 6.8 Founding vendors

A white card with the text in 9.8 and the same Primary action.

### 6.9 FAQ

The FAQ accordion (5.14) with the questions in 9.9.

### 6.10 Testimonials (conditional)

The testimonial card (5.22). Omit the whole section until real quotes exist.

### 6.11 Statement strip

One centered line in Statement type: "Send photos. Get a *store*." Static, no marquee.

### 6.12 Footer panel

The footer (5.15), which holds the final CTA.

### 6.13 Waitlist form (modal or inline)

Three fields max:

1. WhatsApp number (required, Ghana formats accepted, normalized to `+233`).
2. "I mostly..." as choice chips: Sell products, Offer services, Both.
3. Business name (optional), with an optional "Reserve my link" handle field.

Consent line: "Message me on WhatsApp about my spot." Checkbox, on by default, required to continue to WhatsApp (see Section 17).

**Success state:** the person's real position in line, their referral link, and a button "Confirm on WhatsApp" that opens `wa.me` with a prefilled `WAITLIST`. This opens the 24-hour window and starts onboarding early.

> Sample copy: "You're in. Spot #214. Move up by inviting 3 friends who sell. Tap below and we'll say hi on WhatsApp." The number must come from real data.

---

## 7. Imagery and decoration rules

1. **Vendor photos** sit on `--tile`, contained (never stretched), centered. Ratios: 1:1 or 4:5 for products, 4:5 or 3:4 for portfolio work, one ratio per page. The hero is the exception: one photo, `cover`, tinted per 6.1.
2. **App illustrations** (5.21) are allowed and encouraged on the landing page. They are flat, built from real components, use sample Ghanaian data and are labelled as examples.
3. **Processing:** the server compresses to WebP or AVIF, generates 3 sizes (320, 640, 1080; the hero adds 1600) and a tiny blurred placeholder (LQIP). Images have explicit width and height.
4. **Photo guidance** in the bot and PWA: "Good light, plain background, one item per photo." Background clean-up is a later feature (P2).
5. **Landing photo sourcing:** real design-partner vendors (with permission) or licensed or commissioned images. Sample stores are labelled "Example". Do not reuse the reference's photographs. No stock-photo people. Avatars are real photos with consent, otherwise initials on `--mint-100` with `--green-deep` text.
6. **Brand marks.** The wordmark is the sans at 600, lowercase, with no registered mark. The Ostra Pearl and Shell mark appears small, and only in: the landing footer ("a product of Ostra"), the vendor page footer ("Powered by Ostra · sikatree"), and the favicon. Use the supplied asset. Never redraw, recolor or crop it. The pearl uses `--green-mark`.
7. **Never:** emoji, 3D renders, stock or clipart illustrations, mascots, animated GIFs. Decorative crosshairs and the footer wordmark are CSS or SVG only.

---

## 8. Motion and interaction

**Binding principle: nothing appears, disappears or changes position abruptly.** Every conditional element enters with opacity and a short transform. Every exit finishes before the element is removed. Space is reserved before a control appears, so the page never jumps. If a motion cannot be both subtle and fast, remove the motion, not the timing.

### 8.1 Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| `--ease-standard` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | fades, moves and colour changes |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | segmented thumb, badge pop, press release |
| `--motion-fast` | 150ms | hover colour and small press |
| `--motion-base` | 200ms | chips, descriptions and exits |
| `--motion-enter` | 240ms | cart and small UI entering |
| `--motion-panel` | 280ms | dialogs, sheets and segmented thumb |
| `--motion-exit` | 180ms | closing dialogs and exits |
| `--motion-success` | 340ms | success card entering |
| `--motion-image` | 700ms | image zoom |
| `--motion-crossfade` | 400ms | second product image |

Animate only `transform`, `opacity` and colour. Never animate layout properties that reflow the grid.

### 8.2 Entry and exit rules

- No element may mount at its final state. Start at opacity 0 plus one of: a rise of 4px to 16px, a slide of 12px to 26px, or a scale of 0.96 to 0.98.
- Exits run for 180 to 200ms before removal. A dialog fades and scales down slightly; it never disappears in one frame.
- Reserve space for conditional controls, for example the cart slot, so neighbours do not jump when the control appears.
- Do not hide a revealed element with `display: none` while it animates. On touch, a different element may carry the content; see 8.3.
- Motion never blocks input. Visible controls accept pointer events immediately; disabled controls do not animate.
- Stagger only section reveals, at most 40ms per item and at most 3 items.

### 8.3 Patterns (binding)

| Pattern | Motion |
| --- | --- |
| Section reveal | opacity 0 to 1 and 12px rise, 300ms standard, once at 20% in view |
| Card hover | lift 3px and grow the shadow, 300ms standard; image zooms to 1.05 over 700ms; a second image crossfades over 400ms |
| Card description | scrim fades 300ms; text rises 12px with a 40ms delay; the Enquire pill slides in from 8px left |
| Add to cart | 36px white circle with plus; appears with the card overlay; press spring at 180ms |
| Cart appears | opacity and `scale(0.92)` to 1 with a 4px rise, 240ms standard; the slot is reserved before mount |
| Cart badge | pops from 0.75 to 1.18 to 1, 260ms spring; only when the count changes |
| Choice chip | colour 200ms; selected is ink fill with white text; no size change |
| Segmented control | black thumb slides 280ms spring; labels fade colour 200ms |
| Compact press | scale 0.96 with 180ms spring on release; hover lifts 1px |
| Dialog open | panel opacity 0, 16px rise and `scale(0.97)`, 280ms standard; backdrop fades 200ms |
| Dialog close | panel fades and scales to 0.98 over 180ms; backdrop fades 180ms |
| Checkout success | form fades and slides left 28px over 200ms; success fades in from 26px right over 340ms |
| Toast or inline notice | fade and 8px slide, 200ms |
| Stepper | 200ms transform and opacity |

### 8.4 Never

- Never show or hide a control without a transition, except under reduced motion.
- Never let an element jump the layout. Reserve its space or use a fixed aspect ratio.
- Never slide an entering element more than 26px or scale a panel above 1.0.
- Never bounce a panel. Only badges may overshoot, and only to 1.18.
- Never add motion that delays reading, checkout or the success state.
- No parallax, cursor effects, scroll-jacking, autoplay video, marquees or drifting tiles.

### 8.5 Reduced motion

`prefers-reduced-motion: reduce` or `Save-Data`: all entries become instant opacity changes with no transform, no spring, no stagger and no zoom. Dialogs open and close instantly. Success swaps instantly. Focus rings and status changes remain. Spinners stay.

## 9. Content and copy rules (these override the reference)

### 9.0 Reference overrides

| Reference element                                    | Rule for sikatree                                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| "capture" name, mark and "through my lens"           | Never reuse. The brand is `sikatree`. No registered mark symbol.                                               |
| Photographs, avatars, "Happy clients worldwide"      | Do not reuse. Use real vendor photos with permission. Avatar stacks and such captions only when true.          |
| Stats (9659+, 30%, 100+, "1,000 projects")           | MUST NOT copy. Stats only from real, measured data with a source note. Otherwise use qualitative cards.        |
| Fake partner logo strip                              | MUST NOT show. Use a "Works with" strip only for genuinely supported payment networks, if brand rules allow.   |
| Testimonial with stars and quote                     | Omit until a real, permitted quote exists.                                                                     |
| Photography copy (services list, FAQ, "Let's chat")  | Replace with sikatree copy in this section. Pattern only is borrowed.                                          |
| Italic serif words inside sentences                  | Borrow the treatment (3.3), not the wording.                                                                   |
| Timeline shows future timestamps                     | Label future steps "Estimated" or hide the time. Map to our statuses (14.5). Highlight the current step.       |
| `$129`, "Apple Pay", numeric Order ID                | `GH₵129.00`. Payment: MTN MoMo, Telecel Cash, AT Money or Card. Order code `ORD-4F9K`.                         |
| "Go to my account"                                   | "Track my order" (guests have no account), plus a secondary "Message vendor on WhatsApp".                      |
| Product grid has no price, uppercase "ADD TO BAG +"  | Price on every tile. Sentence case. Add is a white plus circle (5.6). Consistent tile ratio.                    |

### 9.1 Voice

Confident, warm, a bit cheeky, always practical. A smart friend who also runs a business in Ghana. Short sentences, real numbers. No jargon ("omnichannel", "SaaS", "e-commerce solution"). No emoji.

- English first, British spelling in product copy (catalogue, colour, organisation).
- Light Ghanaian flavour ("no wahala", "chop") is welcome in marketing lines. Product UI stays plain.
- Native Twi speakers write and review any Twi copy. No unreviewed machine translation.

### 9.2 Claims rule

Punchy lines must be true and defensible.

- "Free" means free to start with no monthly fee. If a fee applies when vendors get paid, say so plainly in the FAQ and near the comparison ("free catalogue, small fee only when you get paid").
- The GH₵4,000 comparison must reflect real quotes (your own, or three competitor quotes). Write "Websites can cost GH₵4,000 or more", not "every site costs".
- "Live in 10 minutes" must be measured before launch (proposed).
- No live waitlist counter, testimonials, avatar stacks, "happy vendors" captions, real-looking vendors or stats until they are real.
- Founding vendor terms (9.8) are confirmed before publishing.
- No "free forever" or "guaranteed sales".

### 9.3 Headline bank (landing hero)

Words between asterisks are set in the accent serif (3.3). The default hero headline is: "Why pay GH₵4,000 for a website when your *store* can be *free*?" For the other lines, pick 1 to 3 key words, never prices or numbers.

**Price-led:**
- Why pay GH₵4,000 for a website when your store can be free?
- GH₵4,000 website? Or a free store link by lunchtime?
- Skip the GH₵4,000 website. Keep the sales.
- Your store catalogue: free. Your GH₵4,000: yours.

**Pain-led:**
- Stop typing "how much?" 50 times a day.
- Your DMs are not a shop. This is.
- Fake MoMo screenshots end here.
- "Is it still available?" Answer it once. For everyone.
- Less chatting. More selling.

**Outcome-led:**
- Send photos. Get a store.
- Your WhatsApp, now a real shop.
- Post once. Sell all day.
- One link. Prices, payments, bookings.
- From DM chaos to checkout.
- Be the shop everyone tags.
- Booked out, not burnt out. (service providers)
- Your hustle deserves a storefront.

**Speed-led:**
- Live in 10 minutes. No developer. No wahala.
- Your store is one photo away.
- Zero code. Zero stress. One link.

### 9.4 Subheads and calls to action

**Subheads:**
- "Send your photos on WhatsApp. Get a free shop link with prices, MoMo payments and bookings. Live in 10 minutes."
- "No developer. No GH₵4,000 invoice. Just your photos, your prices, and a link to share."
- "For everyone selling on WhatsApp, Snapchat and Instagram."

**CTAs:** Join the waitlist, Claim my free store, Reserve my link, Get my spot, Confirm on WhatsApp, Invite a friend who sells.

### 9.5 Problem-strip lines

- "You answer the same question 50 times a day."
- "Someone says 'I've paid.' You can't tell. Awkward."
- "Your best photos are buried in your status."
- "Customers ask for a time. You scroll through three chats to check if you're free."

### 9.6 How-it-works lines

1. **Send photos and prices** on WhatsApp. "Blue heels, 250". That's it.
2. **Get your link.** Your own page with a catalogue, in about 10 minutes.
3. **Get paid with MoMo.** Orders arrive with a code. Bookings land in your calendar.

### 9.7 Comparison block ("The math")

|               | Custom website             | Your store link   |
| ------------- | -------------------------- | ----------------- |
| Cost to start | GH₵4,000+ (typical quotes) | Free              |
| Time to launch | Weeks                     | About 10 minutes  |
| Who updates it | You or a developer        | You, on WhatsApp  |
| Takes MoMo    | Extra setup                | Built in          |
| Bookings      | Extra plugin               | Built in          |

Replace the first column with verified figures before launch.

### 9.8 Founding vendor block

- "First 100 vendors get **zero fees for 3 months**, a Founding Vendor badge, and a direct line to the team."
- "Be early. Shape it. Keep the perks forever."

### 9.9 FAQ starter

- **Is it really free?** Starting is free, with no monthly fee. A small fee applies when you receive online payments. (State the exact figure when decided.)
- **Do I need a website or a developer?** No. You set up on WhatsApp.
- **How do my customers pay?** MTN MoMo, Telecel Cash, AT Money, or card.
- **I sell services, not products. Can I use it?** Yes. Set your hours, take bookings, collect deposits.
- **Will my customers need to install anything?** No. They tap your link.
- **What happens after I join the waitlist?** We invite vendors in batches and message you on WhatsApp.
- **Can I keep my custom website?** Yes. Many vendors use both.

### 9.10 Microcopy

- Empty catalogue: "Nothing here yet. Send a photo to add your first item."
- Sold out: "Sold out. Ask the vendor to restock."
- Payment pending: "Check your phone and approve the MoMo prompt."
- Payment failed: "That didn't go through. No money was taken. Try again?"
- Order placed: "Order placed. Keep your code: ORD-4F9K."
- Booking confirmed: "You're booked. We'll remind you before it starts."

### 9.11 Formats

- **Currency:** `GH₵1,250.00` (symbol before amount, thousands separators, two decimals). Drop decimals only in compact marketing text ("GH₵4,000").
- **Phone:** display `024 123 4567`, store E.164 `+233241234567`.
- **Dates:** `4 Nov 2026`. Times in 12-hour format (`8:46 pm`). Timezone Africa/Accra.
- **Payment labels:** MTN MoMo, Telecel Cash, AT Money, Card.
- **Addresses:** a landmark plus an optional GhanaPost digital address.

---

## 10. Accessibility and performance (binding)

- WCAG 2.1 AA for public pages and checkout. Text 4.5:1, large text and UI components 3:1.
- Approved pairs: `--ink` on `--bg-page` (16.6), `--ink` on `--green-main` (6.0), `--ink-muted` on `--bg-page` (4.7) and on white (5.3), `--green-deep` on `--bg-page` (4.7), on white (5.4) and on `--mint-100` (4.6), `--ink-on-dark-muted` on `--bg-dark` (7.9).
- White text on a photo is allowed only with the hero scrim (3.2), checked per photo.
- All interactive targets at least 44x44px, including tile actions, chips, nav items and the menu button.
- Focus rings visible (3.1). Never removed.
- Every image has meaningful `alt` (vendor-provided or generated from the item name). App illustrations start with "Example:". Decorative marks and the footer wordmark are `aria-hidden`.
- Status is never conveyed by color alone (icon or text too).
- Text scales to 200% without breaking layouts. Long Twi and English words wrap.
- Accordion, index list, menu sheet and tabs use proper ARIA roles and are fully keyboard operable.
- **Performance:** LCP under 2.5s on a mid-range Android over throttled 4G, with the hero photo as the LCP element. Initial JS under 100KB gzipped. Two font families only. Animations use transforms only. Budgets enforced in CI (Lighthouse on the landing page, vendor page and checkout).
- The landing page works without JavaScript for reading and for the waitlist (plain form post). The FAQ falls back to `<details>`.

---

## 11. Implementation notes (Next.js + TypeScript)

- **Stack:** Next.js (App Router), TypeScript, Tailwind CSS, `next/font` for Inter Tight and Playfair Display (italic 400), Lucide icons. The landing page is statically generated at route `/` and served from the CDN.
- Put all Section 3 tokens in `tailwind.config` (`colors`, `borderRadius`, `boxShadow`, `fontFamily`, `backgroundImage`) and as CSS variables in `globals.css`. Components MUST reference tokens, never raw hex.
- **Component names (one file each):** `NavPill`, `Button`, `Chip`, `Badge`, `Field`, `Eyebrow`, `Accent` (the italic serif span), `Statement`, `IndexList`, `BentoCard`, `StatCard`, `GlassCard`, `PhoneFrame`, `ProductTile`, `GalleryTile`, `VendorHeader`, `LinkButton`, `Stepper`, `SuccessCard`, `SlotPicker`, `Alert`, `Toast`, `EmptyState`, `Skeleton`, `Faq`, `Footer`, `WaitlistForm`, `ComparisonTable`, `TestimonialCard`, plus the Section 15 components.
- Headings pass accent words through the `Accent` component, so the serif and its size bump live in one place.
- No UI libraries that impose their own styling. Headless Radix primitives are allowed for Dialog, Tabs, Accordion and Popover (proposed).
- **Waitlist:** a server action or API route writes to a `waitlist_signup` table (insert-only access, rate-limited, duplicate-phone aware, invisible bot protection).
- **WhatsApp links:** `https://wa.me/<number>?text=<prefilled message>`. Number and message live in config, not in components. "Share on WhatsApp" prefills a message with the user's referral link. The Open Graph image uses the hero composition.
- **Handle reservation:** the optional field checks availability in real time against the same rules as the bot (reserved words, profanity).
- **Analytics:** page view, scroll depth, CTA click, form start, form submit, Confirm on WhatsApp click, referral source and UTM parameters. No other third-party trackers without approval.

---

## 12. Prohibited list

- Colors outside Section 3: pure black or `#111111` text, any second brand hue, blue links, green on panels or large surfaces.
- Dark surfaces beyond the nav pill, the "Made for" panel and the footer panel. Edge-to-edge colored sections. Diagonal or wavy dividers.
- Gradients other than the hero scrim. Glows, heavy borders, heavy shadows. Glassmorphism anywhere except the hero glass card.
- Fonts other than Inter Tight and Playfair Display italic. Font weights under 400 or over 600. Uppercase headings, letter-spaced all-caps. Italics other than the accent serif.
- The accent serif on prices, numbers, GH₵, Twi text, buttons or body copy. More than 3 accent words in one heading.
- Radii under 16px on cards, tiles, inputs or buttons. Square corners. Rectangular buttons.
- Emoji, 3D renders, stock or clipart illustrations, mascots, stock-photo people, animated GIFs. App illustrations built from real components are allowed.
- `$`, Apple Pay or foreign-only examples in mockups.
- Prices hidden behind taps. More than one Primary per screen. Several equal-weight buttons.
- Overclaims, live waitlist counters, avatar stacks, stats or testimonials before they are real. Fake vendors presented as real.
- Marquees, floating tiles, parallax, motion that costs data or slows checkout.
- Copying the reference's brand, photos, stats, copy or logo strip. Copying the Ostra hero layout, cream colorwash, Plus Jakarta Sans, mint gradients or feature-card treatment. The Ostra mark outside the spots in Section 7.
- Dark mode in v1.
- Em-dashes anywhere in copy, comments or docs.

---

## 13. Acceptance checklist (system and landing page)

- [ ] Section order matches Section 6.
- [ ] Only tokens from Section 3 are used (grep for raw hex outside the token files).
- [ ] Fonts are Inter Tight and Playfair Display italic only. Weights 400, 500, 600. Sentence case.
- [ ] Accent words follow 3.3 (1 to 3 per heading, none on numbers, prices or Twi).
- [ ] Floating black pill nav works on desktop and mobile, with a keyboard-operable menu sheet.
- [ ] Primary button is `--green-main` with an `--ink` label. Inverse is used on dark and photo surfaces.
- [ ] Only three dark surfaces exist: nav pill, "Made for" panel, footer panel.
- [ ] Hero text passes 4.5:1 over the scrim on every approved photo. Hero photo is the LCP element and meets the budget.
- [ ] At least 3 app illustrations are present, built from real components, labelled "Example:" in alt text.
- [ ] Waitlist: 3 fields max, success state with real position, referral link and Confirm on WhatsApp. Works without JavaScript.
- [ ] Zero fabricated stats, testimonials, avatar stacks, logos or vendors (Section 9 audit passed). Comparison figures verified.
- [ ] Contrast, focus, keyboard and reduced-motion checks pass.
- [ ] Layout verified at 360, 768, 1024 and 1440px with no horizontal scroll.
- [ ] No emoji and no em-dashes anywhere in copy or docs.

---

## 14. Public storefront and checkout

Status: Binding. Version 0.5 (draft), 2026-11-05.
Applies to: the public vendor page, product grid, cart, guest checkout, order success and tracking. Payment waiting and tracking are deferred, see 14.7.
Inherits Sections 1 to 13. Section 14 wins where they conflict. The vendor accent (3.1) applies here only. The storefront stays quiet: grey page, white cards, ink text.

### 14.1 Structure and container

- One container for the header, toolbar and grid: maximum 1120px, centred, 16px side padding on mobile and 24px from tablet up. No second max-width.
- Vertical rhythm: header, 24px, toolbar, 16px, grid, 64px footer.
- Grid: 2 columns under 640px, 3 from 640px, 4 from 1280px when the store has at least 8 products. Gaps are 12px, 16px and 20px.
- Cards are equal height in a row. No horizontal scroll at 360px.
- Footer: a quiet row. Left: the sikatree wordmark, the Ostra mark and "Powered by Ostra". Right: "Get your own free store". Centred on mobile. No duplicate "Powered by sikatree".

### 14.2 Vendor header

Defined in 5.8. A compact white card, 56px initials avatar, name, tagline, location line, copyable address and WhatsApp CTA. Maximum 200px desktop and 260px mobile. A sticky bar with the name, cart and CTA replaces it after scroll, with an icon-only CTA under 400px.

### 14.3 Toolbar and cart

- Category chips when the store has at least 2 categories: one horizontal scroll-snap row with no visible scrollbar, 44px high, `--r-chip` 10px. Inactive white with a hairline, active `--ink` fill with white text, colour transition 200ms.
- Sort appears above 8 products, search above 12. The Featured select uses `--r-control` 12px and a trailing chevron 12px from the right edge, so it aligns at every width. URL state keeps `q`, `category`, `sort` and `page`.
- The cart control sits beside the sort control. 44px white circle, 1px `--hairline`, cart glyph, count in a black corner badge. It is hidden at zero and fades and scales in on the first add. Its slot is reserved so the sort control does not jump. The same control appears in the sticky bar.
- Sidebar filters only at 40 products or more and 1024px or more. Below that, filters use a bottom sheet. Otherwise the grid uses the full container.

### 14.4 Product card

Defined in 5.6. Add is a 36px white plus circle opposite the Enquire pill. The card links to the WhatsApp enquiry. Stock rules: 0 sold out overlay and grayscale 0.6, 1 to 5 "Only n left" in `--danger`, above 5 nothing. The storefront never shows exact inventory.

Motion on hover and focus follows 8.3. On touch the Add button is always visible, the Enquire pill is hidden and the description clamps to two lines under the price.

### 14.5 Cart and checkout

- The cart is single-vendor, persists per store in `localStorage`, and is summarised by item total, delivery fee and total.
- Checkout is a modal, not a page. Two columns on desktop (form left, summary right) and one column on mobile. Maximum height 92vh with internal scroll.
- Items list with thumbnails and a quantity stepper. Delivery or pickup uses the segmented control with a black sliding thumb and a 280ms spring. Pickup shows the store location; delivery requires an address. Service vendors show date and time instead.
- Contact: name, Ghana WhatsApp number and email. Email is required and stored on the order for updates. No email is sent yet. Note is optional.
- Summary: item total, fixed GH₵15 delivery (free for pickup), total. Place order is the mint green Primary, full width, `--r-control` 12px, with a forward chevron inside the same button and the press spring.
- Payment is not connected. The copy says pay on delivery, at pickup or at the appointment. Never claim a payment was received.
- On success the cart clears and the modal stays open on the ticket card. The form slides left and the ticket fades in from the right, per 8.3.

### 14.6 Order success and tracking

Success is defined in 5.11. Order ID, amount, placed time, ETA and email sit on a dashed ticket with a barcode and a black Done button. ETA is an estimate: delivery 45 to 60 minutes, pickup about 30 minutes, appointment at the chosen date and time.

Tracking lives at `/o/{code}` and is `noindex`. Four steps: Placed, Confirmed, Ready (Out for delivery or Ready for pickup), Completed (Delivered or Picked up). A cancelled order replaces the stepper with a danger alert. The page shows items, totals, fulfilment type and ETA, plus Message vendor and Back to shop. It must not show the customer's address, email or phone; the code is the capability. The stepper progress animates over 200ms.

### 14.7 Deferred storefront states

Payment waiting, MoMo network chips, card payment, receipts, order tracking (`/o/{code}`), vendor notifications, inventory holds and service slot availability are not built. When they land they follow `requirement.md` PAY, ORD and BK. Until then the UI must not show a fake countdown, spinner or progress state. The deferred register lives in `PLAN.md` and the notes under 6.7 and 6.8 of `requirement.md`.

### 14.8 Acceptance checklist

- [ ] Header and grid share the 1120px container at 1440px, with no dead gutter.
- [ ] Every image box is 1:1 unless the store sets 4/5 or 5/4, and is square within 1px.
- [ ] Header is 200px or less on desktop and 260px or less on mobile.
- [ ] Card height is 1.45x its width or less at 375px, with equal heights in a row.
- [ ] Sold out cards keep the overlay, grayscale 0.6 and the card link, and show no Add button.
- [ ] Add is a white plus circle. The cart is icon-only with a corner count and fades in on first add.
- [ ] The segmented thumb slides with the spring and the active chip is ink fill.
- [ ] Dialogs fade and rise in and out. Success slides left then fades in from the right.
- [ ] Tracking shows four steps, hides customer contact details and handles cancelled orders.
- [ ] Nothing appears, disappears or changes layout abruptly. Under reduced motion every transform and spring is removed.
- [ ] Muted text, stock captions and CTA labels reach 4.5:1.

---

## 15. Vendor PWA and admin

Status: Binding. Version 0.3 (draft)
Applies to: the signed-in vendor PWA and the admin tool.
Same tokens and radii as the public site, with tighter density. No gallery effects and no floating tiles. Container 960px.

### 15.1 Shell (proposed)

- Installable PWA: `display: standalone`, `viewport-fit=cover`, `theme_color` and `background_color` `#f1f1f1` (the one allowed raw hex, since manifests cannot read CSS variables). Icons come from the sikatree favicon asset.
- Nothing scrolls under the status bar. The top bar and bottom nav add `env(safe-area-inset-*)`. Use `dvh`, never `vh`.
- The shell never reloads: top bar and bottom nav stay mounted, only the content changes. External links (WhatsApp) open in the system browser.
- Every tappable element has a pressed state (5.2). Fields set `inputmode`, `autocomplete` and `enterkeyhint`.
- Offline: an Info alert, "You are offline. Showing saved data. Changes need a connection." Write actions are disabled with a visible reason.

### 15.2 Navigation

**Below 900px, bottom nav:** 5 items, equal width: **Home, Orders, Catalogue, Calendar, More**. White, 1px `--hairline` top border, 64px plus the bottom safe-area inset. Lucide icon 24px over a 12px label, 44px minimum target. Inactive `--ink-muted`. Active: icon in `--green-deep` inside a `--mint-100` pill (56 by 32px), label `--ink`. An unread badge on Orders (`--ink` pill, white 12px text, up to 9+). Hidden while a text field is focused.

**From 900px, top bar:** 64px, wordmark left, the same five links right, active link as a `--mint-100` pill with `--green-deep` text.

### 15.3 Screens

- **Home:** greeting with the first name, today's bookings, orders needing action, and a "Share your page" card with copy link and QR.
- **Orders (shipped single-page dashboard):** newest first, one column. Each card shows the code, date, status badge, total, items, buyer with a Message link, fulfilment, email, note, and quick actions (Confirm, Mark ready, Mark completed, Cancel). A Track page link and copy link sit beside the actions. Filter chips and the five-item nav remain proposed.
- **Catalogue:** the same gallery-style grid as the public page, so vendors see what clients see. A 56px circular add button (`--green-main`, `--ink` icon) sits bottom right above the nav and opens the camera first.
- **Calendar:** day and week views. Tap a slot to block time.
- **More:** payments and payouts, page editor and theme, notifications, language, support, sessions. Rows are 64px, Lucide icon left, chevron right, hairline dividers.

List rows: min-height 64px, title 16px medium, meta 14px `--ink-muted`, amount right, one tappable row.

### 15.4 Admin

Utilitarian but on-brand. Table views with the same tokens. Header row 48px (14px medium `--ink-muted`), body rows min-height 56px, 1px `--hairline` dividers, numeric columns right-aligned with tabular numbers, status as a badge (5.4). No gallery effects.

### 15.5 Acceptance checklist

- [ ] Launched from the Home Screen icon: no browser UI, nothing under the status bar.
- [ ] No horizontal scroll at 360, 390 and 430px.
- [ ] Bottom nav hides while typing and clears the safe-area inset.
- [ ] Catalogue grid matches the public page.
- [ ] Offline launch opens the shell with the offline alert.
- [ ] Reduced motion makes all transitions instant.

---

## 16. WhatsApp message design

The bot is part of the design system.

- **Tone:** short, warm, plain English. One idea per message. No emoji.
- **Buttons over typing:** reply buttons (max 3, labels 20 characters or fewer, e.g. "Confirm", "Edit", "Cancel") and list messages for longer choices.
- **Confirmation card:** a compact preview with bold labels and one value per line. Always end with Confirm, Edit and Cancel.
- **Order alert:** code first, then items, buyer, delivery, total, then buttons (see `requirement.md` Appendix B).
- **Never dead-end:** every message offers a next step or "menu".
- **Share assets:** a ready-to-forward message and an image share card (1080×1350 for feed, 1080×1920 for status) generated from the vendor's page in the tile style.

---

## 17. Deliverables and open decisions

### Deliverables

1. Landing page wireframe and hi-fi (mobile and desktop), including the hero panel, waitlist form and success state.
2. Component sheet: nav pill, buttons, tiles, index list, bento cards, stepper, success card, slot picker, inputs.
3. App illustration set: WhatsApp chat, storefront, MoMo prompt, order tracking, bookings calendar.
4. Vendor public page and checkout hi-fi (mobile).
5. Vendor PWA key screens: Home, Orders, Catalogue, Calendar.
6. WhatsApp conversation designs for onboarding, order alert and booking alert.
7. Share-card templates (feed and status sizes).
8. Design tokens in code and a small Storybook or component preview page.
9. Brand basics: the sikatree wordmark, a favicon from the Ostra mark, and the hero and gallery photos.

### Open decisions

1. **Fonts:** confirm Inter Tight and Playfair Display Italic as the matches, or supply the originals if they are identified (change 3.3 only).
2. **Glyph coverage:** confirm both fonts cover ɛ, ɔ, Ɛ, Ɔ and ₵ in the shipped subset.
3. **Hero photo:** one vendor photo or a 2 to 3 photo collage, and where it comes from (real design-partner vendors with permission, or licensed images).
4. Logo direction: wordmark only, or a small green accent to echo Ostra.
5. Dark mode: light page only for v1 is assumed (3.7). Confirm, or schedule dark variants.
6. Vendor accent set: pick the 8 to 10 colors and check each label for 4.5:1.
7. Waitlist consent checkbox is on by default (6.13). Confirm this meets the consent requirements for WhatsApp messaging and data protection.
8. Owner sign-off on the (proposed) items, especially `--ink` `#10111F`, the green button with an `--ink` label, the 640, 900 and 1200 breakpoints, and the bento grid.

Resolved: brand accent is Ostra mint green (single borrowed hue). Geist (v0.3) is retired in favor of Inter Tight and Playfair Display.
