# PLAN: sikatree

| | |
|---|---|
| **Version** | 0.3 (draft): fee model, Pro tier, payouts and referral program decided (section 16) |
| **Date** | 2026-11-06 |
| **Companion docs** | `requirement.md` (requirement IDs such as `ONB-10` and `LP-12` are referenced below), `DESIGN.md` |
| **Parent brand** | Ostra (minor design accents only; see `DESIGN.md`) |

---

## 1. Planning assumptions

- **Team:** one primary developer, using AI assistance, working in parallel with other commitments. Timeline assumes roughly 20 to 25 focused hours per week. Adjust dates if capacity differs.
- **Goal of this plan:** reach a **live pilot with about 20 vendors in about 10 weeks**, then iterate based on usage.
- **Strategy:** build **vertical slices** that vendors can actually use, not layers. Each phase ends with something a real vendor can try.
- **WhatsApp-first:** the bot is the primary vendor interface in the first phases. The PWA dashboard is built right behind it, and the two share the same backend services so nothing is implemented twice.
- **The landing page and waitlist ship first** (target: live within 7 days) and keep running for the whole build. They collect demand, test messaging, reserve handles, and supply the first vendors to onboard. The 10-week product timeline below runs in parallel with the waitlist, not after it.
- **Long-lead items start immediately** (Meta business verification, WhatsApp templates, payment aggregator KYC), because they are outside our control and can block launch.

## 2. Guiding principles

1. **One domain layer, two interfaces.** Business logic (create item, place order, book slot, record payment) lives in shared services. The WhatsApp bot and the PWA are both thin clients of those services.
2. **Every external event is idempotent.** WhatsApp messages, payment webhooks and notification sends can all arrive twice.
3. **Confirm before publish.** AI-parsed data always goes through a vendor confirmation step.
4. **Money logic is boring and well-tested.** Integer pesewas, ledger entries, no floating point.
5. **Measure from day one.** Instrument the onboarding funnel (time to live page, drop-off by step) from the first bot version.
6. **Provider abstraction** for payments and messaging, so a second provider can be added without rewrites.

---

## 3. Technology decisions

| Area | Choice | Status | Notes |
|---|---|---|---|
| Web framework | **Next.js (App Router) + TypeScript** | Proposed | SSR for fast public pages; the same codebase serves the PWA |
| Styling | Tailwind CSS + a small component library | Proposed | Keep bundle small |
| Database / auth / storage | **Supabase** (Postgres, Storage, RLS, Edge Functions) | Proposed | Custom auth via WhatsApp magic link (see 6.4) |
| Queue / background jobs | Postgres-based queue (`pgmq`) or a hosted queue (e.g. QStash) + scheduled jobs (`pg_cron`) | To decide | Needed for webhooks, retries, reminders, hold expiry |
| PWA | Web App Manifest + service worker (e.g. Serwist) + Web Push | Proposed | Android-first |
| WhatsApp | **WhatsApp Business Platform, Cloud API** (direct from Meta, or via a BSP) | To decide | Direct is cheaper; a BSP can ease approval and tooling |
| Payments | **Paystack** (1.95% on cards, MoMo and bank transfer; GHS 1 per MoMo payout) | Decided, pending KYC | Keep the provider interface so a second provider can plug in; criteria in 3.1 guide the fallback |
| LLM parsing | Claude API with structured (JSON schema) output; rules-first for simple patterns | Proposed | Cheaper model for text, vision-capable model for photos; cost and accuracy tracked |
| Hosting | Cloudflare (web, about $5 per month on the current implementation) + Supabase Pro (data/functions, about $25 per month) | Decided | Check regional latency for Ghana users; CDN images; recheck Cloudflare cost as traffic grows |
| Observability | Sentry (errors), PostHog or similar (analytics), uptime monitor | Proposed | |
| Testing | Vitest/Jest (unit), Playwright (e2e), WhatsApp payload fixtures | Proposed | |
| CI/CD | GitHub Actions, preview deployments per PR | Proposed | |

### 3.1 Payment provider decision criteria (Phase 0)
Score each candidate on: MoMo collection fee, card fee, payout-to-MoMo availability and fee, settlement speed, split payments or sub-accounts (for platform fees), refund API, MoMo name-lookup API, webhook reliability and signature scheme, KYC and onboarding time for a platform business, support responsiveness, and sandbox quality. Pick one primary; design the interface so a second can plug in.

---

## 4. Architecture overview

```
                   +----------------------+
Client (browser) → |  Public pages (SSR)  | ─┐
                   |  Checkout / Booking  |  │
                   +----------------------+  │
                                             ▼
Vendor PWA  ───────►  Next.js app / API  ──►  Domain services  ──►  Postgres (Supabase)
                          ▲                    (catalogue, orders,     │  RLS, ledger,
WhatsApp  ──webhook──►  Webhook receiver       bookings, payments,     │  exclusion constraints
Cloud API                (verify signature,    notifications)          │
   ▲                      store raw, enqueue)         ▲                ▼
   │                            │                     │          Object storage + CDN
   │                            ▼                     │
   │                      Queue / worker ─────────────┤
   │                    (conversation engine,         │
   │                     LLM parsing, reminders,      │
   │                     payouts, expiry jobs)        │
   │                            │                     │
   └──── send messages ◄────────┘          Payment aggregator ◄── webhooks (signed)
```

**Key flows**

- **Inbound WhatsApp:** webhook → verify signature → insert `wa_message` (unique provider ID) → enqueue → conversation engine loads state → handler calls domain services → replies through the send API.
- **Payment:** client checkout creates a pending payment → aggregator prompt → signed webhook → verify with provider API → mark paid, write ledger entries, decrement stock or confirm booking, enqueue notifications.
- **Notification:** event → notification service → choose channel by preference and WhatsApp window state → send → track delivery → fallback if failed.

---

## 5. Repository layout (suggested)

```
/apps
  /web                 Next.js: public pages, checkout, vendor PWA, admin
/packages
  /domain              business logic: catalogue, orders, bookings, ledger
  /whatsapp            client, message builders, templates, conversation engine
  /parsing             rules + LLM parsers, schemas, eval fixtures
  /payments            provider interface + adapter(s)
  /notifications       channel routing, templates, fallbacks
  /db                  migrations, seed data, generated types
  /i18n                translation catalogues (en, tw)
/docs                  requirement.md, PLAN.md, ADRs, runbooks
/scripts               one-off tooling (template sync, data fixes)
```

A simple monorepo (pnpm workspaces) is enough. If it feels heavy at the start, begin with folders inside one Next.js app and extract packages as boundaries solidify.

---

## 6. Technical design notes

### 6.1 Data model essentials
- Money stored as **integer pesewas**; currency fixed to GHS.
- `booking` uses a time range column with a **Postgres exclusion constraint** (`btree_gist`) to prevent overlapping bookings for the same vendor/resource; this is the final guard against double-booking, with a transaction around slot confirmation.
- Order and booking codes: short, uppercase, Crockford-style base32 without ambiguous characters, with a prefix (`ORD-`, `BKG-`), generated with collision retry.
- `wa_message.provider_message_id` is **unique**, which gives idempotency for webhook retries.
- `ledger_entry` is append-only; balances are derived.
- Stock holds: a `stock_hold` table with expiry; a scheduled job releases expired holds.
- Row-level security on every vendor-owned table; service-role access only in server code.

### 6.2 WhatsApp conversation engine
- **State machine per vendor number** stored in `wa_conversation` (state, context JSON, last activity).
- Each state defines: prompt, accepted inputs (buttons, text patterns, media), validators, next state.
- **Global intents** (menu, help, stop, language) work in any state.
- **Pipeline for text and media:** normalize message → try deterministic parsers (regex for `name price` patterns, list splitting, price formats) → fall back to LLM extraction with a strict JSON schema → validate (price range sanity, name length, duplicates) → build confirmation message → apply on confirm.
- **Photo items:** download media from the Cloud API, store, generate thumbnails, send to the vision-capable model with the caption; if there is no caption, ask for the name and price rather than guessing.
- **Availability parser:** natural language → structured weekly rules → rendered back as a human summary for confirmation.
- **Timeouts:** state expires gracefully; reminders obey WhatsApp's rules (templates outside the 24-hour window, capped at 2).
- **Observability:** log each step with correlation IDs; track correction rate (how often vendors tap Edit) as the parsing quality metric.
- **Evaluation set:** collect (with consent) anonymized examples of real vendor messages to build a regression test set for parsers from week 1.

### 6.3 WhatsApp 24-hour window and templates
- Vendors start the conversation, which opens a 24-hour window for free-form interactive replies.
- Outside the window, only **approved templates** can be sent. Submit these in Phase 0 so they are approved before they are needed:
  1. `vendor_new_order` (with Confirm / Contact buttons)
  2. `vendor_new_booking` (with Accept / Decline buttons)
  3. `vendor_payment_received`
  4. `vendor_payout_sent`
  5. `vendor_setup_reminder`
  6. `vendor_login_link` (authentication-style)
  7. `client_order_confirmation`
  8. `client_booking_confirmation`
  9. `client_booking_reminder`
  10. `vendor_weekly_summary` (P1)
  11. `waitlist_welcome` (sent after landing-page signup; submit first, since Phase L needs it)
  12. `waitlist_invite` (invites a vendor to start onboarding, with a "Start now" button)
- Quick-reply buttons on order and booking templates re-open the window when tapped, which lets follow-up interaction be free-form.
- Verify current template categories, pricing and messaging limits with Meta's documentation before finalizing, since these change.
- **Cost note (checked 2026-11-06):** from 1 Oct 2026 Meta charges replies inside the 24-hour window (service messages) at the utility rate after 1,000 free per business phone number a month, and also charges in-window utility templates. Ghana is in the Rest of Africa band: about $0.004 per utility, service or authentication message and $0.0225 per marketing message. Bot traffic is therefore a real cost line (section 16).

### 6.4 Authentication
- Vendor identity = verified WhatsApp number (they messaged us from it).
- **Magic link:** bot generates a single-use, short-lived token tied to the vendor, sent as an "Open dashboard" button. Exchange the token for a session on the web app.
- Sessions via secure, HTTP-only cookies; device list and revocation in settings.
- Implement through a custom auth flow that issues sessions compatible with Supabase RLS (e.g. a signed JWT carrying the vendor ID), or use Supabase auth with a custom phone provider. Decide in Phase 1 with a short spike.

### 6.5 Payments
- `PaymentProvider` interface: `createCollection`, `verifyCollection`, `refund`, `createPayout`, `lookupAccountName`, `parseWebhook`.
- Checkout creates a pending `payment`; the confirmation path is **webhook plus server-side verification**, never the browser redirect.
- Fee calculation in one module with unit tests; fee configuration stored in the database. Decided model (section 16): 1.5% platform fee charged to the buyer plus 1.5% charged to the vendor; the buyer total is `(price + buyer fee) / (1 - 0.0195)` so Paystack's 1.95% is covered by the buyer.
- Payout job: runs as a **weekly batch** by default and aggregates vendor balance (net of fees and holds), applies minimum payout, calls provider, records status, notifies the vendor. **Instant payout** is available on request for an extra fee (planned GHS 3, configurable).
- Referral accruals (section 16.5) are ledger entries, paid as wallet credit or fee discount after the refund window closes.
- Reconciliation job: compare ledger to provider reports daily, alert on mismatches.

### 6.6 Booking engine
- Availability stored as rules and exceptions; **slots computed on demand** for a requested date range in Africa/Accra (GMT, no daylight saving, which simplifies logic).
- Slot algorithm: expand weekly rules for each date, subtract exceptions, subtract existing bookings and holds including buffers, apply minimum-notice and maximum-advance limits, then split by duration at a defined step (e.g. 15 or 30 minutes).
- Booking creation runs in a transaction: insert pending booking with hold expiry (exclusion constraint enforces no overlap), start payment, confirm on webhook, release the hold on expiry.
- Reminder scheduling through the job queue.

### 6.7 PWA specifics
- Manifest, icons, theme color, standalone display, shortcuts (Add item, Orders).
- Service worker: cache app shell and static assets; network-first for data with short cache; background sync for queued actions (P1).
- Web Push with VAPID; permission requested after the vendor has seen value (e.g. after the first order or when installing), not on first load.
- iOS: document the "Add to Home Screen" steps; do not depend on push there.
- Performance budget enforced in CI (bundle size checks, Lighthouse on key pages).

### 6.8 Security checklist
RLS tests per table, webhook signature verification (WhatsApp and payments), rate limits on public endpoints and the bot, input validation on all parsed data, signed upload URLs, content-type checks on media, secrets management, dependency scanning, audit logging for admin actions. Account takeover is handled separately in 6.9.

### 6.9 Account takeover hardening (deferred, not launch-blocking)

The launch flow stays as it is: a WhatsApp magic link, single use, 15 minutes, then a 30-day device session. No PIN, no recovery codes and no second app during onboarding. That is a deliberate onboarding trade-off.

The risk is WhatsApp account takeover. With no second factor, whoever controls the vendor's WhatsApp can request a link and see customer contact details and the catalogue. We accept that for launch and stage the mitigation so it arrives after the vendor has seen value.

**Wave 1: before payouts are enabled, and no later than Phase 3 exit**
- Magic link confirmation page with a Continue button. Redeem only on POST, so previews and scanners cannot consume the token.
- Link lifetime 5 to 10 minutes, one use, rate limits per phone and IP.
- Device and session list with last seen, plus Sign out everywhere.
- Freeze process: support revokes sessions and pauses the page when a vendor reports a takeover.
- WhatsApp two-step verification nudge after go-live.
- Mask customer phone and address until the vendor taps reveal.
- Optional passkey or PIN prompt after the first order, skippable.

**Wave 2: before payouts go live**
- Step-up re-authentication for payout number, phone, email and PIN changes.
- Admin TOTP (AUTH-05).
- Recovery through support identity checks and one-time recovery codes, never WhatsApp alone.
- Payout changes held for manual review at first.

**Wave 3: after pilot**
- Passkeys as the primary new-device factor.
- Login alerts on a second channel.
- Anomaly checks on link requests and device changes.
- Support can revoke sessions without a database console.

**Do not** add a PIN or recovery codes to the onboarding chat, block go-live on these items, or make the magic link harder to use before Wave 1 ships. The current link plus 30-day session is the launch behaviour.

---

## 7. Delivery phases

> Week numbers are relative to project start. Each phase lists deliverables and exit criteria.

### Phase L: Landing page and waitlist (Week 0 to 1, ships first, then keeps running)

**Goal:** a fast, memorable landing page that turns attention into WhatsApp-verified waitlist signups and reserved handles, within about 7 days, using the visual direction in `DESIGN.md`.

**Seven-day build rhythm**

| Day | Focus |
|---|---|
| 1 | Pick the working name and domain; finalize the headline set (3 variants) from the copy bank; collect 12 to 16 sample vendor photos (real design-partner items with permission, or licensed images) |
| 2 | Design tokens, typography, hero with floating gallery tiles, section layouts (mobile first) |
| 3 | Build the page in Next.js (static route `/`): hero, problem strip, how-it-works, gallery, comparison, features, FAQ |
| 4 | Waitlist backend: `waitlist_signup`, `reserved_handle`, `referral` tables; insert-only server action; phone normalization; dedupe; rate limit and bot protection |
| 5 | Success state (position, referral link, "Confirm on WhatsApp"), WhatsApp welcome message, analytics events, consent and privacy pages |
| 6 | QA on real low-end Android devices and throttled network; performance budget; OG image and share previews; soft launch to your own network |
| 7 | Public launch push (see distribution below); watch analytics; fix the top drop-off |

**Build checklist**
- [ ] Landing page sections and copy (LP-01, LP-02), with at least 2 headline variants wired for testing (LP-24, P1)
- [ ] Gallery hero with tilted tiles and a static fallback (LP-03)
- [x] Performance budget enforced in CI: LCP, JS size, image weights (LP-04; JS budget set at 130 kB because the Next framework floor is 102 kB, see `docs/PERFORMANCE.md`)
- [x] SEO metadata, Open Graph image, favicon, WhatsApp share preview (LP-05, LP-06)
- [x] Waitlist form with 3 fields, Ghana phone formats, consent line (LP-09, LP-10)
- [x] Handle reservation with real-time availability (LP-11)
- [x] Duplicate detection and position-in-line (LP-12, LP-14)
- [x] "Confirm on WhatsApp" deep link opening the 24-hour window (LP-12)
- [ ] WhatsApp welcome template submitted for approval and sent after signup (LP-13); until approved, show the confirmation on-page and via SMS or email fallback if collected
- [x] Founding Vendor offer block, configurable (LP-16, `lib/offer.ts`)
- [ ] Anti-abuse: rate limits, honeypot, bot challenge (LP-19)
- [x] Analytics funnel and UTM capture (LP-20)
- [x] Basic admin: waitlist list, filters, CSV export, status field (LP-21)
- [ ] Unsubscribe and privacy notice (LP-23, LP-25)

Backend detail, environment variables and the operational runbook live in
`docs/WAITLIST.md`.

**Distribution plan (the page is useless without traffic)**
1. Reply to every inbound website request with the waitlist link and a one-line pitch: "Skip the GH₵4,000 website. Get a free store link."
2. Post short vertical videos and screenshots from the pain (typing prices 50 times, fake MoMo screenshots) on your own TikTok, Snapchat, Instagram and WhatsApp status.
3. Seed 5 to 10 vendor-friendly WhatsApp groups and campus communities (KNUST and others) with a personal message, not spam.
4. Ask 10 design-partner vendors to share their reserved link ("my store is coming soon at ...") on their status.
5. Use the referral mechanic (P1) to reward vendors who bring other vendors.
6. Optional small paid test (Meta ads or Snapchat ads) with two headline variants, after the page converts well organically.

**Waitlist to onboarding handoff**
- Invite in batches of 10 to 25 vendors as the WhatsApp bot becomes ready in Phase 1 (LP-22).
- Invite message deep-links to the bot with prefilled "START"; signup data (type, business name, reserved handle) prefills onboarding so the first minutes are faster.
- Track waitlist-to-live-page conversion, not just waitlist size.

**Exit criteria**
- Landing page live on the production domain with the performance budget met
- At least 100 real signups in the first 30 days, or a clear diagnosis of why not (traffic vs conversion)
- At least 40% of signups tap "Confirm on WhatsApp"
- A ranked list of 20 vendors in the launch niche ready to invite
- Winning headline variant identified from real data

---

### Phase 0: Validate and unblock (Week 0 to 1)

**Business and compliance (start day 1, run in parallel)**
- [ ] Start Meta Business verification and create a WhatsApp Business account with a dedicated number
- [ ] Choose and apply for the payment aggregator account (KYC can take days to weeks); get sandbox keys
- [ ] Submit WhatsApp message templates for approval (list in 6.3)
- [ ] Register the domain; reserve social handles; decide the working name
- [ ] Get legal input on Terms, Privacy Policy and Data Protection registration; confirm whether any planned feature (escrow) needs extra licensing

**Validation**
- [ ] Interview 10 to 15 vendors from one niche (how they take orders, collect payments, handle bookings; what annoys them)
- [ ] Shortlist 5 to 10 "design partner" vendors from your inbound website requests
- [ ] Collect 50+ real vendor messages (photo captions, price formats, availability phrasing) as the first parser test set
- [ ] Decide the launch niche. Fee model decided on 2026-11-06 (section 16); confirm the buyer-facing 1.5% with a checkout test in the pilot

**Engineering setup**
- [ ] Repo, CI, environments (dev, staging, prod), error tracking
- [ ] Project skeleton, database migrations setup, seed data
- [ ] Architecture decision records for open decisions in Section 3

**Exit criteria:** Meta verification and aggregator applications in progress or done; at least 5 design-partner vendors committed; test dataset exists; dev environment running with a WhatsApp test number receiving webhooks.

---

### Phase 1: WhatsApp onboarding vertical slice (Week 1 to 3)

**Goal:** A vendor can message the bot, set up a business, add products by photo or text, and get a live page link. The page can be basic.

**Build**
- [ ] Database: vendors, links, items, categories, wa_message, wa_conversation, notifications
- [x] WhatsApp webhook receiver (signature check, idempotent store, durable queue with retries)
- [ ] Message sender with interactive buttons and lists; delivery status tracking
- [x] Conversation engine: state machine, global intents (menu, help, stop, language), resume
- [ ] Onboarding steps (ONB-01 to ONB-09): consent, business name, type, handle, optional logo
- [ ] Item creation by photo plus caption and by text list (ONB-10 to ONB-16) with confirmation
- [ ] Parsers: price formats, list splitting, rules-first then LLM fallback, validation
- [x] Handle availability and reserved-handle checks
- [x] Minimal public page `/{handle}`: name, bio, links, items with prices (PG-01 to PG-03 basics)
- [x] Magic link generation and a bare-bones session exchange (ONB-20, AUTH-01)
- [ ] Funnel analytics: step reached, time to live page, parse-correction rate (partial: median time to live is in admin; step dropout and correction rate still follow)
- [x] Support handoff: "Help" forwards to an internal inbox or a human WhatsApp number (ONB-25)
- [ ] English copy catalogue with i18n structure ready for Twi
- [x] Waitlist handoff: recognize waitlist members by WhatsApp number, prefill business type, name and reserved handle, and mark them "onboarded" on go-live (LP-22)
- [ ] Apply the `DESIGN.md` tokens, tile component and pill buttons to the public vendor page so it matches the landing page's gallery look

**Test**
- [ ] Fixture-based tests for parsers using the Phase 0 message set
- [x] Simulated conversation tests (scripted message sequences through the engine)
- [ ] Run onboarding with 3 to 5 design partners, watching real behavior

**Exit criteria:** 5 design-partner vendors reach a live page via WhatsApp alone; median onboarding under 15 minutes (tighten to 10 later); parse-correction rate measured; no duplicate items from retried webhooks.

---

### Phase 2: Public storefront, checkout and payments (Week 3 to 5)

**Goal:** Clients can buy products and pay with MoMo; vendors get orders on WhatsApp.

**Build**
- [ ] Polished public page with themes, link buttons, categories, item detail pages, OG tags, share links (PG-02 to PG-05, CAT-01 to CAT-06)
- [ ] Image pipeline: compression, responsive sizes, CDN (CAT-04)
- [ ] Cart and guest checkout: contact, pickup or delivery, address, notes (ORD-01 to ORD-03)
- [x] Order codes and lifecycle (ORD-04, ORD-05); client tracking page (ORD-07) (offline lifecycle; the Paid state waits for payments)
- [ ] Payment provider adapter: MoMo and card collection, webhook verification (PAY-01, PAY-02, PAY-09)
- [ ] Ledger and fee calculation: 1.5% buyer fee + 1.5% vendor fee, buyer total grossed up for Paystack's 1.95% (PAY-03, PAY-04)
- [ ] Pay-offline / pay-on-delivery mode (ORD-08)
- [ ] Inventory: optional stock, holds, sold-out (INV-01 to INV-03, INV-06) (partial: atomic decrement and Sold out shipped; payment-time holds and the toggle UI are deferred)
- [x] Vendor order notifications on WhatsApp with action buttons (ONB-24, NOT-01, NOT-04) (text alert with a dashboard link; action buttons wait for approved templates)
- [ ] Client confirmation (WhatsApp template with opt-in, or on-page code) (NOT-02, CLI-05)
- [ ] Chat commands: sold out, change price, my orders (ONB-22, ONB-23 partial)
- [ ] Performance budget and Lighthouse checks on public pages

**Test**
- [ ] Payment sandbox end-to-end tests; duplicate webhook tests; timeout and failure paths
- [ ] Stock race tests (two buyers, one item)
- [ ] Real-money test with small amounts across MTN, Telecel and AirtelTigo
- [ ] Load test on public pages and webhook receivers (modest scale)

**Exit criteria:** A real client completes a real MoMo payment to a design-partner vendor; vendor sees the order on WhatsApp within seconds; ledger balances match the aggregator; no oversold stock in race tests.

**Status (2026-11-05):** the cart, guest checkout, server-computed totals, order codes, pay-on-delivery note and the order success state shipped early on the public storefront. The order loop now also includes a vendor orders section with status actions, a WhatsApp alert with a dashboard login link, and a public `/o/{code}` tracking page. Tracked stock now decrements atomically at placement and restores on cancellation. The support inbox and the ONB-21 time-to-live metric are live in admin. Vendors can now add and edit items, upload one photo, set price, stock, category, visibility and manual sold out from the dashboard. Online payment, payment-time stock holds, the stock movement log, low-stock alerts, multiple images, variants, drag reorder, category management, client notifications and interactive WhatsApp actions remain deferred. The table below is the deferred register.

**Deferred or partial from the order loop**

| Area | What ships now | Deferred | Requirement | Target |
|---|---|---|---|---|
| Online payments | Pay on delivery, pickup or appointment | MoMo/card collection, signed webhooks, retries | PAY-01, PAY-02, PAY-09 | Phase 2, after aggregator KYC |
| Ledger and fees | None | Double-entry ledger, platform fee split (1.5% buyer, 1.5% vendor), grossed-up buyer total, referral accruals, reconciliation | PAY-03, PAY-04, PAY-10 | Phase 2 |
| Delivery fee | Vendor-configurable free / fixed (with within-region and outside-region rates) / confirm-after, set from the dashboard; clients can pay the delivery fee in cash on arrival, and confirm-after orders let the vendor set the fee on the order | None | ORD-03 | Done (2026-11-05) |
| Order lifecycle | `pending → confirmed → ready → completed` or `cancelled` from the dashboard, with an optional cancellation reason shown on the tracking page | Paid and Refunded states, refunds, client WhatsApp notification, WhatsApp action buttons | ORD-05, ORD-10 | Phase 2/3 |
| Vendor notification | WhatsApp text with the code, items, total, customer, delivery details and a dashboard login link | Interactive Confirm/Decline/Mark ready buttons, approved templates, delivery fallback | ORD-06, ONB-24, NOT-01, NOT-04 | Phase 2 |
| Client tracking | `/o/{code}` shows status, items, total and ETA, plus a reorder button; the customer's address, email and phone are not shown | Phone verification for sensitive details, live ETA | ORD-07, ORD-12 | Phase 2/3 |
| Client notifications | Email captured and stored | Email sending, receipts, status emails | NOT-02, PAY-07 | Notifications phase (email is P2) |
| Order tools | Active orders on the dashboard, a `/dashboard/orders` archive with All / Active / Completed / Cancelled filters, a hamburger menu and vendor CSV export | None | DASH-03, ORD-11, ORD-12 | Done (2026-11-06) |
| Inventory | Tracked stock decrements atomically at placement and restores on cancellation; zero stock shows Sold out; unlimited stock stays null; manual sold out, a stock movement log and low-stock alerts | Payment-time 15-minute holds | INV-01 to INV-06 | Phase 2/3 |
| Catalogue tools | Create and edit items with up to five photos (cover + tap-to-open lightbox gallery), price, compare-at, description, category, product/service kind, stock, visibility, badge and position; a vendor selling both gets separate Products/Services tabs and carts; up/down reorder; managed, ordered categories; hide and manual sold out | Variants, the featured flag, drag-and-drop, image compression and responsive sizes | CAT-02, CAT-04, CAT-05, CAT-09, DASH-05 | Phase 3 |
| Services | Weekly availability (multiple windows/day), blocked dates, optional weekly cap and a slot engine; the storefront offers only open slots and the server re-checks them; service items have no stock and read "Unavailable" | Buffers, minimum notice, advance windows, deposits, rescheduling, calendar, DB exclusion constraint | BK-02, BK-04 (partial BK-01, BK-05) | Phase 4 (partial) |
| Discounts and taxes | None | Discount codes and tax lines | Not yet specified | Post-MVP |

**Payment framing:** the success card confirms an **order**, not a payment. It must not claim money was received until PAY-01/PAY-02 exist.

---

### Phase 3: Vendor PWA and notifications (Week 5 to 7)

**Goal:** Vendors have a full dashboard and reliable notifications; payouts work.

**Build**
- [ ] PWA shell, manifest, install prompt, service worker (DASH-01, DASH-16)
- [x] Catalogue management: create, edit, hide, manual sold out, stock and one photo (DASH-05, DASH-06 partial)
- [ ] Home, order screens, page editor, settings (DASH-02, 03, 09, 15) (partial: `/dashboard/settings` holds delivery-fee configuration and delivery/pickup ETA text)
- [ ] Image upload from camera, drag reorder, hide and show items
- [ ] Inventory screens and sold-out toggles (DASH-06)
- [ ] Payments screen: balance, transactions, fees, payout settings (DASH-08)
- [ ] **Payouts:** MoMo account verification (name lookup), weekly batch payout job, instant payout for a fee, status notifications (PAY-05, ONB-08)
- [ ] Web Push opt-in and delivery; notification center (NOT-06, DASH-14)
- [ ] Notification routing with fallback logic (NOT-03 to NOT-05)
- [ ] Refunds and cancellations (ORD-10, PAY-06)
- [ ] Admin v1: vendor list, order/payment views, support inbox, fee settings, audit log (ADM-01 to ADM-03, ADM-05 to ADM-07)
- [ ] Account takeover hardening wave 1 before payouts, wave 2 with payouts (6.9)
- [ ] Twi translations for the bot's core flow (ONB-04, if time allows)

**Test**
- [ ] Device matrix: low-end and mid-range Android, Samsung Internet, iOS Safari
- [ ] Push and WhatsApp delivery tests including window-expired scenarios
- [ ] Security review: RLS tests, magic-link abuse, rate limiting

**Exit criteria:** Vendors can run their shop entirely from the PWA plus WhatsApp; payouts reach a real MoMo wallet; at least 10 vendors installed the PWA; notification delivery rate above target.

---

### Phase 4: Service bookings (Week 7 to 9)

**Goal:** Service providers can set availability and accept paid bookings.

**Build**
- [x] Service availability: weekly windows, blocked dates and an optional weekly cap in `/dashboard/settings`, with a slot engine and server-side checks (BK-02, BK-04 partial; BK-01/03/05 still open)
- [ ] WhatsApp setup for services and natural-language availability parser (ONB-17, ONB-18)
- [x] Slot calculation engine (availability windows, booked slots, blocked dates, weekly cap) with integration tests (BK-04 partial)
- [ ] Booking flow with deposit or full payment, holds and exclusion constraint (BK-05, BK-07, BK-08)
- [ ] Instant vs request confirmation modes (BK-06)
- [ ] Booking notifications with Accept / Decline / Reschedule buttons (ONB-24)
- [ ] Reminders at 24 hours and 1 hour (BK-10)
- [ ] PWA calendar view and availability editor (DASH-04, DASH-07, BK-12)
- [ ] Basic cancellation and reschedule flows (BK-11)
- [ ] Client booking page with accessible date and time selection

**Test**
- [ ] Concurrency tests for double-booking; boundary tests for buffers, notice windows, midnight edges
- [ ] Reminder timing tests
- [ ] Pilot with 5 to 8 service providers (makeup, photography, braiding, barbering)

**Exit criteria:** Real bookings with real deposits completed; no double bookings; reminder delivery verified; no-show rate measured.

---

### Phase 5: Hardening and pilot launch (Week 9 to 10, then ongoing)

**Build and verify**
- [ ] Monitoring and alerting (payment failures, webhook failures, queue backlog, WhatsApp quality rating)
- [ ] Backup and restore drill
- [ ] Terms, Privacy Policy and Refund Policy published; Data Protection registration complete
- [ ] Support playbook: common issues, response times, escalation, and the takeover freeze drill (6.9)
- [ ] Cost review per vendor (messaging, AI parsing, storage) and fee adjustments
- [ ] Referral links and "Founding Vendor" configuration (BIL-04): 20% fee share for 6 months plus one free Pro month on activation (section 16.5)
- [ ] Leakage monitoring per vendor: share of pay-on-delivery orders, cancellations and unpaid orders, compared to similar vendors (section 16.4)
- [ ] Share cards and QR codes (PG-06)
- [ ] Final pass on performance and accessibility

**Pilot launch**
- [ ] Onboard 20 to 30 vendors in the launch niche, in person where possible (campus, market clusters)
- [ ] Weekly feedback calls with 5 vendors; review funnel data every week
- [ ] Define the continue / iterate / pivot checkpoint at day 60 to 90 using the success metrics

**Exit criteria (pilot success):** 20+ live vendors, 10+ with real transactions, payout and support processes working, and clear evidence on willingness to pay.

---

## 8. Post-MVP backlog (prioritized by likely impact)

1. Escrow-lite for products, with dispute flow (PAY-08, TRU-03)
2. Product variants and options (CAT-05)
3. Customer list and reorder prompts (DASH-10)
4. Analytics dashboard (DASH-11)
5. Voice-note item creation (ONB-13)
6. Weekly WhatsApp summary (NOT-09)
7. Pro plan and subscription billing (BIL-02): GHS 60 per month, conversational bot with a daily cap, voice notes, sales analytics (section 16.2); build after the pilot shows vendors with real order volume
8. Offline sync improvements (DASH-12)
9. Identity verification badges (TRU-01)
10. Delivery partner integration
11. SMS fallback (NOT-05)
12. Custom domains, directory/discovery, multi-staff (P2 items)

---

## 9. Testing strategy

| Layer | Approach |
|---|---|
| Unit | Parsers (price, list, availability), fee calculation, slot engine, code generation, ledger math |
| Integration | Domain services against a real test database; payment adapter against sandbox; RLS policy tests |
| Conversation | Scripted WhatsApp message sequences through the engine (including duplicates and out-of-order delivery) |
| End-to-end | Playwright for checkout, booking and PWA flows |
| Concurrency | Parallel booking and stock-purchase tests |
| LLM quality | Fixed evaluation set; track precision on name, price and stock extraction; run on every parser or prompt change |
| Device | Real mid-range Android devices on throttled networks; PWA install tests |
| Security | RLS tests, webhook signature negative tests, rate-limit tests, dependency scans |
| Manual UAT | Design partners run real scenarios each phase |

---

## 10. Environments and release process

- **Environments:** local, staging (WhatsApp test number, payment sandbox), production.
- **Branching:** trunk-based with short-lived branches; preview deployment per pull request.
- **Migrations:** versioned, reviewed, applied through CI; never edit applied migrations.
- **Feature flags:** for risky or in-progress features (booking, escrow, Twi) so they can ship dark and be enabled per vendor.
- **Release cadence:** deploy small changes often; avoid deploying payment changes late in the day; have a rollback path.
- **Runbooks:** webhook failure, stuck payout, WhatsApp template rejection, quality rating drop, refund error.

---

## 11. Go-to-market alignment with the build

| When | Vendor acquisition activity |
|---|---|
| Phase L (week 0 to 1) | Launch the landing page; send the waitlist link to every inbound website request; seed vendor WhatsApp groups and campus communities; ask design partners to share reserved links |
| Phase 0 | Interview vendors; convert 5 to 10 inbound website requests into design partners; collect real message samples |
| Phase 1 | Onboard design partners live over WhatsApp; fix every point of friction within a day |
| Phase 2 | Design partners share links with their customers; capture first testimonials and screenshots |
| Phase 3 | Referral program for design partners (20% fee share for 6 months plus one free Pro month on activation, section 16.5); start an in-person onboarding routine at a campus or market cluster |
| Phase 4 | Recruit service providers in the launch niche; showcase deposit and reminder benefits against no-shows |
| Phase 5 | Founding Vendor program (e.g. a reduced vendor share of the fee for the first months); campus or market ambassadors; influencer partnerships |

**Positioning line for vendors:** "Send us your photos on WhatsApp and get your own shop link in 10 minutes, with MoMo payments and order codes built in."

**Offer for people asking for websites:** a live page today at a fraction of the cost and time of a custom website, with a path to a custom site if they outgrow it.

---

## 12. Risks and mitigations (delivery-focused)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Meta verification or template approvals slip | Medium | High | Start in week 0; build against test number; keep a manual fallback (forward messages to a shared inbox) for the pilot |
| Aggregator KYC takes longer than expected | Medium | High | Apply to two providers; keep the adapter interface clean; pilot with pay-offline mode if blocked |
| LLM parsing is too error-prone on real messages | Medium | Medium | Rules-first; mandatory confirmation; correction-rate tracking; iterate on prompts using the evaluation set |
| Waitlist signups don't turn into active vendors (curiosity, not intent) | Medium | Medium | Capture business type and handle at signup; invite in small batches; track waitlist-to-live-page rate; follow up personally with the first 20 |
| Landing page claims ("free", GH₵4,000 comparison) challenged or misleading | Low to Medium | Medium | Base figures on real quotes; state the fees clearly in the FAQ (buyers pay 1.5% plus the Paystack fee, vendors pay 1.5%); avoid fake counters and testimonials |
| Scope creep (booking, escrow, variants) delays pilot | High | Medium | Hold the P0 line; ship products-and-orders first, bookings second |
| WhatsApp per-message costs higher than modeled | Medium | Medium | Measure cost per vendor from the first pilot; reduce template use; encourage in-window interaction |
| Low vendor retention after setup | Medium | High | Order alerts, chat shortcuts, weekly summaries; talk to churned vendors immediately |
| Solo-developer capacity and parallel commitments | High | High | Fixed weekly build blocks; strict phase exits; reuse existing Next.js/Supabase patterns and components; descope before extending dates |
| Security or fraud incident | Low | High | RLS tests, signature verification, new-vendor payout holds, audit logs, incident runbook |
| Regulatory surprises (data protection, payments) | Low to Medium | High | Early legal consult; use licensed aggregator settlement; avoid fund-holding until advised |
| Off-platform payments (buyer and vendor agree to pay the vendor directly) | High | High | Make paying on-platform worth the extra cost (tracking, refund and dispute cover, verified-paid reviews); tie Pro analytics to tracked orders; monitor leakage per vendor; lean on Pro and instant payout revenue, which cannot be bypassed; plan at 30% to 40% leakage |
| Pro conversation cost exceeds the GHS 60 price | Medium | Medium | Daily cap of 25 turns; track cost per Pro vendor; price a real speech-to-text service before building voice notes |
| Buyers resist the 1.5% fee at checkout (interview interest does not equal behavior) | Medium | Medium | Test in the pilot; show the protection line at checkout; fall back to a lower buyer share if conversion drops |

---

## 13. Definition of done (per feature)

- Requirement IDs covered and acceptance behavior verified
- Unit and integration tests written; conversation or e2e tests for user-facing flows
- Works on a mid-range Android device on a throttled connection
- Errors logged with correlation IDs; metrics events instrumented
- Copy added to the translation catalogue (no hard-coded strings)
- Security review checklist passed (RLS, validation, rate limits where relevant)
- Documented in `/docs` where operations need it (runbook, template changes)
- Deployed to staging, verified, then released to production behind a flag if risky

---

## 14. Next 7 days checklist

1. [ ] Decide the working name and register the domain
2. [ ] **Ship the landing page and waitlist** (Phase L): finalize 2 to 3 headline variants, build the page, wire the waitlist, launch to your own network
3. [ ] Submit the `waitlist_welcome` WhatsApp template and set up the `wa.me` "Confirm on WhatsApp" link
4. [ ] Reply to every inbound website request with the waitlist link
2. [ ] Start Meta Business verification; set up the WhatsApp Business account and dedicated number
3. [ ] Apply for the payment aggregator account(s); request sandbox access
4. [ ] Write and submit the first batch of WhatsApp templates
5. [ ] Shortlist 10 vendors from inbound website requests; book interviews or concierge setups
6. [ ] Create the repo, CI, staging environment, and Supabase project
7. [ ] Build the webhook receiver and send a "hello" reply from the test number (proves the loop end-to-end)
8. [ ] Start the parser test set with real vendor messages and price formats
9. [ ] Write ADRs for the open decisions: aggregator, queue approach, auth approach
10. [ ] Sketch the public page and the first four bot screens (consent, name, type, handle)

---

## 15. Review cadence

- **Weekly:** review the funnel (starts, drop-off by step, time to live), error rates, and vendor feedback; adjust next week's scope.
- **End of each phase:** demo to design partners; check exit criteria; decide go or hold.
- **Day 60 to 90 after pilot launch:** formal review against the success metrics; decide to scale, adjust pricing and positioning, or pivot.

---

## 16. Business model and unit economics (decided 2026-11-06)

Companion file: `sikatree_cost_model.xlsx` (live model; change the blue cells on its Inputs sheet).

### 16.1 Decisions

| Area | Decision |
|---|---|
| Platform fee | 3% of online order value, split 1.5% charged to the buyer and 1.5% charged to the vendor |
| Paystack fee (1.95%) | Passed to the buyer through a grossed-up checkout total |
| Pay-on-delivery | Allowed, earns no fee |
| Payouts | Weekly batch; instant payout available for an extra fee (planned GHS 3) |
| Pro plan | GHS 60 per month net to us; the vendor also pays Paystack's 1.95% (charge GHS 61.19) |
| Pro conversation cap | 25 conversational turns per day per Pro vendor |
| Buyer protection | Order tracking, refunds and dispute handling, reviews only for verified paid orders |
| Referral program | 20% of the referred vendor's platform fee for 6 months, plus one free Pro month on activation (16.5) |
| Hosting | Cloudflare (about $5 per month) and Supabase Pro (about $25 per month) |

Scope check: the backlog lists escrow-lite and a dispute flow as post-MVP (PAY-08, TRU-03). Whatever is promised to buyers at checkout must match what exists at launch.

### 16.2 Free and Pro tiers

| | Free | Pro (GHS 60 per month) |
|---|---|---|
| Bot | Buttons and lists; photo and text parsing stays AI-assisted | Conversational ("what sold this week?", "raise cream to 100 and mark serum sold out"), voice notes |
| Data | Counts: orders and revenue this week | Sales by item and day, repeat customers, peak hours, stock alerts, CSV export |

The 25 turn daily cap keeps the worst case (a vendor who hits it every day) at about GHS 52 of cost against GHS 60 of price. Above about 28 turns a day the worst case loses money. Typical use (about 10 turns a day) costs about GHS 21 a month.

### 16.3 Unit economics (GHS per month)

Assumptions to replace with pilot data: 20 orders per vendor per month, average order GHS 120, 50% paid online, 10% of vendors on Pro, 10% monthly vendor growth with 30% of new vendors referred, GHS 11.2 per USD. Voice-note transcription is a GHS 0.10 per note placeholder (not priced yet).

| | 25 vendors | 100 vendors | 500 vendors |
|---|---|---|---|
| Total cost | 690 | 1,843 | 8,442 |
| Total revenue (fee, Pro, instant payout) | 1,065 | 4,260 | 21,300 |
| **Profit** | **375** | **2,417** | **12,858** |
| **Margin** | **35%** | **57%** | **60%** |
| Profit at 30% off-platform leakage | 115 | 1,378 | 7,662 |
| Margin at 30% leakage | 14% | 43% | 48% |

Break-even is about 12 vendors with no leakage and about 19 with 30% leakage. The 500 vendor column includes a rough GHS 450 infrastructure buffer.

### 16.4 Leakage controls

- Make on-platform payment worth the extra cost: order tracking, refund and dispute cover shown at checkout, reviews only for verified paid orders.
- Tie Pro analytics, repeat customers and stock alerts to tracked orders, so off-platform sales cost the vendor their own insight.
- Do not rely on the fee alone: Pro subscriptions and instant payout fees cannot be bypassed. Pro adoption matters most while vendor numbers are small.
- Monitor per vendor: share of pay-on-delivery orders, cancellations, unpaid orders, and gaps against similar vendors.
- Fee tiers by volume or lower vendor share for Founding Vendors who route most orders through the platform.

### 16.5 Referral program

- **Reward:** the referrer receives 20% of the referred vendor's platform fee for 6 months, plus one free Pro month when the referred vendor activates. At the assumptions above, one referred vendor earns us about GHS 216 in fees over the window and the total reward costs about GHS 67 (31%).
- **Activation** means verified paid orders, not signup or waitlist entry.
- **Fraud controls:** block self-referral by matching phone number, MoMo number and device; treat vendors sharing a payout number as one person; hold rewards until the refund window closes; claw back on refunded orders; cap rewards per referrer; one level only.
- **Pay rewards** as wallet credit or fee discount, not cash.
- **Measure:** share of vendors who refer, activation rate of referred vendors, cost per activated vendor, payback months, 60-day retention of referred vs organic vendors.
- **Rollout:** run with the 5 to 10 design partners first (Phase 3), then open to all vendors with the Founding Vendor program (Phase 5).

### 16.6 Open items

- Confirm with real checkout tests that buyers accept 1.5% plus the Paystack fee.
- Price a speech-to-text service for Pro voice notes.
- Replace the order volume, order value, online share and Pro usage assumptions with pilot data.
- Recheck Meta's WhatsApp rates and Cloudflare cost each quarter.
- Confirm the instant payout fee and what the vendor sees on payout statements.
