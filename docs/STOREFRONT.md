# Public storefront (`/{handle}`)

The product listing for a live vendor, applied to `/amasglow`. It reads
`vendors` and `items` directly and renders on the server; the only client code
is filtering, sorting, pagination, the sticky bar and the copy button.

## Layout

- One container for the header and the grid: `max-w-[1120px] mx-auto px-4 sm:px-6`.
  No second max-width anywhere.
- Header is a compact white card: 56px initials avatar, clamped store name,
  tagline, location line, address chip with copy, and the WhatsApp CTA. It is
  188px tall at 1440 and 216px at 375.
- Sticky bar appears through an IntersectionObserver once the header leaves the
  viewport; the CTA becomes icon-only under 400px.
- Grid: 2 columns under 640, 3 from 640, 4 from 1280 when the store has at least
  8 products. Gaps are 12, 16 and 20px.
- Cards are flex columns with a fixed 1:1 image box (`--card-image-ratio` can be
  `1/1`, `4/5` or `5/4`), the body flexing and the price row pinned to the
  bottom. The tallest card at 375x667 is 1.443x its width.

## Theme

`--shop-bg`, `--shop-card`, `--shop-ink`, `--shop-muted`, `--shop-hair`,
`--shop-accent`, `--shop-accent-label`, `--shop-accent-deep`, `--shop-low`,
`--card-image-ratio`. The accent defaults to brand green with an ink label; a
store can pick another from `lib/shop-accent.ts`, and every entry is tested to
keep its label at 4.5:1.

## Data

`0006_storefront_fields.sql` adds the listing fields: vendor `location`,
`category`, `accent`, `card_image_ratio`; item `category`, `compare_at_pesewas`,
`badge`, `focal_x`, `focal_y`, `image_url_alt`.

Stock rules on the storefront: 0 shows a "Sold out" overlay and a desaturated
image; 1 to 5 shows "Only n left"; above 5 shows nothing. Exact counts stay in
the dashboard.

## Demo

`pnpm seed:demo` regenerates the unbranded sample images in
`public/sample-stores/amasglow/` and replaces the catalogue with ten products
(three categories, badges, compare-at prices, sold-out and low-stock cases, and
about 40% without descriptions).

## Conditional UI

- Category chips when the store has at least 2 categories.
- Search above 12 products, sort above 8.
- Pagination and the footer count above 24 products.
- Sidebar filters only at 40+ products and 1024px+, with a bottom sheet below
  that. Verified with a temporary 50-product catalogue.

## Measured

At 1440x900 and 375x667: header and grid edges align at 184/1256; images are
square within 1px at 375, 768, 1280 and 1920; CLS 0; no long tasks while
hovering every card; muted, low-stock and CTA text are 5.33, 6.54 and 6.01;
reduced motion removes every transform; keyboard focus reveals the same overlay
as hover.

## Cart and checkout

- Add to cart sits opposite Enquire on each card; the toolbar and the sticky bar
  show the count. The cart persists in `localStorage` per store.
- Checkout is a modal with items and quantities on the left and the summary on
  the right: item total, a vendor-configurable delivery fee (free, a fixed fee
  with within-region and outside-region rates, or "confirm after order"; pickup
  is always free), and the total. A fixed-fee delivery asks the client to pick a
  zone and offers "pay the delivery fee on arrival", which excludes it from the
  total. Delivery asks for an address; services ask for a date and time.
- Name, Ghana WhatsApp number and email are required. The email is stored on
  the order for updates; no email is sent yet.
- Orders are written server-side to `orders` and `order_items` with a unique
  `ORD-` code, then the modal shows the ticket-style success card with the code,
  amount, ETA and email. The ETA is the vendor's configured delivery/pickup text
  (set in `/dashboard/settings`); appointments use the chosen date and time.
- Payment is **not** connected. Orders are pay on delivery, at pickup or at the
  appointment, and the copy says so.

Deferred items and their requirement IDs are recorded in `PLAN.md` and
`requirement.md` (online payment, vendor notifications, tracking, inventory,
service slots, email sending).

## Motion

- The plus add button is a white circle; the cart control is an icon-only circle
  with a corner count and fades in the first time an item is added. The slot is
  reserved so the sort control does not jump.
- Category chips and the delivery/pickup segmented control are flattened and
  black when active. The segment thumb slides with a small spring.
- The checkout dialog fades and rises in, and fades out on close. On success the
  form slides left, then the ticket card fades in from the right.
- Place order and Done use the same black, flattened style with a press spring.
- Every new animation is disabled under `prefers-reduced-motion`.
