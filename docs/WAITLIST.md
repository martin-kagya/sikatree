# Waitlist backend (Phase L, day 4 to 5)

Status: shipped locally on Postgres, Supabase-ready. Everything below is live in the
repo and covered by `pnpm test`.

## What is implemented

| Requirement | Status | Where |
|---|---|---|
| LP-09 form fields and Ghana phone normalisation | Done | `components/WaitlistForm.tsx`, `lib/phone.ts` |
| LP-10 consent plus timestamp | Done | consent checkbox, `waitlist_signup.consent_at` |
| LP-11 handle reservation, availability, reserved words, expiry | Done | `lib/waitlist.ts`, `reserved_handle` |
| LP-12 position, referral link, share, Confirm on WhatsApp | Done | success state in `WaitlistForm` |
| LP-14 duplicate phone shows the existing position | Done | unique phone index plus dedupe in `createSignup` |
| LP-16 founding vendor offer | Existing block, not dynamic yet | `components/sections.tsx` |
| LP-19 honeypot, time trap, rate limits | Done (Turnstile optional, not wired) | `app/actions.ts`, `lib/rate-limit.ts` |
| LP-20 funnel events, UTM and referral capture | Capture done, no dashboard | `components/analytics.tsx`, `app/api/e` |
| LP-21 admin list, search, filters, CSV, status, notes | Done | `app/admin` |
| LP-23 unsubscribe frees the handle | Server side done, STOP handling waits on the bot | `setStatus` in `lib/waitlist.ts` |
| LP-25 privacy notice and terms | Draft published, needs legal review | `app/privacy`, `app/terms` |

## Running it

The app reads `DATABASE_URL` (see `.env.example`). Locally it defaults to
`postgres://localhost:5432/sikatree_dev`.

```bash
createdb sikatree_dev          # once
pnpm db:migrate                # applies db/migrations/*.sql in order
pnpm dev
```

### Supabase

The pilot project lives in `eu-west-1`. Use the **session pooler** connection
string, not the direct one: `db.<ref>.supabase.co` resolves to IPv6 only, and
the pooler is reachable from networks without IPv6.

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

`pnpm db:migrate` applies the migrations to Supabase, `pnpm db:check` prints the
masked target and row counts, then `pnpm dev` runs against it. `DATABASE_SSL_STRICT=false` is the default because Supavisor serves a
self-signed chain; the connection is still encrypted.

The SQL is plain Postgres, no Supabase-only syntax. Supabase's `ensure_rls` event
trigger also enables RLS on `schema_migrations`. Every table has RLS on and no
permissive policies, so the publishable key cannot read or write through
PostgREST. The server connects as the table owner (`postgres.<ref>`), which
bypasses RLS, so keep that connection string server-side only.

The publishable and secret keys in `.env.local` are not used yet; they are there
for Storage, Auth and Edge Functions later. Only `NEXT_PUBLIC_*` values may reach
the browser, and the secret key must never be exposed.

If connection limits bite on Vercel, switch the runtime URL to the transaction
pooler on port 6543 and keep 5432 for migrations. Our advisory lock is
transaction-scoped, so it is safe in transaction mode; the migration script's
session lock is not, which is why migrations use 5432.

`ADMIN_PASSWORD` unlocks `/admin`. Without it the admin answers 404/redirects and
cannot be used. Generate one with `openssl rand -base64 24`.

`NEXT_PUBLIC_WHATSAPP_NUMBER` (digits, e.g. `233241234567`) adds the "Confirm on
WhatsApp" button. The prefilled text is `WAITLIST <referral code>` so the bot can
match the vendor when it exists. Until a number is set the success state shows
share and copy only.

## Data model

`waitlist_signup`

- `phone` is E.164 and unique. It is the dedupe key.
- `referral_code` is 6 characters of Crockford base32, unique per row.
- `referred_by` points at the referrer, and each successful referral increments
  the referrer's `bumps`. Position is computed on read:
  `count(earlier live signups) - bumps`, never below 1. Nothing is denormalised,
  so correcting data does not leave stale positions.
- `status`: `waiting`, `invited`, `onboarded`, `unsubscribed`. Unsubscribed rows
  stop counting toward anyone's position.
- `consent_at` records the moment the box was ticked. There is no way to insert
  a row without it.

`reserved_handle`

- One row per handle, primary key, so a handle cannot be double-booked.
- `expires_at` defaults to `RESERVATION_DAYS` (30). Expired reservations are
  treated as free and are reused in place.
- `status`: `reserved`, `claimed` (permanent, set at onboarding), `released`.
- Reservations are taken under `pg_advisory_xact_lock(hashtext(handle))`, so two
  simultaneous claims serialise and the loser gets a suggestion instead.

`rate_limit` and `analytics_event` support the abuse and funnel layers.

## Flows

**Signup.** Validate phone, consent, business type and handle format, then hit
the rate limiters (6 per IP per hour, 4 per phone per hour). Insert with
`on conflict (phone) do nothing`; if the phone already exists, return the
existing row with `already: true` so the vendor sees their original position.
Handles are claimed after the row exists. A lost handle does not fail the
signup: the row is kept, the success state says the link went, and the vendor
can claim another one without a second signup.

**Referral.** `?ref=CODE` is captured into session storage on first page view
and submitted with the form. A valid code records `referred_by` and bumps the
referrer once. Self-referral and unsubscribed referrers are ignored.

**Handle claim after signup.** `claimHandle` action: requires the phone to
already be on the list, rechecks availability, then reserves. Rate limited at 10
per IP per hour.

**Unsubscribe.** Marking an entry `unsubscribed` in the admin releases its
reserved handle (status `released`, expiry now) and clears the visible handle,
which satisfies the data side of LP-23. The WhatsApp STOP handler belongs to the
bot phase.

## Abuse controls

- Honeypot field `website`, hidden off-screen and out of the tab order.
- Time trap: `elapsed` under 500 ms looks scripted. Missing `elapsed` (no
  JavaScript) is allowed, which keeps the no-JS path working.
- Fixed-window rate limits in Postgres, so they hold across serverless
  instances. They hold across serverless instances, unlike an in-memory map.
- Bots receive a fake success. The row is never written.
- Optional Turnstile: `TURNSTILE_SECRET_KEY` is reserved in `.env.example` but
  the widget is not mounted yet.

## Analytics

First-party only: no cookies, no third-party script. A random id lives in
`localStorage`; events post to `/api/e` with `sendBeacon`. Allowed names:
`page_view`, `scroll_depth`, `cta_click`, `form_start`, `form_submit`,
`form_error`, `handle_check`, `whatsapp_click`, `share_click`. Unknown names are
rejected with 400.

Useful queries:

```sql
-- Daily signups
select date_trunc('day', created_at) as day, count(*)
from waitlist_signup group by 1 order by 1 desc;

-- Funnel by day
select date_trunc('day', created_at) as day, name, count(*)
from analytics_event group by 1, 2 order by 1 desc, 2;

-- Referred signups
select count(*) filter (where referred_by is not null) as referred, count(*) as total
from waitlist_signup;
```

## Founding vendor offer

The offer block (LP-16) is configuration in `lib/offer.ts`, read at build time
because `/` is static:

| Variable | Default | Meaning |
|---|---|---|
| `FOUNDING_VENDORS_ENABLED` | `true` | `false` removes the block |
| `FOUNDING_VENDORS_CAPACITY` | `100` | Number of vendors in the headline |
| `FOUNDING_FEE_FREE_MONTHS` | `3` | Zero-fee period |
| `FOUNDING_BADGE_NAME` | `Founding Vendor` | Badge name in the copy |

No live counter is shown: LP-17 forbids one until the number is real and above a
threshold we set. Change the values, rebuild, and the copy follows.

## Admin

`/admin` (password from `ADMIN_PASSWORD`, 12-hour HMAC cookie, 8 attempts per
5 minutes per IP) lists up to 200 rows with search, status and type filters,
inline status changes, notes, a `wa.me` link that prefills `START`, and CSV
export of the filtered set (5,000 rows). `/admin` is disallowed in `robots.txt`
and never prerendered.

## Known gaps before launch

1. **`waitlist_welcome` template** must be approved before automatic messaging
   (LP-13). Until then the page confirms and offers WhatsApp.
2. **STOP handling** needs the bot; the admin path works today.
3. **Turnstile** widget not mounted; the secret is reserved.
4. **Performance budget** (LP-04) is not enforced in CI yet. First Load JS for
   `/` is about 139 kB, over the 100 kB target, and should be trimmed before
   launch.
5. **Legal review** of the privacy notice and terms, plus Data Protection
   Commission registration (Phase 0).
6. **Founding vendor capacity** is still a component constant, not a config
   value.
