# Requirements: sikatree

| | |
|---|---|
| **Version** | 0.2 (draft): adds landing page and waitlist (LP) as the first priority |
| **Date** | 2026-11-04 |
| **Status** | For review |
| **Companion docs** | `PLAN.md`, `DESIGN.md` |
| **Parent brand** | Ostra (minor design accents only; see `DESIGN.md`) |

---

## 1. Purpose and vision

A "link-in-bio" platform for Ghanaian small businesses that turns one link into a **shop, booking desk and payment collector**. Vendors who today sell through WhatsApp status posts, Snapchat and Instagram DMs get:

- a public page with their links, catalogue and prices,
- checkout with Mobile Money (MoMo) and cards,
- online booking for service providers,
- order and booking codes that remove "who paid?" confusion,
- notifications on WhatsApp and the PWA.

**Two defining product decisions**

1. **WhatsApp-first onboarding and daily management.** A vendor can create a live, shareable page without ever opening a website. WhatsApp is where vendors already live, so it is the primary interface for setup, quick edits and order handling.
2. **The vendor application is a PWA.** The PWA is the full-control dashboard (catalogue, calendar, payouts, analytics). It is installable, light on data and works on mid-range Android phones.

The client-facing storefront is a fast, server-rendered web page (no app install, no account required).

## 2. Goals and non-goals

### Goals
- G1. A new vendor goes from first WhatsApp message to a live page in **under 10 minutes** (median).
- G2. Clients can complete a purchase or booking in **3 taps or fewer after choosing an item**, paying with MoMo.
- G3. Vendors receive every order and booking on WhatsApp with one-tap actions.
- G4. Replace fake-payment-screenshot disputes with verified, automatic payment confirmation.
- G5. Keep page weight and data usage low enough to work on weak mobile connections.
- G6. **Launch a landing page with a waitlist first**, before the product is built, to capture demand, validate messaging, and build a pool of vendors to onboard (see 6.0).
- G7. Deliver a **calm, minimal, gallery-style interface** that showcases vendors' products and work (see `DESIGN.md`).

### Non-goals (v1)
- Multi-vendor marketplace or buyer-side discovery directory.
- Native iOS/Android apps (PWA only).
- Built-in logistics or rider dispatch (vendors arrange delivery; integrations later).
- Holding customer funds as a regulated entity (use a licensed payment aggregator; see Section 11).
- Multi-currency (GHS only).
- Staff accounts and multi-location businesses.

## 3. Users and personas

| Persona | Description | Key needs |
|---|---|---|
| **Vendor, seller** | Sells products on WhatsApp/Snapchat/Instagram: thrift, wigs, perfumes, food, skincare, gadgets. Often a student or solo operator. | Show prices once, stop repeating them, know who paid, track stock, get orders with clear codes |
| **Vendor, service provider** | Makeup artists, photographers, braiders, barbers, tutors, consultants. | Set availability, avoid no-shows, get deposits, avoid scheduling back-and-forth |
| **Client, buyer** | Follows the vendor on social media, buys from phone, pays with MoMo. | Trust, clear prices, quick checkout, confirmation, a way to contact the vendor |
| **Platform admin** | Internal team (initially the founder). | Vendor verification, support, dispute handling, fee configuration |

Many vendors are both sellers and service providers. The system models **item types inside one catalogue**, not separate account types.

## 4. Design principles

1. **Meet vendors where they are.** If a task can be done in WhatsApp in fewer steps than in the dashboard, support it in WhatsApp.
2. **Zero-typing where possible.** Buttons and lists over free text; photos plus captions over forms.
3. **Never publish unconfirmed data.** Anything parsed from chat (by rules or AI) is shown back to the vendor and confirmed before it goes live.
4. **MoMo first, cards second.**
5. **Light by default.** Public pages budget for slow networks and mid-range phones.
6. **Trust is a feature.** Clear order codes, payment status, receipts, and fast payouts.
7. **Everything editable.** Any vendor data created through chat can be fixed in the PWA, and vice versa.
8. **Calm, minimal, gallery-like.** The vendor's photos are the hero; the interface stays quiet (see `DESIGN.md`).
9. **Punchy, honest copy.** Marketing lines must be attention-grabbing *and* true (for example, "free" and price comparisons must be defensible).

## 5. Release scope

| Priority | Meaning |
|---|---|
| **P0** | Required for the pilot MVP |
| **P1** | Needed soon after pilot feedback |
| **P2** | Later / exploratory |

---

## 6. Functional requirements

### 6.0 Landing page and waitlist (LP), first deliverable

The landing page ships **before the product**. Its jobs: capture demand, test messaging, reserve vendor handles, and build the pool of vendors who will be onboarded first through WhatsApp. Visual direction, copy bank and wireframes are in `DESIGN.md` (Sections 5.1, 7 and 8).

**Page and messaging**

| ID | Requirement | P |
|---|---|---|
| LP-01 | A single, fast marketing page at the root domain with: hero (punchy headline, subhead, one primary CTA "Join the waitlist"), problem strip, how-it-works in 3 steps, gallery of sample stores, price comparison, features grid, founding-vendor offer, FAQ, final CTA, footer. | P0 |
| LP-02 | Hero headline and copy are drawn from the copy bank in `DESIGN.md` (e.g. "Why pay GH₵4,000 for a website when your store can be free?"). Copy must be **true and defensible**: "free" is qualified accurately (free to start, no monthly fee, fee on online payments stated), and price comparisons rely on real quotes. | P0 |
| LP-03 | Hero uses the **gallery treatment**: tilted, softly shadowed tiles of real vendor products and work floating around the centered headline, with a static fallback for reduced-motion, Save-Data and low-end devices. | P0 |
| LP-04 | Mobile-first layout; LCP under 2.5 s on a mid-range Android on throttled 4G; initial JS under 100 KB gzipped; images lazy-loaded WebP with blurred placeholders. | P0 |
| LP-05 | Page is statically generated and served from a CDN; includes SEO metadata, Open Graph image and favicon so it previews well when shared on WhatsApp. | P0 |
| LP-06 | A "Share on WhatsApp" action with a prefilled message is available on the page and on the signup success state. | P0 |
| LP-07 | An interactive or animated **WhatsApp-to-store demo** (phone mockup showing "Blue heels, 250" turning into a store tile). | P1 |
| LP-08 | English at launch; Twi tagline variants reviewed by native speakers. | P0 (EN), P1 (Twi) |

**Waitlist capture**

| ID | Requirement | P |
|---|---|---|
| LP-09 | Waitlist form has at most 3 fields: WhatsApp number (required), what they do (sell products / offer services / both), and business name (optional). Ghana number formats (`024...`, `+23324...`) are accepted and normalized to E.164. | P0 |
| LP-10 | Consent: explicit opt-in to be contacted on WhatsApp about their spot, with a link to the privacy notice. Consent text and timestamp are stored. | P0 |
| LP-11 | **Handle reservation:** the vendor can optionally reserve their page handle during signup, with real-time availability checking and the same reserved-word and profanity rules as onboarding. Reservations expire if the vendor does not onboard within a configurable window. | P0 |
| LP-12 | Success state shows the vendor's position in line, a personal referral link, a share button, and a **"Confirm on WhatsApp"** button that opens a `wa.me` chat with prefilled text (e.g. "WAITLIST"). This opens the 24-hour messaging window and can begin onboarding early. | P0 |
| LP-13 | A confirmation message is sent on WhatsApp after signup (approved template, or free-form once the vendor has tapped "Confirm on WhatsApp"). | P0 |
| LP-14 | Duplicate signups (same number) are detected; the vendor sees their existing position instead of a new entry. | P0 |
| LP-15 | Referral program: each signup gets a unique link; referred signups move the referrer up the line and count toward a reward (e.g. extra fee-free months or Founding Vendor status). | P1 |
| LP-16 | Founding Vendor offer (e.g. first 100 vendors get a fee-free period and a badge) is configurable and displayed on the page. | P0 |
| LP-17 | A live "vendors on the waitlist" counter appears only once the number is real and above a configurable threshold. No fabricated social proof. | P1 |
| LP-18 | The form works without JavaScript (plain form post with a server-rendered result) for low-end devices. | P1 |

**Protection, analytics and operations**

| ID | Requirement | P |
|---|---|---|
| LP-19 | Abuse protection: rate limiting, honeypot field, invisible bot challenge, and phone-format validation. The database accepts inserts only through the server. | P0 |
| LP-20 | Analytics for the funnel: visits, scroll depth, CTA clicks, form start, form submit, "Confirm on WhatsApp" clicks, referral source, and UTM parameters. Analytics respects privacy and consent requirements. | P0 |
| LP-21 | Admin view of the waitlist: search, filter by type/city/source, export (CSV), status (waiting, invited, onboarded), and notes. | P0 |
| LP-22 | **Invite flow:** admin can invite vendors in batches; invitees receive a WhatsApp message with a one-tap link that starts onboarding (prefilled "START"). Invite and onboarding status are tracked per entry. | P0 |
| LP-23 | Unsubscribe: a vendor can reply STOP or remove themselves, which suppresses further messages and frees any reserved handle. | P0 |
| LP-24 | A/B testing support for headline and CTA variants (simple assignment and tracking). | P1 |
| LP-25 | Privacy notice and terms pages published; data handling aligns with NFR-C1 (Data Protection Act). | P0 |

### 6.1 WhatsApp onboarding and management (ONB), critical path

This module is the core of vendor acquisition. It must feel like chatting with a helpful assistant, not filling a form.

**Entry and identity**

| ID | Requirement | P |
|---|---|---|
| ONB-01 | A vendor can start onboarding by messaging the platform's WhatsApp Business number, via a `wa.me` link, a QR code, or a button on the marketing site (prefilled text e.g. "START"). | P0 |
| ONB-02 | The vendor's WhatsApp number is treated as their verified phone identity. No separate OTP at signup. One vendor account per WhatsApp number. | P0 |
| ONB-03 | The bot asks for consent to terms and WhatsApp messaging before collecting data, and records the consent with timestamp. `STOP` opts out of non-essential messages. | P0 |
| ONB-04 | Language: English at launch; vendor can switch language at any time. Twi support is a fast follow. Copy is stored in a translation catalogue, never hard-coded in handlers. | P0 (EN), P1 (Twi) |

**Guided setup**

| ID | Requirement | P |
|---|---|---|
| ONB-05 | The bot collects, in order: business name, what the vendor does (sell products / offer services / both), category, desired handle, optional logo and bio. Only business name, type and handle are mandatory. | P0 |
| ONB-06 | The bot suggests handles derived from the business name and checks availability instantly. Reserved/offensive handles are rejected. | P0 |
| ONB-07 | Interactive WhatsApp messages (reply buttons, list messages) are used wherever there is a fixed set of choices. | P0 |
| ONB-08 | The bot collects the MoMo payout details (network and number). The account name is verified through the payment provider where possible and shown back for confirmation. The page can go live before payout details are set, but online payments stay disabled until they are verified. | P0 |
| ONB-09 | Setup state is persisted. If the vendor stops mid-flow, the next message resumes at the last unanswered step. Up to 2 gentle follow-up nudges (template messages when outside the 24-hour window) for abandoned setups. | P0 |

**Adding catalogue items by chat**

| ID | Requirement | P |
|---|---|---|
| ONB-10 | Vendor sends a **photo with a caption** (e.g. "Blue block heels size 40, 250") and the system extracts name, price, description and optional stock; it replies with a preview and **Confirm / Edit / Cancel** buttons. | P0 |
| ONB-11 | Vendor sends a **text list** (e.g. "Knotless braids 300, Box braids 250, Cornrows 120") and multiple items are created after confirmation. | P0 |
| ONB-12 | Multiple photos sent together: bot asks whether they are separate items or photos of one item. | P0 |
| ONB-13 | Voice notes are transcribed and parsed like text. | P1 |
| ONB-14 | Price parsing handles common Ghanaian formats: `250`, `GHS 250`, `GH₵250`, `250 cedis`, `250ghc`. Ambiguous cases (e.g. "2 for 400", price ranges, "DM for price") trigger one specific clarifying question. | P0 |
| ONB-15 | Parsing confidence below a threshold always triggers a clarifying question; the bot asks **one question at a time**. | P0 |
| ONB-16 | Parsed data is never published without explicit vendor confirmation. | P0 |

**Setting up services by chat**

| ID | Requirement | P |
|---|---|---|
| ONB-17 | For each service the bot collects name, price, duration, and whether a deposit is needed (none / fixed amount / percentage / full). | P0 |
| ONB-18 | Availability can be entered in natural language ("Mon to Fri 9am to 5pm, Saturday 10 to 2, closed Sunday") and shown back as a clear weekly summary for confirmation. A button offers "Edit in dashboard". | P0 |

**Go-live and handoff**

| ID | Requirement | P |
|---|---|---|
| ONB-19 | When setup reaches the minimum, the bot sends the live page link, a ready-to-forward share message and a share-card image sized for WhatsApp status. | P0 |
| ONB-20 | The bot offers an **"Open dashboard"** button that sends a single-use, expiring magic link which signs the vendor into the PWA without a password, and prompts to install the PWA. | P0 |
| ONB-21 | Median time from first message to live page is tracked as a core product metric (target under 10 minutes). | P0 |

**Ongoing management via chat**

| ID | Requirement | P |
|---|---|---|
| ONB-22 | A persistent menu or keyword ("menu") offers: My orders, My bookings, Add item, Mark sold out, Change price, Share my page, Open dashboard, Help. | P0 |
| ONB-23 | Natural-language quick edits: "sold out blue heels", "change braids to 350", "add 5 to perfume stock", "pause bookings tomorrow". Each shows a confirmation before applying. | P0 for sold out and price change; P1 for the rest |
| ONB-24 | Order and booking notifications arrive in the same chat with action buttons (Confirm, Decline, Mark ready, Mark delivered, Reschedule). | P0 |
| ONB-25 | "Help" forwards to a human support inbox with the vendor's context attached. | P0 |
| ONB-26 | Unsupported input (stickers, documents, unknown commands) receives a friendly fallback that points to the menu. | P0 |
| ONB-27 | The bot is rate-limited per number, and webhook processing is idempotent (duplicate message deliveries never create duplicate items or orders). | P0 |

**Appendix A** has a sample conversation script.

### 6.2 Authentication and accounts (AUTH)

| ID | Requirement | P |
|---|---|---|
| AUTH-01 | Vendors sign in to the PWA via a magic link or one-time code delivered on WhatsApp. No passwords. | P0 |
| AUTH-02 | Sessions persist on the device for a configurable period (default 30 days) and can be revoked from settings. | P0 |
| AUTH-03 | Vendors can sign up from the PWA directly (phone number, WhatsApp OTP), which then continues into the same guided setup. | P1 |
| AUTH-04 | Clients do not need accounts (guest checkout). | P0 |
| AUTH-05 | Admin accounts use stronger authentication (email plus second factor). | P0 |

### 6.3 Public vendor page (PG)

| ID | Requirement | P |
|---|---|---|
| PG-01 | Each vendor has a public page at `/{handle}` rendered server-side with fast first paint. | P0 |
| PG-02 | Page shows logo, name, bio, verification badge (if any), link buttons, and the catalogue. | P0 |
| PG-03 | Link buttons: WhatsApp (with prefilled message), Instagram, Snapchat, TikTok, Facebook, website, Google Maps location, phone, and custom links. Reorderable. | P0 |
| PG-04 | Vendor can choose from a small set of themes (colors, button style, light/dark). | P0 (3 themes), P1 (more) |
| PG-05 | Every item has a shareable deep link (`/{handle}/i/{item}`) with correct Open Graph tags so it previews well on WhatsApp and social apps. | P0 |
| PG-06 | A downloadable QR code and share cards for the page and for individual items. | P1 |
| PG-07 | Page works without JavaScript for browsing the catalogue and links (progressive enhancement). | P1 |
| PG-08 | "Powered by" footer with a link to create your own page; removable on paid plans. | P1 |
| PG-09 | Custom domain support. | P2 |
| PG-10 | A "Report this vendor" action. | P1 |

### 6.4 Catalogue (CAT)

| ID | Requirement | P |
|---|---|---|
| CAT-01 | Catalogue items have a type: **product** or **service**. | P0 |
| CAT-02 | Item fields: name, description, price (GHS), up to 5 images, category, visibility (visible / hidden), and availability state. | P0 |
| CAT-03 | Categories (vendor-defined, reorderable) group items on the page. | P0 |
| CAT-04 | Images are auto-compressed and converted to efficient formats at upload, served in responsive sizes, and lazy-loaded. | P0 |
| CAT-05 | Variants and options (size, color, length) with optional per-variant price and stock. | P1 |
| CAT-06 | Price display options: fixed, "from GHS X", or "contact for price". Contact-for-price items route to WhatsApp instead of checkout. | P0 |
| CAT-07 | Search within a vendor's catalogue when it has more than a threshold of items. | P1 |
| CAT-08 | Bulk import from CSV and from a WhatsApp Business catalogue export (if feasible). | P2 |
| CAT-09 | Drag-and-drop ordering and "featured" flag. | P1 |

### 6.5 Inventory (INV)

| ID | Requirement | P |
|---|---|---|
| INV-01 | Product stock tracking is optional. Default is unlimited. | P0 |
| INV-02 | When stock is tracked, a paid order decrements stock atomically. Zero stock marks the item **Sold out** and disables checkout. | P0 |
| INV-03 | Stock is reserved for a short hold (default 15 minutes) while a client is paying; the hold expires automatically. | P0 |
| INV-04 | Vendor-configurable low-stock threshold triggers a WhatsApp/PWA alert. | P1 |
| INV-05 | Manual stock adjustments are recorded with a reason and timestamp (stock movement log). | P1 |
| INV-06 | Manual "Sold out" toggle independent of counts. | P0 |

### 6.6 Services, availability and booking (BK)

| ID | Requirement | P |
|---|---|---|
| BK-01 | Service fields: name, description, price, duration, optional buffer time after, location type (at vendor's place / at client's location / online), and optional deposit. | P0 |
| BK-02 | Vendor sets **weekly availability** (multiple time windows per day) and **exceptions** (blocked dates, special hours). | P0 |
| BK-03 | Vendor sets minimum notice (e.g. 3 hours) and maximum advance window (e.g. 60 days). | P0 |
| BK-04 | Client sees only valid open slots, in Africa/Accra time, computed from availability minus existing bookings, buffers and blocked time. | P0 |
| BK-05 | **No double booking.** Concurrent attempts for the same slot must be prevented at the database level; the loser gets a clear "slot just taken" message with alternatives. | P0 |
| BK-06 | Confirmation mode per vendor or service: **instant** (auto-confirm) or **request** (vendor accepts/declines within a set time; unanswered requests expire and refund any payment). | P0 |
| BK-07 | Payment options per service: pay in full, pay deposit, or pay at the appointment. Bookings requiring payment are held only until payment succeeds or the hold expires. | P0 |
| BK-08 | Each booking gets a unique **booking code**. | P0 |
| BK-09 | Client captures: name, WhatsApp number, notes, and (for client-location services) address/landmark. | P0 |
| BK-10 | Reminders to client and vendor (default 24 hours and 1 hour before). | P0 |
| BK-11 | Cancellation and rescheduling: vendor-defined policy (e.g. free until 12 hours before). Client can use a link with the booking code; vendor can reschedule or cancel from WhatsApp or PWA. | P1 |
| BK-12 | Vendor calendar view (day/week) in the PWA. | P0 |
| BK-13 | No-show marking and optional deposit forfeiture rules. | P1 |
| BK-14 | Capacity greater than 1 (group sessions, classes) and multi-staff scheduling. | P2 |
| BK-15 | Calendar sync (Google Calendar `.ics` export first, two-way sync later). | P2 |

### 6.7 Orders (ORD)

| ID | Requirement | P |
|---|---|---|
| ORD-01 | Client can add products to a cart (single vendor per cart) and check out as a guest. | P0 |
| ORD-02 | Checkout collects: name, WhatsApp number, delivery method (**pickup** or **delivery**), delivery address with landmark (and optional GhanaPost digital address), and an optional note. | P0 |
| ORD-03 | Delivery fee handling is vendor-configurable: free, fixed fee, or "vendor confirms fee after order" (the client pays after confirmation via a payment link). | P0 (free/fixed/confirm-after) |
| ORD-04 | Each order has a short, human-friendly **order code** (e.g. `ORD-4F9K`) that avoids ambiguous characters and is unique platform-wide. | P0 |
| ORD-05 | Order status lifecycle: `Placed → Paid → Confirmed → Ready → Fulfilled`, plus `Cancelled` and `Refunded`. Vendors move orders forward from WhatsApp buttons or the PWA. | P0 |
| ORD-06 | Vendor notification contains: order code, items and quantities, buyer name and phone, delivery arrangement, total, payment status. | P0 |
| ORD-07 | Client has an order tracking page (`/o/{code}`) accessible with the code (and phone verification for sensitive details). | P0 |
| ORD-08 | **Pay-on-delivery / pay-offline** option, configurable per vendor, with vendor-marked "Paid" status. | P0 |
| ORD-09 | Vendor can contact the client in one tap (WhatsApp deep link with prefilled message including the order code). | P0 |
| ORD-10 | Vendor can cancel with reason; client receives notification; refund is initiated if paid. | P0 |
| ORD-11 | Order history export (CSV). | P1 |
| ORD-12 | Client "reorder" button from the tracking page. | P2 |

**Implementation notes: cart and checkout slice (2026-11-05)**

The public storefront implements ORD-01 (single-vendor cart, guest checkout), ORD-02 (name, WhatsApp number, pickup or delivery, address, note), ORD-04 (order code) and the pay-offline side of ORD-08. Totals are recomputed on the server from item ids and quantities, and orders are stored in `orders` and `order_items`. The success card shows the code and an ETA estimate.

The order loop now continues after checkout:

- **Vendor orders.** `/dashboard` lists orders newest first with items, customer, fulfilment, email, notes and total. Vendors move an order through `pending → confirmed → ready → completed` or cancel it from `pending`, `confirmed` or `ready`. The transition is enforced in the database transaction and scoped to the order's vendor.
- **Vendor alert.** A new order sends a WhatsApp text to the vendor with the code, items, total, customer, delivery details, note and a single-use dashboard login link. It runs after the checkout response, so a slow provider cannot delay the client. Interactive action buttons are not built.
- **Client tracking.** `/o/{code}` shows a four-step status, items, total, fulfilment type and ETA. It deliberately hides the customer's address, email and phone, so no phone verification is needed for the data shown. The page updates when the vendor changes the status.
- **Vendor contact.** The dashboard has a Message link that opens WhatsApp with the order code prefilled.

The following behaviours remain deferred or partial and must not be described as fully working:

| Requirement | Deferred behaviour | Target |
|---|---|---|
| ORD-03 | Delivery fee is a fixed GH₵15 and free for pickup; vendor configuration (free / fixed / confirm-after) is deferred | Phase 2 |
| ORD-05 | `pending → confirmed → ready → completed` and cancellation are implemented from the dashboard. The `Paid` and `Refunded` states wait for online payments; WhatsApp action buttons wait for approved templates | Phase 2/3 |
| ORD-06 | The vendor receives a WhatsApp text with the order details and a dashboard link. Interactive Confirm/Decline buttons and approved templates are deferred | Phase 2 |
| ORD-07 | `/o/{code}` tracking is implemented with the code as the capability. Sensitive customer details are not shown; phone verification and live ETA are deferred | Phase 2/3 |
| ORD-10 | Cancel is available, but a cancellation reason, client notification and refunds are deferred | Phase 2/3 |
| ORD-11, ORD-12 | CSV export and reorder are deferred | P1/P2 |

Additional scope notes:

- **Email capture.** Checkout collects and stores `customer_email` for order updates. No email is sent yet. Email is an optional P2 channel in NOT-02; sending depends on that notification work. The UI says the email is saved, not that a message was sent.
- **Payment.** Online payments are not connected. Orders are pay on delivery, at pickup, or at the appointment. Nothing in the UI may claim a payment was received until PAY-01/PAY-02 exist.
- **Services.** A service order is an appointment request with date and time only. Availability rules, slots and deposits remain Phase 4 work.
- **Inventory.** Stock is checked at order time but not decremented or held. Concurrent orders can oversell until INV-01 to INV-03 land.
- **Cart storage.** The cart lives in the browser (`localStorage`) per store and is not a server-side cart. Clearing browser storage clears it.

### 6.8 Payments and payouts (PAY)

**Current state (2026-11-05):** no payment provider is connected. Checkout orders are pay-on-delivery, pay-at-pickup or pay-at-appointment. PAY-01, PAY-02, PAY-03, PAY-09 and the ledger are deferred; see the note under 6.7.

| ID | Requirement | P |
|---|---|---|
| PAY-01 | Clients can pay via **MoMo** (MTN, Telecel, AirtelTigo) using a prompt on their phone, and via card, through a licensed payment aggregator. | P0 |
| PAY-02 | **Payment confirmation comes only from signed server-to-server webhooks** (plus a verification API call), never from client-side redirects. Webhook handling is idempotent. | P0 |
| PAY-03 | A double-entry style **ledger** records every payment, fee, refund and payout per vendor. Vendors can see gross, fees and net. | P0 |
| PAY-04 | Platform fee model is configurable: percentage and/or fixed per transaction, per plan. Fees are displayed transparently to vendors. | P0 |
| PAY-05 | Payouts go to the vendor's verified MoMo wallet on a defined schedule (target: daily, with a minimum payout amount). Payout status is visible and notified. | P0 |
| PAY-06 | Refunds (full and partial) can be initiated by the vendor (within rules) or by an admin. | P0 |
| PAY-07 | Receipts are generated and sent to the client (WhatsApp or link). | P1 |
| PAY-08 | **Escrow-lite for products:** payout is held until the client confirms receipt or a timer expires; disputes pause release. Only if feasible under the chosen provider's rules. | P1 |
| PAY-09 | Failed, pending and timed-out payments are handled gracefully (retry, re-prompt, clear client messaging). | P0 |
| PAY-10 | Daily reconciliation job compares the ledger with provider reports and flags discrepancies. | P1 |
| PAY-11 | Payment links (vendor creates a link or code for a custom amount and sends it in chat). | P1 |

### 6.9 Notifications (NOT)

Channels: **WhatsApp** (primary), **PWA push** (secondary), **SMS** (fallback, P1), **email** (optional, P2).

| ID | Requirement | P |
|---|---|---|
| NOT-01 | Vendor events: new order, payment received, new booking, booking request, cancellation, stock low, payout sent, reminder, setup nudge. | P0 |
| NOT-02 | Client events: order/booking confirmation, payment receipt, status updates, reminders. | P0 |
| NOT-03 | Vendor channel preferences per event type, with WhatsApp enabled by default. | P0 |
| NOT-04 | **WhatsApp 24-hour window handling:** inside the window, send free-form interactive messages; outside it, send pre-approved templates. Order and booking templates include quick-reply buttons so a tap re-opens the window. | P0 |
| NOT-05 | Delivery status tracking (sent, delivered, read, failed) is stored. A failed WhatsApp notification falls back to push, then SMS (P1), then a dashboard badge. | P0 (push fallback), P1 (SMS) |
| NOT-06 | PWA push notifications via Web Push with an explicit opt-in flow explaining the benefit. | P0 |
| NOT-07 | Notification throttling and batching for high-volume vendors (e.g. grouped digests for non-urgent events). | P1 |
| NOT-08 | Quiet hours for non-urgent notifications. | P1 |
| NOT-09 | Weekly summary to vendors on WhatsApp (earnings, orders, top item). | P1 |
| NOT-10 | Message templates are versioned, translated and tracked for approval status. | P0 |

### 6.10 Vendor PWA (DASH)

| ID | Requirement | P |
|---|---|---|
| DASH-01 | Installable PWA (manifest, icons, service worker) with an app-like shell, tuned for Android Chrome and Samsung Internet; works on iOS Safari via "Add to Home Screen" with documented limitations. | P0 |
| DASH-02 | **Home screen:** today's bookings, new orders needing action, quick stats, and shortcuts (Add item, Share page). | P0 |
| DASH-03 | **Orders:** list with filters, detail view with all arrangement info, status actions, contact client. | P0 |
| DASH-04 | **Bookings:** calendar and list, accept/decline, reschedule, cancel, no-show. | P0 |
| DASH-05 | **Catalogue:** create, edit, hide, reorder items; image upload with camera support; category management. | P0 |
| DASH-06 | **Inventory:** stock counts, sold-out toggle, movement log. | P0 (counts, toggle), P1 (log) |
| DASH-07 | **Availability:** weekly schedule editor, exceptions, notice and buffer settings. | P0 |
| DASH-08 | **Payments:** balance, transactions, fees, payouts, payout settings. | P0 |
| DASH-09 | **Page editor:** links, theme, bio, logo, preview, share tools (copy link, QR, share cards). | P0 |
| DASH-10 | **Customers:** list built from orders and bookings with history and one-tap contact. | P1 |
| DASH-11 | **Analytics:** page views, link clicks, conversion, top items, revenue over time. | P1 |
| DASH-12 | **Offline behavior:** the shell and recently viewed data load offline; actions queue and sync when connectivity returns; clear offline indicators. | P1 |
| DASH-13 | **Low-data mode:** compressed images, no autoplay, minimal polling. | P1 |
| DASH-14 | In-app notification center mirroring WhatsApp notifications. | P0 |
| DASH-15 | Language toggle and settings (profile, notifications, sessions, plan). | P0 |
| DASH-16 | Installation prompt and onboarding checklist ("Add 3 items", "Share your link", "Set payout"). | P0 |

### 6.11 Client experience (CLI)

| ID | Requirement | P |
|---|---|---|
| CLI-01 | No account, no app install. Phone number plus name is enough. | P0 |
| CLI-02 | Checkout and booking flows are mobile-first, single column, with large tap targets and sensible defaults. | P0 |
| CLI-03 | Prices always shown in GHS with any fees displayed before payment. | P0 |
| CLI-04 | Clear payment instructions for the MoMo approval prompt (including what to do if no prompt arrives: dial the network's approval shortcode or retry). | P0 |
| CLI-05 | After purchase or booking, the client sees the code, summary and next steps, and can receive a WhatsApp confirmation (explicit opt-in). | P0 |
| CLI-06 | Order lookup by code plus phone. | P0 |
| CLI-07 | Trust signals: verification badge, vendor's contact options, refund policy, "Secure payment" indicator. | P0 |

### 6.12 Billing and plans (BIL)

| ID | Requirement | P |
|---|---|---|
| BIL-01 | Free plan with a platform fee per transaction and sensible limits (e.g. item count). | P0 |
| BIL-02 | Paid plan (monthly), payable by MoMo, with higher limits and branding removal. | P1 |
| BIL-03 | Fee and plan configuration is data-driven (no code change to adjust). | P0 |
| BIL-04 | Promotional programs (e.g. fee-free founding vendor period) are supported through configuration. | P0 |

### 6.13 Admin and operations (ADM)

| ID | Requirement | P |
|---|---|---|
| ADM-01 | Vendor directory with status, verification, activity, and the ability to suspend or restore pages. | P0 |
| ADM-02 | Support inbox for WhatsApp "Help" requests with conversation history and vendor context. | P0 |
| ADM-03 | View and act on orders, bookings, payments, refunds and payouts across vendors. | P0 |
| ADM-04 | Content moderation: reported pages/items, prohibited-item rules, takedown with reason. | P1 |
| ADM-05 | Manage fees, plans, promotions, reserved handles and feature flags. | P0 |
| ADM-06 | Template management and monitoring for WhatsApp messages (approval status, failures). | P0 |
| ADM-07 | Audit log of all admin and system-critical actions. | P0 |
| ADM-08 | Dashboards for the core metrics in Section 10. | P1 |

### 6.14 Trust and safety (TRU)

| ID | Requirement | P |
|---|---|---|
| TRU-01 | Verification levels: **Phone verified** (automatic via WhatsApp), **Identity verified** (Ghana Card or equivalent, P1), **Payout name matched**. Badges display accordingly. | P0 (phone), P1 (identity) |
| TRU-02 | Prohibited items and services policy enforced via reporting and review. | P0 |
| TRU-03 | Dispute flow: client can report an issue against an order code; admin can freeze payout and mediate. | P1 |
| TRU-04 | Vendor ratings or reviews (verified purchases only). | P2 |
| TRU-05 | Fraud signals: velocity limits, repeated failed payments, suspicious refund patterns. | P1 |

---

## 7. Non-functional requirements

### 7.1 Performance
- NFR-P1. Public vendor page: Largest Contentful Paint under 2.5 s on a mid-range Android phone on a throttled 4G connection; initial JavaScript under about 100 KB gzipped; images lazy-loaded and responsive.
- NFR-P2. Checkout interactions respond within 300 ms (excluding third-party payment latency).
- NFR-P3. WhatsApp bot replies within 3 seconds for simple commands (AI-parsed photo items may take longer, but the bot sends an acknowledgement immediately).
- NFR-P4. PWA dashboard is usable on 3G-class connections after first load.

### 7.2 Reliability and availability
- NFR-R1. Target 99.5% availability for MVP; payment and webhook endpoints are prioritized.
- NFR-R2. Webhook receivers acknowledge quickly and process asynchronously through a durable queue with retries and a dead-letter store.
- NFR-R3. All external callbacks (WhatsApp, payments) are idempotent and verified by signature.
- NFR-R4. Daily database backups with tested restore; point-in-time recovery if available.

### 7.3 Security
- NFR-S1. Row-level security ensures a vendor can only access their own data.
- NFR-S2. Secrets are stored in a managed secret store; none in the client bundle.
- NFR-S3. Magic links are single-use, short-lived and bound to the requesting number.
- NFR-S4. Input validation, output encoding, rate limiting, and CSRF protections follow OWASP guidance.
- NFR-S5. PII (phone, address) is encrypted in transit and at rest; access is logged.
- NFR-S6. Payment card data never touches the platform's servers (hosted fields or redirect with the aggregator).

### 7.4 Privacy and compliance
- NFR-C1. Comply with Ghana's Data Protection Act, 2012 (Act 843): lawful basis and consent, purpose limitation, data subject rights, and registration with the Data Protection Commission as required. *(Confirm current obligations with a local lawyer.)*
- NFR-C2. Comply with WhatsApp Business Platform policies: opt-in, template categories, quality ratings, and commerce policy.
- NFR-C3. Payments run through a licensed provider; confirm Bank of Ghana requirements before adding any fund-holding features such as escrow.
- NFR-C4. Clear Terms of Service, Privacy Policy and Refund Policy, in plain language.
- NFR-C5. Data retention and deletion policy; vendors can export or delete their data.

### 7.5 Usability and accessibility
- NFR-U1. Plain, simple English (and Twi later); no jargon in vendor-facing messages.
- NFR-U2. Tap targets of at least 44 px, sufficient contrast, readable font sizes, and screen reader labels on core flows.
- NFR-U3. Works on Chrome and Samsung Internet (last 3 years of Android), Safari on iOS, and degrades gracefully elsewhere.

### 7.6 Observability and operations
- NFR-O1. Structured logging with correlation IDs across webhook, queue and worker steps.
- NFR-O2. Error tracking, uptime monitoring and alerts for payment failures, webhook failures and queue backlog.
- NFR-O3. Product analytics events for the funnel in Section 10.
- NFR-O4. Per-vendor cost visibility (WhatsApp, SMS and AI parsing costs).

### 7.7 Cost
- NFR-X1. Variable cost per active vendor per month (messaging, AI parsing, storage) stays comfortably below expected revenue per vendor. Track and set alerts.

---

## 8. Core data entities (conceptual)

| Entity | Notes |
|---|---|
| **vendor** | WhatsApp number (unique), handle (unique), business name, bio, logo, status, plan, language, timezone, verification flags |
| **vendor_link** | Vendor, type, label, URL, position |
| **catalogue_item** | Vendor, type (product/service), name, description, price, price mode, category, images, visibility, sold-out flag |
| **item_variant** | Item, option values, price override, stock |
| **category** | Vendor, name, position |
| **stock_movement** | Item/variant, delta, reason, source, time |
| **service_config** | Item, duration, buffer, deposit rule, location type, confirmation mode, notice/advance rules |
| **availability_rule** | Vendor/service, weekday, start/end times |
| **availability_exception** | Vendor/service, date range, blocked or special hours |
| **booking** | Code, vendor, service, client, time range, status, payment status, notes |
| **order** | Code, vendor, client, status, delivery method/address, totals, payment status |
| **order_item** | Order, item/variant, quantity, unit price snapshot |
| **client** | Name, WhatsApp number (guest; deduplicated per vendor) |
| **payment** | Order/booking reference, provider reference, channel, amount, status |
| **ledger_entry** | Vendor, type (payment, fee, refund, payout), amount, reference |
| **payout** | Vendor, amount, destination, status, provider reference |
| **notification** | Recipient, event, channel, template, status, timestamps |
| **wa_conversation** | Vendor/number, state machine position, context JSON, last activity |
| **wa_message** | Provider message ID (unique), direction, type, payload, processed flag |
| **dispute / report** | Reference, reason, status, resolution |
| **audit_log** | Actor, action, target, metadata |
| **waitlist_signup** | WhatsApp number (unique, E.164), business type, business name, city (optional), source/UTM, consent text and timestamp, status (waiting, invited, onboarded, unsubscribed), position, invited_at, onboarded vendor reference |
| **reserved_handle** | Handle, waitlist signup, reserved_at, expires_at, status |
| **referral** | Referrer signup, referred signup, created_at, reward status |

Key constraints to implement: unique handle, unique WhatsApp number per vendor, unique order and booking codes, **non-overlapping booking time ranges per vendor/resource** (database-level exclusion constraint), unique `wa_message` provider IDs for idempotency, prices stored as integers in pesewas.

---

## 9. Integrations

| Integration | Purpose | Notes |
|---|---|---|
| **WhatsApp Business Platform (Cloud API)** | Onboarding bot, notifications | Requires Meta business verification, display name approval and template approval. **Start these in week 0, they take time.** Verify current conversation pricing and messaging limits. |
| **Payment aggregator** | MoMo and card collection, MoMo payouts, refunds, name lookup | Candidates: Paystack, Hubtel, Flutterwave. Evaluate MoMo fees, payout speed, split payments/sub-accounts, KYC time, webhook reliability, and support. **Decision pending.** |
| **LLM API (Claude)** | Parsing photo captions, text lists, natural-language availability and edits; image understanding for item names | Structured JSON output, schema validation, human confirmation always; log inputs/outputs for quality review (with consent and PII care). |
| **Speech-to-text** | Voice-note transcription | P1 |
| **Web Push** | PWA notifications | VAPID keys; fallback to WhatsApp |
| **SMS provider** | Fallback notifications, OTP backup | P1; choose a Ghana-capable gateway |
| **Object storage + CDN + image processing** | Item and logo images | Auto-resize and compress |
| **Analytics and error tracking** | Funnel metrics, errors | Respect privacy and consent |

---

## 10. Success metrics

**Waitlist and landing page** (first 30 days after launch)
- Landing page visitor-to-signup conversion (a reasonable first target is above 15% from warm traffic such as your own network and vendor communities, and above 5% from cold traffic; treat these as starting heuristics, not promises)
- Waitlist size and daily growth; share from referrals; cost per signup if any ads are used
- % of signups who tap "Confirm on WhatsApp" (target above 40%)
- % of signups who reserve a handle
- Invite-to-onboarding-start rate and waitlist-to-live-page rate (the real test of waitlist quality)
- Headline and CTA variant performance

**Activation**
- Median time from first WhatsApp message to live page (target < 10 min)
- % of started onboardings that reach a live page (target > 60%)
- % of vendors with at least 3 items within 24 hours of go-live

**Engagement**
- % of live vendors who share their link within 7 days
- Weekly active vendors (any dashboard or WhatsApp management action)
- Share of vendor actions done via WhatsApp vs PWA

**Transaction**
- Page-to-checkout conversion; checkout-to-payment success rate
- Orders/bookings per active vendor per week
- GMV and platform revenue
- Payout time (target: under 24 hours)

**Quality and trust**
- Payment webhook failure rate; notification delivery rate
- Dispute and refund rate
- No-show rate for bookings with vs without deposits

**Pilot success (first 60 to 90 days)**
- 20+ vendors live, 10+ with real transactions
- Vendors say they would be "very disappointed" if the product disappeared (survey)
- At least some vendors willing to pay through fees or a plan

---

## 11. Assumptions, risks and open questions

### Assumptions
- A1. Most target vendors use WhatsApp daily and are comfortable sending photos and short messages.
- A2. Clients are comfortable paying by MoMo prompt on a web checkout.
- A3. Vendors will accept a per-transaction fee more readily than a subscription.

### Risks
| Risk | Mitigation |
|---|---|
| WhatsApp business verification or template approval delays | Start in week 0; build the bot against the test number first |
| AI parsing errors produce wrong prices | Always confirm before publish; rules-first parsing for simple patterns; track correction rate |
| WhatsApp messaging costs erode margin | Use free-form replies in-window; limit templates; monitor per-vendor cost |
| Fake or abusive vendors | Verification levels, reporting, payout holds for new vendors |
| Payment aggregator limits or onboarding time | Apply early; keep a provider abstraction so a second provider can be added |
| Regulatory exposure when holding funds | Use licensed aggregator settlement; get legal advice before escrow |
| Vendors don't return after setup | Daily value hooks: order alerts, sold-out via chat, weekly summaries |
| iOS PWA push limitations | WhatsApp as primary channel; push as secondary |

### Open questions
1. Product name, domain and handle format (`/{handle}` vs subdomain)?
2. Which aggregator(s) and what are the exact MoMo collection and payout fees and settlement times?
3. Is the platform fee charged to the vendor, the client, or split?
4. Do clients get a WhatsApp confirmation by default, or only on opt-in?
5. Which category is the launch niche (beauty, thrift, food, campus vendors)?
6. How are delivery fees handled at launch: fixed zones, vendor-set after order, or client-arranged?
7. Is escrow-lite feasible within the chosen provider's rules, and is legal review needed?
8. Which languages beyond English and Twi are needed (e.g. Pidgin, Ga, Ewe)?
9. What is the exact, defensible basis for the "GH₵4,000" comparison (own quotes, three competitor quotes), and how will "free" be worded given the fee on online payments?
10. How many waitlist spots and what perks make up the Founding Vendor offer, and how long do handle reservations last?
11. Which sample vendor photos power the landing-page gallery (design-partner vendors with permission, or licensed images)?

---

## Appendix A: Sample WhatsApp onboarding conversation

```
Vendor: START
Bot:    Hi! Welcome to [Platform]. I'll help you set up your online shop in a few minutes, right here in WhatsApp.
        By continuing you agree to our Terms and Privacy Policy: [link].
        [ I agree ]  [ Read terms ]

Vendor: (taps I agree)
Bot:    Great. What's your business called?

Vendor: Ama's Glow Studio
Bot:    Nice name. What do you do?
        [ I sell products ]  [ I offer services ]  [ Both ]

Vendor: (taps Both)
Bot:    Your page link can look like:
        [ amasglow ]  [ amas-glow-studio ]  [ Type my own ]

Vendor: (taps amasglow)
Bot:    amasglow is yours. Your page will be at [platform]/amasglow.
        Now add your first product. Send a photo with the name and price,
        like: "Vitamin C serum 120".

Vendor: (sends photo) Vitamin C serum 120 only 8 left
Bot:    Here's what I understood:
        - Vitamin C serum
        - GHS 120.00
        - Stock: 8
        [ Confirm ]  [ Edit ]  [ Cancel ]

Vendor: (taps Confirm)
Bot:    Added! Send another, or tap below.
        [ Add a service ]  [ Set up payments ]  [ Go live ]

Vendor: (taps Add a service)
Bot:    What's the service and price? Example: "Bridal makeup 600".

Vendor: Bridal makeup 600, takes 2 hours, deposit 200
Bot:    - Bridal makeup
        - GHS 600.00, 2 hours
        - Deposit: GHS 200.00
        [ Confirm ]  [ Edit ]  [ Cancel ]

Vendor: (taps Confirm)
Bot:    When are you available? Example: "Mon to Fri 9am to 5pm, Sat 10 to 2".

Vendor: Tuesday to Saturday 8am to 6pm
Bot:    Got it:
        Tue-Sat: 8:00 AM - 6:00 PM. Sun and Mon: closed.
        [ Looks right ]  [ Change ]

Vendor: (taps Looks right)
Bot:    Last step: where should we send your money? Choose your MoMo network.
        [ MTN ]  [ Telecel ]  [ AirtelTigo ]  [ Later ]

Vendor: (taps MTN) 024XXXXXXX
Bot:    The account name is "AMA K. MENSAH". Is that you?
        [ Yes ]  [ No ]

Vendor: (taps Yes)
Bot:    You're live: [platform]/amasglow
        Here's a message you can forward to your customers, and a picture for your status.
        [ Open dashboard ]  [ Share my page ]  [ Menu ]
```

## Appendix B: Sample vendor notifications

**New order (template with buttons)**
```
New order ORD-4F9K (Paid)
2 x Vitamin C serum
Buyer: Kofi A., 0244XXXXXX
Delivery: Adum, near Rattray Park
Total: GHS 255.00
[ Confirm ]  [ Contact buyer ]  [ Open ]
```

**New booking request**
```
Booking request BKG-7T2M
Bridal makeup, Sat 15 Nov, 9:00 AM
Client: Efua B., 0555XXXXXX (deposit GHS 200 paid)
[ Accept ]  [ Suggest new time ]  [ Decline ]
```
