# Vendor authentication: critical review and replan

| | |
|---|---|
| **Status** | **Auth Phase 0 shipped 2026-11-10** (POST-only redemption, confirmation page, headers, analytics guard). Auth Phases 1-3 proposed. Refines `PLAN.md` 6.4 and 6.9; supersedes their implementation detail. |
| **Scope** | Vendor sign-in, session lifetime, recovery, and credentials embedded in notifications. |
| **Out of scope** | Admin auth (AUTH-05), client accounts (AUTH-04), and payment step-up (PLAN 6.9 Wave 2), which is a separate gate before payouts and must not wait for auth Phase 3. |
| **Decision** | **Code-first, link-fast, session-first.** A one-time code is the primary factor; the link stays as a one-tap shortcut; sessions become server-side, sliding and revocable. |
| **Why now** | The current link is a single point of failure. It is consumed by email scanners, it lands in a browser the vendor may not return to, and it is the only way back in. That produces repeat sign-ins, support load and unnecessary credential rows at scale. |

## Executive summary

The login method is the visible friction, but the root cause is architectural: **the link is the only factor, and the session is a stateless cookie.** Every failure therefore forces another link.

- **What changes:** a one-time code becomes the primary factor (entered in the browser that needs the session), the link stays as a one-tap shortcut, and sessions become server-side rows with sliding expiry and revocation. From auth Phase 1, every sign-in email carries both a code and a link.
- **What the vendor sees:** sign in with a code or one tap; stay signed in for 30 days of use; see and revoke devices; no more "this link was already used" dead ends.
- **What ships first:** auth Phase 0 is live as of 2026-11-10 (link-only email; the link stops being consumed by previews). Auth Phase 1 is the durable fix (codes, sessions, device list, cleanup, no credentials in order alerts).
- **What we deliberately keep:** no passwords, single-use short-lived factors, hashed tokens at rest, enumeration-safe responses, and the link itself.
- **What we are not doing:** longer or reusable links, passwords/PINs, SMS, or a Supabase Auth migration.
- **How we know it worked:** link-preview failures under 1% of link views, 70%+ fewer sign-in emails per vendor, 80%+ of sign-ins using codes, and fewer "cannot sign in" support tickets.

| Scenario | Today | After Auth Phase 1 |
|---|---|---|
| **Email previews the link** | The preview's GET consumes the token; the vendor must request another link. | The preview only renders a page. The vendor taps Continue; POST redeems. If a scanner still consumes it, the code in the same email works. |
| **The vendor closes the shop tab** | The session may live in a different browser context; they request a new link. | In the same browser the session persists and slides. In a different context they enter the code from the same email. |
| **Every sign-in needs a new link** | The link is the only factor, and every order alert carries another one. | Sessions last; codes are the default; links are a shortcut; order alerts carry no credentials. |

---

## 1. The problem, precisely

The current flow is: email or bot → 15-minute, single-use link → `GET /auth/verify` redeems it immediately → HMAC-signed 30-day cookie → `/dashboard`.

That is a reasonable first version, but each of the reported frictions has a specific mechanical cause. They are not one problem called "login is annoying"; they are several problems that compound.

| What the vendor experiences | What is actually happening | Evidence |
|---|---|---|
| "It says the link was already used, and I only just opened it." | Many email providers and corporate mail filters fetch every URL in a message to scan it. Any GET consumes the token, so the scanner uses it before the human does. | `app/auth/verify/route.ts:10-12` redeems on GET; `lib/login-links.ts:59` sets `used_at` |
| "I signed in on my phone, but the dashboard icon still asks me to sign in." | The link opens in whatever browser the email app hands it to (an in-app browser, the default browser, or the installed home-screen app, which can have separate storage). The cookie is set **there**, not necessarily in the context the vendor returns to. | Cookie is set only in the request that redeemed the link, `app/auth/verify/route.ts:20-27` |
| "I closed the tab and had to request another link." | In the same browser a 30-day cookie survives closing a tab. If it does not, the session was created in an ephemeral or different context, or the browser cleared it. | No server-side session exists to recover; `lib/vendor-auth.ts:31-46` |
| "I am signed out every month, usually in the middle of something." | The 30-day life is absolute from sign-in, not sliding from last use. An active vendor is logged out on day 31 regardless. | `lib/vendor-auth.ts:8`, `:26` |
| "I cannot get a new link; it says too many attempts." | 10/IP/15 min is shared by every vendor behind one NAT (a market, campus or office). Five requests per email per 15 min is also easy to hit while fighting a consumed link. | `app/auth/login/actions.ts:20-27` |
| "I have a new phone and no way in except WhatsApp." | Web-created vendors have email only; bot-created vendors have no email at all. There is no code path that works in the browser the vendor is already holding. | `docs/EMAIL.md` "Not built yet"; `db/migrations/0024_vendor_email.sql` |
| "Every order alert contains another login link." | Each order creates a new credential and a new row, and forwards as a working login if the alert is shared. | `lib/notifications.ts:67`; bot dashboard taps do the same, `lib/whatsapp/engine.ts:646` |
| "Support cannot cut off a stolen phone." | Sessions are stateless. Revocation would mean rotating `AUTH_SECRET`, which signs everyone out. AUTH-02 is not met. | `lib/vendor-auth.ts:5-8`; `docs/requirement.md:198` |

Two more consequences that do not show up as a single complaint:

- **The link is the only door.** Lost email, delayed email, a consumed token, a different device, or a wrong browser all end at the same place: request another link, or use WhatsApp. There is no fallback that keeps the vendor in the browser they are already using.
- **Credentials are sprayed into notifications.** Order alerts are operational messages, not authentication messages. Embedding a login link in every alert enlarges the attack surface (forwarded alerts, shared screenshots, group chats) and turns a notification system into an authentication delivery system.

### 1.1 The one-sentence diagnosis

> We built a **link-first** system with **stateless sessions**. The link is fragile and the session cannot be managed, so every failure forces another link.

The fix is not a longer-lived link. It is to make the **session** the durable thing, make the **code** the resilient factor, and keep the **link** as a shortcut rather than the only path.

---

## 2. What the current design gets right

Do not throw these away:

- **No passwords.** Matches AUTH-01 and removes reset support load.
- **Only hashes at rest.** `login_link.token_hash` means a database read cannot forge a link (`lib/login-links.ts:10-12`).
- **Single-use and short-lived.** Correct for a bearer credential.
- **Enumeration-safe responses.** The login page answers the same whether or not the email has a shop (`lib/vendor-login.ts:8-11`; `app/auth/login/actions.ts:34-35`).
- **Rate limiting exists.** It needs tuning, not removal.
- **Two delivery channels already exist.** Email (Resend) and WhatsApp (bot) both work; the replan uses both rather than picking one.
- **The redemption transaction is correct.** `for update` plus `used_at` prevents a double redemption race (`lib/login-links.ts:37-61`).

The replan keeps the security properties and changes the product shape.

---

## 3. Design principles

1. **Session-first, not link-first.** A vendor signs in on a device once. After that the device stays signed in until it is idle too long, revoked, or signed out. Sign-in is the exception, not the routine.
2. **Enter the factor where the session is needed.** A code typed into the current browser cannot land in the wrong cookie jar. A link can.
3. **The link must be safe to preview.** A GET never changes auth state. Only an explicit POST from the confirmation page redeems.
4. **From auth Phase 1, every sign-in email carries both a code and a link.** The code is the fallback when the link is opened in the wrong place or consumed. The vendor never needs a second email to recover.
5. **Server-side sessions or no revocation.** A session must be listable, revocable and expirable server-side. A signed cookie alone cannot satisfy AUTH-02.
6. **Notifications never carry credentials.** Operational messages deep-link; authentication is requested separately.
7. **Measure the friction.** Instrument link GETs, redemptions, code sends, code failures, session lifetime and sign-ins per vendor. The replan is only successful if those numbers move.
8. **No new factor during onboarding.** Keep the first-run flow as short as it is. Codes and passkeys are for returning vendors, offered after value.

---

## 4. Options considered

| Option | What it fixes | Why not choose it as the whole answer |
|---|---|---|
| **A. Keep links; add a POST confirmation page only** | Scanner consumption | Does not fix wrong browser, closed tab, expiry, revocation or the shared-NAT rate limit. Good as auth Phase 0, insufficient alone. |
| **B. Code-first + link-fast + server sessions (recommended)** | All named frictions, AUTH-02, notification hygiene | Moderate build (roughly 4 to 5 days for the core). Adds a code table and a session table. |
| **C. Longer-lived or multi-use links** | Fewer "expired" errors | Security downgrade: a forwarded link is a reusable key. Still lands in the wrong browser. Reject. |
| **D. Passkeys only, now** | Best repeat sign-in UX, phishing-resistant | No recovery path yet; device and PWA support needs testing; cannot be the only factor for a vendor who loses a phone. Auth Phase 3, not the base. |
| **E. Supabase Auth, Clerk or Auth0** | Off-the-shelf sessions, OTP, passkeys | Migrates identity and RLS for a flow we already control; per-vendor pricing; their magic links have the same preview problem unless configured; data residency and lock-in for a small team. Revisit only if we need SSO or social login. |
| **F. Password or PIN** | Familiar | Violates AUTH-01, adds reset and support burden, and passwords are the thing we are trying to avoid. |
| **G. WhatsApp OTP only** | Works for bot vendors; phone is the identity | Excludes email-first vendors and depends on Meta templates/24-hour windows. Keep as a **complement**, not the only path. |
| **H. SMS OTP** | Universal | Per-SMS cost in Ghana, SIM-swap risk and deliverability; no advantage over WhatsApp for this audience. |

**Chosen: B, delivered in phases.** Keep D and G as later layers.

---

## 5. The recommended model

> **Code-first, link-fast, session-first.**

```
Returning vendor, known device
  cookie ─────────────────────────────────► session valid ──► dashboard
                                             │
                                             └─ idle/revoked ──► sign-in

Returning vendor, new device / cleared cookies
  ┌─ email ──► 6-digit code ──► type in this browser ──► session
  ├─ email ──► link ──► confirm page ──► POST ─────────► session
  └─ WhatsApp ──► 6-digit code ──► type in this browser ─► session
                                     (passkey later)

Brand-new vendor
  /start or bot onboarding ──► welcome email/bot message with code + link ──► session
```

### 5.1 Sign-in paths

| Path | Who it is for | How it works | Priority |
|---|---|---|---|
| **Email code** | Every vendor with an email (web-created, or bot-created after adding one) | Enter email → 6-digit code → type it into the same page | Auth Phase 1 |
| **Email link** | Vendors who prefer one tap and are on the same device/browser | Email button → confirmation page → POST redeems | Ships now; POST confirmation in auth Phase 0; combined email in auth Phase 1 |
| **WhatsApp code** | Bot-created vendors, or anyone whose email is unavailable | Message the bot `LOGIN`; it replies with a 6-digit code; enter your phone and the code on the login page | Auth Phase 1 minimal (bot `LOGIN` + phone field); full tab in auth Phase 2 |
| **Passkey** | Returning vendors on a device that supports it | Biometric unlock; registered after a successful sign-in | Auth Phase 3 |
| **Support recovery** | Lost email and phone | Identity check by support; support revokes sessions and helps re-establish a factor. Support never signs in as the vendor. | Process, before payouts |

The login page defaults to **email code** from auth Phase 1. In auth Phase 0 the email is link-only; do not show code copy until codes exist.

### 5.2 What the sign-in email contains

From **auth Phase 1**, every sign-in email carries **both**, in this order:

1. A large, selectable **6-digit code** (for example `482 913`), with "Enter this code at sikatree.africa/auth/login".
2. A **"Sign in to sikatree"** button linking to `/auth/verify?token=…`.
3. One line of anti-phishing copy: "sikatree will never ask for this code by phone, WhatsApp or message."
4. Expiry: "The code and link expire in 15 minutes."
5. "If you did not ask for this, ignore this email. Your shop is safe."

The code is not in the subject line (subject previews leak it). The email has no tracking pixel and no external images, so opening it does not trigger network requests beyond the provider's own scanning.

In **auth Phase 0**, the email stays as it is today: link only, 15 minutes. The code line and code input are added in auth Phase 1. Do not ship copy promising a code before the code exists.

**The combined email solves the two hardest cases at once (from auth Phase 1):**

- A scanner that fetches the link only **views** the confirmation page; it does not consume the token.
- If the link is opened in the wrong browser (or consumed by an aggressive scanner that clicks), the vendor types the code into the browser where they actually want the session. No second email, no waiting for delivery again.

### 5.3 The link confirmation page

`/auth/verify` becomes a page, not a redeem-on-GET route.

- **GET** renders the shop identity and a **Continue** button: "Continue to Ama's Glow — a•••@gmail.com" (or a masked phone for bot-created vendors). It calls `peekLoginToken`, validates the token, and returns the vendor's display name and masked identifier **without consuming the token**.
- **Why the identity is required:** the confirmation page is a credential flow. Without the shop name, an attacker can send a victim their own valid link and the victim can tap Continue into the attacker's shop (login CSRF). The Origin check, SameSite and POST-only rules all pass in that attack because the request is first-party. Showing "Continue to Ama's Glow" gives the vendor a chance to stop. See residual risk in Section 8.
- **POST** (server action, same origin) redeems the token, creates the session, sets the cookie, redirects to a validated `next` path or `/dashboard`.
- **Headers are set in `next.config.mjs`**, not in the page: `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex`, `Cache-Control: no-store` for `/auth/verify` and `/auth/login`. A page component cannot set response headers, so this is a config change, not a page change.
- **The no-referrer header is not cosmetic.** The dashboard's first-party analytics stores `document.referrer` in `analytics_event.referrer` (`lib/analytics.ts`). Without it, the redirect from `/auth/verify?token=…` to `/dashboard` persists the token in the analytics table. Also skip analytics on `/auth/*` paths and strip query strings before storing a referrer. Make both a hard auth Phase 0 task.
- **`next` is carried, not guessed.** A deep link that calls `requireVendor('/dashboard/orders')` redirects to `/auth/login?next=%2Fdashboard%2Forders`; the login form keeps it in a hidden field; the emailed link stores it on the `login_link` row (`next_path`) and the verify action uses it. The value is validated as a relative path that starts with `/`, does not start with `//`, does not contain `\`, does not start with `/auth/`, and is at most 200 characters.
- **If a valid session already exists**, GET redirects straight to the dashboard. Clicking a link twice, or opening it while already signed in, is not an error.
- **If the token is invalid, used or expired**, the page is actionable, not a dead end. Auth Phase 0 (link only): "This link has already been used or expired. Request a new link." Auth Phase 1 adds: "Use the 6-digit code from the same email." Buttons: "Enter a code" (auth Phase 1), "Email me a new link".
- **"Keep me signed in on this device"** checkbox, checked by default, appears on the confirm page as well as the login form. Without it, a shared-shop phone that uses the email link would get a 365-day cookie with no way to opt out. Unchecked creates a browser-session cookie; from auth Phase 1 the session row also expires after 12 hours.
- The token stays in a hidden form field. The page does not auto-submit; a human gesture is required.
- Reuse of a consumed token is rejected in a transaction, as today.

This is PLAN 6.9 Wave 1 item 1, promoted to auth Phase 0 because it is the cheapest fix and it removes the most visible failure.

### 5.4 Closing the tab, reopening the shop

With a server-side session and a persistent cookie, closing a tab and reopening the same browser keeps the vendor signed in. The realistic failure cases are:

- The link was opened in an **in-app browser** (email app, WhatsApp viewer) whose storage is not the browser or home-screen app the vendor uses later. **Fix:** the code path, not a longer link.
- The browser or OS **cleared storage** (private mode, storage pressure, privacy settings). **Fix:** passkey in auth Phase 3; until then, code sign-in is two taps.
- The session hit its **idle or absolute limit**. **Fix:** sliding expiry (Section 6) and a clear "sign in again" path that returns to the page they wanted (`next` parameter).
- The vendor is on a **shared device** and chose "Keep me signed in" off. That is intentional. **Fix:** the option exists and is explicit.

A 30-day cookie was never the reason a tab close loses a session in the same browser. The reason is context mismatch. Adding a code is what makes the mismatch recoverable.

### 5.5 Notifications stop carrying credentials

- **Order alert:** "New order ORD-…" plus details plus `Open your orders: ${appUrl()}/dashboard/orders`. No token.
- If the vendor has no session, the orders page calls `requireVendor('/dashboard/orders')`, which redirects to `/auth/login?next=%2Fdashboard%2Forders`; after sign-in they land on the orders page. This requires `requireVendor` to accept the destination (Section 11.4) and the login form to carry it.
- **Low-stock alert:** unchanged (no link).
- **Bot "Open dashboard":** from auth Phase 1, replies with the dashboard URL **and** a fresh 6-digit code. The vendor can tap the link or enter the code on the login page with their phone. The link stays in the message as the one-tap path; the code is the one that lands in the PWA.
- **Weekly summaries, receipts, delivery updates:** deep links only, never credentials.

This removes the largest source of `login_link` rows (one per order) and the largest source of forwarded credentials.

### 5.6 What "remember this device" means

There is no separate device secret in auth Phase 1. The session **is** the remembered device: a long-lived, server-revocable cookie. A "Keep me signed in on this device" checkbox is on by default on both the login form and the link confirmation page; unchecking it creates a browser-session cookie, and from auth Phase 1 a 12-hour server-side idle limit, for shared phones and shop counters.

Auth Phase 3 can add passkeys as the "remembered" factor, which survives cookie clearing and is faster than either code or link.

---

## 6. Sessions

### 6.1 Model

- **Opaque token**, 32 random bytes, base64url. The cookie carries the raw token; the database stores only its SHA-256 hash.
- **Server-side row** per device. This is what makes listing, revocation, sliding expiry and "sign out everywhere" possible.
- **No vendor id or expiry in the cookie.** Nothing to tamper with; the row is the authority.
- **One row per sign-in**, capped at 10 active sessions per vendor. The oldest is revoked when the cap is exceeded.

### 6.2 Lifetime

| Control | Default | Notes |
|---|---|---|
| **Idle expiry** | 30 days | Slides forward on use; configurable per vendor (7 / 30 / 90 / 365 days) in Settings, satisfying AUTH-02's "configurable period". |
| **Absolute expiry** | 365 days | Hard cap from creation even with continuous use. Re-authentication after that is one code. |
| **Cookie `Max-Age`** | 365 days | The cookie may outlive the server row; an expired row is rejected. The browser keeps the token, but it is useless. |
| **Shared-device mode** | 12 hours idle, session cookie | "Keep me signed in" unchecked. |
| **Sliding write** | At most once per hour per session | `last_seen_at` and `expires_at` update only when the last touch is older than an hour, so a dashboard visit is not a write on every request. |

Why not a 30-day cookie with a 30-day server session? Because active vendors would still be logged out on day 31. Sliding idle expiry is the difference between "sessions persist" and "sessions persist while you use them".

### 6.3 Cookie

Keep the name `ska_vendor` for the transition, so existing cookies are not all invalidated at deploy.

```
HttpOnly; Secure (production); SameSite=Lax; Path=/; Max-Age=31536000
```

- `SameSite=Lax` is correct for top-level email-link navigation and for same-site POSTs.
- `__Host-` prefix is a later hardening step; it requires a rename and a mass sign-out. Do it with the passkey release, not now.
- The **session** token is never placed in a URL, a log line, or an analytics event. The **link** token is in the URL by design; it can appear in edge access logs, bounded by single use and the 15-minute TTL. Application logs and analytics must never record it: the verify response sets `Referrer-Policy: no-referrer`, and `track()` must skip `/auth/*` paths and strip query strings from referrers.
- A server component cannot re-issue a cookie, so the `Max-Age` is fixed at 365 days at sign-in while the server row slides. That is intentional: the cookie is only a carrier, and the row is the authority.

### 6.4 Revocation and device list

Settings → **Sessions** (DASH-15):

| Column | Example |
|---|---|
| Device | "Chrome on Android" (derived from a truncated user agent) |
| Last active | "2 hours ago" |
| Signed in | "12 Nov, 09:14" |
| This device | Badge on the current row |
| Action | **Sign out** |

Plus **Sign out everywhere**. Both are immediate: the next request from a revoked session redirects to `/auth/login`. A revocation writes an `auth_event` row (`session_revoked`) for support forensics.

Support needs a read-only admin view and a revoke action before payouts; PLAN 6.9 Wave 1 already lists this.

### 6.5 Legacy sessions at deploy

Existing `ska_vendor` cookies are `vendorId.expires.signature`. To avoid logging every vendor out on deploy:

1. New sign-ins write a session row and an opaque token.
2. `currentVendorId()` first tries the session table. If that fails and the cookie has the old three-part shape, it verifies the legacy HMAC and returns the vendor id.
3. Legacy cookies are accepted until they expire (at most 30 days), then the fallback is deleted.
4. A legacy cookie is upgraded to a real session on the first authenticated **server action or route handler** (where a cookie can be written), not during a server-component render. Until then, a legacy session cannot be listed or revoked; say so in the support runbook.

This is a one-release bridge, not a permanent second auth system. It preserves the 30-day promise for existing vendors while new sessions gain revocation.

### 6.6 Session settings, not a new settings screen

The idle period lives on `vendors.session_idle_days` (default 30). Changing it updates active sessions' `expires_at` up to the absolute cap. The Sessions list lives under the existing Settings page, but as its own section and list component: Settings is currently a stack of section cards, not a 64px row list (`app/dashboard/settings/page.tsx`). No new navigation item is required.

---

## 7. Codes and links

### 7.1 One-time codes

- **6 digits**, generated with a CSPRNG, displayed with a space (`482 913`) but accepted with or without spaces.
- **15-minute expiry.** Single use. **Do not invalidate a still-valid code when a new one is issued.** A vendor can have up to five active login codes (bounded by the per-email request limit); each is single use and expires on its own. This prevents an attacker who knows the email from invalidating the code the vendor is reading by requesting another one.
- **Stored as HMAC-SHA256** keyed by `AUTH_SECRET`, with a per-row random salt. A database read cannot brute-force a 6-digit code offline, because the key is not in the database.
- **5 attempts per code.** The fifth failure burns the code. Verification is a transaction with `for update`, constant-time compare, and a generic error for every failure (unknown identifier, expired, wrong code, burned). Rows are filtered by `purpose = 'login'`, so an `email_change` or `phone_change` code can never authenticate a sign-in.
- **Identifier:** `verifyLoginCode(identifier, code)` accepts the vendor's email or normalized phone. This lets the WhatsApp path work without email and avoids a rewrite when the phone tab lands.
- **Unknown-identifier timing:** when no vendor matches, still perform a dummy HMAC compare before returning the generic error, so response time does not reveal whether the account exists.
- **Rate limits:**
  - Per email or phone: 5 codes / 15 min, 10 / day.
  - Per IP: 30 codes / 15 min, 200 / day. This is deliberately looser than today's 10/15 min, because market and campus NAT is shared.
  - Per vendor: 10 codes / day.
  - Resend cooldown: 60 seconds, shown as a countdown rather than a generic error.
  - Verification: 50 attempts / 15 min per IP, in addition to the per-code limit, to stop spraying across many accounts.
  - **A limit blocks new sends only.** It must never invalidate an existing code or link; a vendor who hits the cap can still use the code they already have, or the link. The message says "Use the code you already have, or try again in X minutes", not a dead end.
- **Delivery:** email by default; WhatsApp when the vendor is phone-first. The minimal WhatsApp path (bot `LOGIN` plus a phone field on the login page) ships in auth Phase 1; the full WhatsApp tab and email-adding flows are auth Phase 2.
- **Never log** the code. Log the event with a vendor id, a method and an outcome only.

### 7.2 Links

- Keep the existing 256-bit token, SHA-256 hash at rest, single use, transaction on redeem.
- **Compare expiry with the database clock** (`expires_at > now()`), not the app clock, so a Worker with a skewed clock cannot accept an expired link or reject a valid one.
- **15-minute expiry.** Keep the current window: the scanner fix is the POST, not a shorter TTL. Shortening it would add expiry friction for a marginal security gain. Update the email copy only if the number changes.
- **GET never redeems.** It calls `peekLoginToken`, which validates the token and returns the shop name, masked identifier and `next_path` without setting `used_at`. POST from the confirmation page redeems.
- **Same-origin check** on the POST (`Origin`/`Sec-Fetch-Site`). This blocks a cross-site POST, but **not** the attacker-supplied-link case: an attacker can email their own valid link, and the victim's first-party click passes every check. The control for that is the shop name and masked identifier on the confirmation page (5.3), plus the code path. Treat the residual risk as accepted for this phase.
- **`next` is validated** to a relative path: must start with `/`, must not start with `//`, must not contain `\`, must not start with `/auth/`, and must be at most 200 characters. Otherwise `/dashboard`. The value is stored on `login_link.next_path` when the link is issued, so an emailed link started from `/dashboard/orders` returns there after sign-in.
- If a valid session already exists, the confirmation page redirects to the dashboard instead of redeeming.
- **No multi-use.** If an aggressive scanner both fetches and submits the form, the fallback is the code in the same email (auth Phase 1) or a fresh link (auth Phase 0). That is why the code is not optional once it exists.

### 7.3 Cleanup

`login_link` currently has no cleanup. Every order adds a row, and nothing removes it (`db/migrations/0004_jobs_auth.sql:29-41`).

Add a batched cleanup to the existing jobs runner (`app/api/internal/jobs/run/route.ts`), at most hourly:

```sql
delete from login_link where id in (
  select id from login_link where expires_at < now() - interval '1 day' limit 1000
);
delete from login_code where id in (
  select id from login_code where expires_at < now() - interval '1 day' limit 1000
);
delete from vendor_session where id in (
  select id from vendor_session
  where expires_at < now() - interval '30 days'
     or revoked_at < now() - interval '30 days'
  limit 1000
);
delete from auth_event where id in (
  select id from auth_event where created_at < now() - interval '90 days' limit 1000
);
```

Add `expires_at` indexes for `login_link`, `login_code` and `vendor_session`, a `revoked_at` index for `vendor_session`, and a plain `created_at` index for `auth_event` (the existing composite indexes do not serve a bare range delete). Keep `rate_limit` pruning in `scripts/migrate.mjs` and add it to the job as a belt-and-braces measure.

Run the cleanup **on every invocation of the jobs runner**, bounded to 1,000 rows per table. The repo has no Cloudflare Cron Trigger in `wrangler.jsonc` (the scheduler may be external), so an "at most hourly" timer would silently never run. Bounded deletes are cheap enough to run on each drain; after the first pass they are usually no-ops. If the scheduler is very frequent, add a `last_cleanup_at` guard, but do not rely on one that does not exist.

The target is a bounded working set, not zero rows: codes and links for about a day past expiry, sessions for 30 days past expiry or revocation (for support forensics), and auth events for 90 days.

### 7.4 Why not make links reusable or longer-lived

Because a link is a bearer credential that gets forwarded, screenshotted, scanned and logged. A 15-minute single-use link is already at the edge of what is comfortable in email. The answer to a consumed link is a second factor in the same email, not weakening the first.

---

## 8. Threat model

| Threat | Control |
|---|---|
| **Email preview / scanner consumes link** | GET is non-mutating; POST requires a human gesture; code in the same email is the fallback from auth Phase 1. |
| **Link forwarded or leaked** | 15-minute TTL, single use, POST-only redemption. The attacker also needs the link before the vendor uses it. |
| **Code brute force** | 6 digits + 5 attempts + per-IP/per-email/per-vendor rate limits + HMAC at rest + constant-time compare. |
| **Code phishing** | Anti-phishing copy in every email; codes only entered on `sikatree.africa`; passkeys in auth Phase 3. |
| **Email or WhatsApp account takeover** | Session list, revoke all, login alerts (auth Phase 3), step-up before payouts (PLAN 6.9 Wave 2). Accepted risk at launch, as PLAN 6.9 states. |
| **Attacker-supplied link (login CSRF)** | The confirmation page names the shop and masks the account; the vendor can stop before Continue. Residual risk remains if they ignore it. |
| **Open redirect after sign-in** | `next` allowlist: relative path only, no `//`, no `\`, not `/auth/*`, at most 200 characters. |
| **Session theft** | HttpOnly/Secure cookie, opaque token, server revocation, idle + absolute expiry, no third-party scripts on auth pages. |
| **Session fixation** | A new random token on every sign-in; never accept a session token from a URL, form or query string. |
| **Database read** | Session token hash, link hash, code HMAC + salt. No raw credentials. |
| **Account enumeration** | Uniform responses and a dummy HMAC compare for unknown identifiers; no "no such account" error. |
| **Email bombing / resource exhaustion** | Per-email, per-IP, per-vendor limits; resend cooldown; existing codes/link stay valid; cleanup job; bounded session cap. |
| **Shared device** | "Keep me signed in" off; sign out everywhere; device list. |
| **Support impersonation** | Support can revoke, never sign in as a vendor; identity check procedure documented. |
| **Race on redeem** | `for update` + `used_at` (links) and `for update` + attempts (codes). |

Residual risks accepted for this phase:

- Someone with access to the vendor's email **and** WhatsApp can sign in. That is inherent to passwordless; the mitigation is account-takeover hardening (PLAN 6.9), not a weaker link.
- An email provider that renders the confirmation page and programmatically submits the form can still consume a link. The code fallback is the answer; do not build increasingly clever scanner detection.
- An attacker can send a victim their own valid link. The shop name and masked account on the confirmation page are the practical control; a vendor who ignores the identity can still be signed into the wrong shop. The code path avoids the link entirely.
- A compromised browser can read the cookie despite HttpOnly (malware, not XSS). Passkeys and login alerts reduce the window.

---

## 9. Scale and cost

Assumptions (label them as estimates): 5,000 active vendors, 20 orders per vendor per month, two devices per vendor, two sign-ins per vendor per month today, 0.2 new-device sign-ins per vendor per month after sessions, 20% of vendors choosing the link over the code.

| Item | Today (5k vendors) | Replanned (5k) | At 50k vendors |
|---|---|---|---|
| `login_link` rows from order alerts | 100,000 / month | **0** | 0 |
| `login_link` rows from sign-ins | ~10,000 / month | ~200 / month | ~2,000 / month |
| `login_code` rows | 0 | ~1,000 / month | ~10,000 / month |
| Auth emails | ~10,000 / month | ~1,200 / month | ~12,000 / month |
| Active session rows | 0 | ~10,000 | ~100,000 |
| "Link already used" errors | Common | Near zero | Near zero |
| Support tickets about sign-in | Baseline | Measurably lower | Lower |

The row counts are not the main cost; email and WhatsApp sends and support time are. But the current design creates **1.2 million dead link rows per year at 5k vendors**, and **12 million at 50k**, with no cleanup and an ever-growing unique index. That is avoidable load on the database and on backups.

WhatsApp order alerts remain the dominant messaging cost and are unchanged in volume; they simply stop carrying credentials. WhatsApp auth codes are sent only on a new-device sign-in, or when a vendor messages `LOGIN` (which opens the 24-hour window, so no template is required for the reply). Email auth volume falls by roughly 85% because sessions stop expiring on a fixed schedule.

**The scale answer is not "send links faster". It is "send far fewer credentials".**

---

## 10. Data model

New migration `0025_vendor_sessions.sql` (numbering after 0024):

```sql
-- A vendor session is a row, not a signed cookie. The cookie carries an opaque
-- token; only its hash is stored. Revocation, sliding expiry and the device
-- list all depend on this table.

create table if not exists vendor_session (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  user_agent text,
  ip_hash text,
  device_label text,
  revoked_at timestamptz,
  revoked_reason text
);

create index if not exists vendor_session_vendor_idx
  on vendor_session (vendor_id, last_seen_at desc);
create index if not exists vendor_session_expiry_idx
  on vendor_session (expires_at);
create index if not exists vendor_session_revoked_idx
  on vendor_session (revoked_at);

alter table vendor_session enable row level security;

-- One-time codes. The HMAC (not the code) is stored; the salt stops
-- cross-row precomputation.
create table if not exists login_code (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors (id) on delete cascade,
  purpose text not null default 'login',
  code_hash text not null,
  salt text not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  ip_hash text,
  constraint login_code_purpose_check
    check (purpose in ('login', 'email_change', 'phone_change'))
);

create index if not exists login_code_vendor_idx
  on login_code (vendor_id, created_at desc);
create index if not exists login_code_expiry_idx
  on login_code (expires_at);

alter table login_code enable row level security;

-- Per-vendor session preference (AUTH-02's configurable period).
alter table vendors
  add column if not exists session_idle_days integer not null default 30;
alter table vendors
  add constraint vendors_session_idle_days_check
  check (session_idle_days between 1 and 365);

-- Auth telemetry without raw IPs or user agents. 90-day retention.
create table if not exists auth_event (
  id bigserial primary key,
  vendor_id uuid references vendors (id) on delete set null,
  kind text not null,
  outcome text not null,
  method text,
  ip_hash text,
  ua_hash text,
  created_at timestamptz not null default now()
);

create index if not exists auth_event_kind_idx on auth_event (kind, created_at);
create index if not exists auth_event_vendor_idx on auth_event (vendor_id, created_at);
create index if not exists auth_event_created_idx on auth_event (created_at);

alter table auth_event enable row level security;

-- Links keep the vendor's intended destination so a deep link survives sign-in.
alter table login_link add column if not exists next_path text;

-- Link cleanup index; the table itself already exists.
create index if not exists login_link_expiry_idx on login_link (expires_at);
```

Notes:

- `ip_hash` is `HMAC(AUTH_SECRET, ip)`, not SHA-256 of the IP (IPv4 is enumerable). `ua_hash` is the same; `device_label` is a short human label. `vendor_session.user_agent` keeps a truncated user agent so the device list can show a useful label; `auth_event` stores only hashes.
- `vendor_session.token_hash` is `SHA-256(raw token)`. Codes use `HMAC(AUTH_SECRET, salt + ':' + code)`.
- No `vendor_id` or expiry in the cookie. The row is authoritative.
- `auth_event` is optional for auth Phase 1 but strongly recommended: it is how we prove the link-preview hypothesis and how support answers "was this device really signed in?".
- RLS is enabled with no policies, matching the rest of the schema; the app connects as the table owner and bypasses it. Add policies before any non-owner role reads these tables, or that role will see nothing.

---

## 11. Code changes

### 11.1 New and changed modules

| File | Change |
|---|---|
| `lib/session.ts` (new) | `createVendorSession`, `currentSession`, `currentVendorId`, `requireVendor(nextPath?)`, `listSessions`, `revokeSession`, `revokeAllSessions`, `touchSession`, `verifyLegacyToken`. Move the auth responsibility out of `lib/vendor-auth.ts`. |
| `lib/vendor-auth.ts` | Keep `VENDOR_COOKIE` and `authEnabled`; re-export `currentVendorId`/`requireVendor` from `lib/session.ts` so existing imports keep working; keep `createSessionToken`/`verifySessionToken` under their current names for the legacy bridge and the existing tests, clearly marked. |
| `lib/login-codes.ts` (new) | `createLoginCode(vendorId, purpose)`, `verifyLoginCode(identifier, code)`, `newCode`, `hashCode`. |
| `lib/login-links.ts` | Keep the 15-minute TTL; add `next_path` to creation and redeem; add `peekLoginToken` for the confirmation page (no `used_at` write); keep the transaction. |
| `lib/vendor-login.ts` | `requestEmailLogin` sends the combined code + link email (auth Phase 1) and accepts a `nextPath` that is stored on the link; returns a state without leaking the vendor. Add `requestWhatsAppLogin` in auth Phase 2. |
| `lib/email/templates.ts` | New `signInEmail({ code, url, ... })`; keep `magicLinkEmail` for the welcome path or fold welcome into the same template with `kind`. |
| `app/auth/login/actions.ts` | Two-step state machine: `send` → `verify`; `resend`; `next` handling; rate limits tuned; uniform errors. One send action, because the email carries both code and link. |
| `app/auth/login/page.tsx` | Two-step UI, code input, "change email", a minimal "I have a WhatsApp code" phone + code path in auth Phase 1, full WhatsApp tab in auth Phase 2. No "use a link instead": the same email already has the link. |
| `app/auth/login/login-form.tsx` | `autocomplete="one-time-code"`, `inputmode="numeric"`, paste support, countdown, resend, "keep me signed in". |
| `app/auth/verify/page.tsx` (new) | Confirmation page (GET only): `peekLoginToken`, shop name, masked identifier, `next`, keep-signed-in checkbox. |
| `app/auth/verify/actions.ts` (new) | POST redeem + session + redirect. |
| `app/auth/verify/route.ts` | Delete; a page and a route cannot share the segment. |
| `next.config.mjs` | `headers()` for `/auth/verify` and `/auth/login`: `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex`, `Cache-Control: no-store`. |
| `lib/analytics.ts` | Skip `/auth/*` page views; strip query strings before storing a referrer. |
| `app/dashboard/settings/sessions*` (new) | Sessions section with its own list component and actions. |
| `app/dashboard/actions.ts` | `logoutAction` must revoke the session row, not only delete the cookie. |
| `lib/notifications.ts` | Remove `createLoginLink` from the order alert; deep-link to `${appUrl()}/dashboard/orders`. |
| `lib/whatsapp/engine.ts` | `Open dashboard` sends URL + code from auth Phase 1; add a `login` intent that replies with a code in auth Phase 1 (the vendor initiates, so it is inside the 24-hour window). |
| `lib/whatsapp/copy.ts` | New dashboard and login copy. |
| `lib/vendor-signup.ts` | Welcome email uses the combined code + link template (auth Phase 1); keep the shop if the email fails. |
| `components/start-form.tsx` | Copy change: the sign-in email contains a code and a link; no 15-minute-only claim. |
| `app/api/internal/jobs/run/route.ts` | Call `cleanupAuthArtifacts()` on every run, bounded per table. |
| `db/migrations/0025_vendor_sessions.sql` | Schema above. |

Tests that must change with the code:

| File | Change |
|---|---|
| `lib/email/provider.test.ts` | The subject assertion changes from "Your sikatree sign-in link" to "Your sikatree sign-in code" in auth Phase 1. |
| `lib/login-links.integration.test.ts` | The `redeemLoginToken` success object gains `nextPath`, so the exact-equality assertions change; keep `createSessionToken`/`verifySessionToken` as the legacy bridge, or update the import to `lib/session.ts`; add a test that `peekLoginToken` does not set `used_at`. |
| `lib/vendor-signup.integration.test.ts` | Assert the welcome email carries a code and a link in auth Phase 1. |
| `app/auth/*` | Not covered by `vitest.config.ts` (it includes `lib/**/*.test.ts` only). Put flow logic in `lib/session.ts` and `lib/login-codes.ts` and test it there; add a scripted e2e if needed. |

### 11.2 Key signatures

```ts
// lib/session.ts
export type SessionMeta = { userAgent: string | null; ip: string | null };

export async function createVendorSession(
  vendorId: string,
  meta: SessionMeta,
  options?: { persistent?: boolean; idleDays?: number },
): Promise<{ token: string; expiresAt: Date }>;

export async function currentSession(): Promise<{
  vendorId: string;
  sessionId: string;
} | null>;

export async function currentVendorId(): Promise<string | null>;

// nextPath is a validated relative path; the caller passes the page it needs.
export async function requireVendor(nextPath?: string): Promise<string>;

export async function touchSession(sessionId: string): Promise<void>;
export async function listSessions(vendorId: string): Promise<SessionSummary[]>;
export async function revokeSession(vendorId: string, sessionId: string): Promise<void>;
export async function revokeAllSessions(vendorId: string): Promise<void>;
```

```ts
// lib/login-codes.ts
export async function createLoginCode(
  vendorId: string,
  purpose?: 'login' | 'email_change' | 'phone_change',
): Promise<{ code: string; expiresAt: Date }>;

// identifier is the vendor's email or normalized phone.
export async function verifyLoginCode(
  identifier: string,
  code: string,
): Promise<{ ok: true; vendorId: string } | { ok: false }>;
```

```ts
// lib/login-links.ts
export async function createLoginLink(
  vendorId: string,
  options?: { nextPath?: string },
): Promise<{ url: string }>;

export async function peekLoginToken(raw: string): Promise<{
  vendorId: string;
  vendorName: string;
  maskedIdentifier: string;
  nextPath: string | null;
} | null>;

export async function redeemLoginToken(raw: string): Promise<
  | { ok: true; vendorId: string; nextPath: string | null }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' }
>;
```

`verifyLoginCode` takes the identifier (not a vendor id) so the caller cannot probe which accounts exist; it resolves the vendor internally, filters `purpose = 'login'`, and returns a single failure shape. `peekLoginToken` validates the same way as `redeemLoginToken` but never writes; it is what lets the confirmation page show the shop name without consuming the token.

### 11.3 Login flow (server actions)

```
requestLoginAction
  → rate limit (IP, email)
  → resolve vendor by lower(email)
  → if found: issue a code and a link (with the validated next path), send ONE email containing both
  → always return { status: 'code_sent', email }   // never "no such account"

verifyCodeAction
  → rate limit (IP)
  → verifyLoginCode(identifier, code)               // email now, phone in auth Phase 2; purpose='login' only
  → on success: createVendorSession({ persistent }), set cookie, redirect(safeNext)
  → on failure: { status: 'error', error: 'That code is invalid or has expired.' }

verifyLinkAction
  → same-origin check
  → redeemLoginToken(token)                         // returns nextPath
  → on success: createVendorSession({ persistent }), set cookie, redirect(safeNext(nextPath))
  → on failure: render the actionable expired page
```

There is **one** send action in auth Phase 1: the email carries both factors, so "send a code" and "send a link" would send the identical message. Auth Phase 0 keeps today's link-only send until the code exists.

Server actions can set cookies; server components cannot. Keep cookie writes in actions and route handlers only. The link action passes the `persistent` value from the confirm page checkbox; the code action passes it from the login form.

### 11.4 `requireVendor` semantics

The signature changes to `requireVendor(nextPath?: string)`. It still returns a vendor id or redirects, but the redirect becomes `/auth/login?next=<encoded>`. Every protected page passes its own path (for example `requireVendor('/dashboard/orders')`); server actions pass the page they belong to. The call sites are concentrated in `app/dashboard/page.tsx`, `app/dashboard/orders/page.tsx`, `app/dashboard/settings/page.tsx`, `app/dashboard/support/page.tsx`, `app/dashboard/items/actions.ts`, and `app/dashboard/actions.ts`. This is what makes the order alert's deep link survive sign-in. There is no middleware in the repo today; adding one to inject `x-pathname` is the alternative, but the explicit parameter is simpler and testable.

What else changes is the cost: one indexed session lookup per authenticated request, plus a throttled write at most once an hour. The touch is best-effort: if it fails, log it and continue, because a stale `last_seen_at` must never lock a vendor out. Do **not** add an in-process session cache: the app runs on Cloudflare Workers, where isolates do not share memory, so a cache would make revocation stale and inconsistent. If the lookup ever becomes hot, use a short-lived shared cache with an explicit staleness window, or leave it alone.

### 11.5 Legacy bridge

```ts
async function currentVendorId(): Promise<string | null> {
  const token = (await cookies()).get(VENDOR_COOKIE)?.value;
  if (!token) return null;
  const session = await findSession(token);        // new path
  if (session) return session.vendorId;
  return verifyLegacyToken(token);                 // old HMAC path
}
```

Delete `verifyLegacyToken` after all old cookies have expired (30 days after deploy).

A legacy cookie has no session row, so it cannot be listed or revoked. Upgrade it on the first authenticated **server action or route handler**: create a real session, set the new cookie, and let the legacy token expire. Do not try to write cookies from a server-component render. Support should know that a legacy session may not appear in the device list during the bridge month.

---

## 12. UX and copy

### 12.1 Login page

**Step 1 (auth Phase 1)**

```
Vendor sign in

Email
[ you@example.com ]

[ Send sign-in email ]             ← primary

We send a 6-digit code and a sign-in link in the same email.
```

**Step 2 (auth Phase 1)**

```
Check your email

We sent a 6-digit code and a sign-in link to ama@example.com.
The code expires in 15 minutes.

[ 4 8 2 9 1 3 ]                     ← one input, one-time-code

[ Verify and sign in ]

Resend code in 42s · Change email

You can also tap the link in the email.
```

Rules:

- The confirmation after step 1 is always the same: "If that email has a shop, we sent a sign-in email." It never reveals whether the address exists.
- Every failure on step 2 is: "That code is invalid or has expired." No distinction between unknown email, wrong code and burned code. The page offers resend.
- The code input autofocuses, accepts paste with or without spaces, and has a visible Verify button. Do not auto-submit on the sixth digit: a typo would burn one of the five attempts.
- The resend button shows a countdown. A resend does **not** invalidate the code the vendor already has; both codes work until they expire. The copy says "A new code is on its way. The previous code still works." Do not tell the vendor to use only the most recent one.
- The page remembers the email in a hidden field; "Change email" clears it.
- "Keep me signed in on this device" checkbox, checked by default, with a one-line explanation for shared phones.
- `next` is preserved in a hidden field and validated server-side.
- **Auth Phase 0:** there is no step 2 and no code. Step 1 sends the existing link-only email and shows "Check your email for a sign-in link. It works once and expires in 15 minutes." Do not merge the auth Phase 1 copy early.

**WhatsApp tab (auth Phase 2)**

```
On WhatsApp?
1. Send LOGIN to +233 …
2. We reply with a 6-digit code.
3. Enter it here.

[ Open WhatsApp ]   [ I have a code ]
```

### 12.2 Verify page

- Title: "Sign in to sikatree"
- Body: "Continue to Ama's Glow — a•••@gmail.com. Tap Continue to open your dashboard. This link works once."
- Button: "Continue"
- Checkbox: "Keep me signed in on this device" (checked by default).
- Footer: "If this is not your shop, close this page. If you did not ask to sign in, ignore it."
- Secondary (auth Phase 1): "Use the code from your email instead" → `/auth/login`.
- Expired/used state, auth Phase 0: title "This link has expired", body "Request a new link and open it in this browser.", button "Email me a new link". No code mention.
- Expired/used state, auth Phase 1: body "Use the 6-digit code from the same email, or request a new link.", buttons "Enter a code" and "Email me a new link". No redirect loop.
- The shop name and masked identifier are the login-CSRF control: a vendor who does not recognize the shop stops before Continue.

### 12.3 Email copy (auth Phase 1)

Subject: `Your sikatree sign-in code`

```
Hi Ama,

Your sikatree code is:

  482 913

Enter it at sikatree.africa/auth/login. It expires in 15 minutes.

Or tap this button to sign in:
[ Sign in to sikatree ]

If the button opens in a different browser than the one you use for your
shop, go back to your shop browser and enter the code above.

sikatree will never ask for this code by phone, WhatsApp or message.
If you did not ask to sign in, ignore this email. Your shop is safe.
```

Welcome email uses the same structure with `kind: 'welcome'` and the shop URL. In auth Phase 0, both emails remain link-only; the code block is added in auth Phase 1.

### 12.4 Settings

Add a **Sessions** section under Settings (DASH-15), with its own list component:

- "This device" + last active + **Sign out**
- Other devices, newest first, up to 10
- **Sign out everywhere**
- "Stay signed in for" 7 / 30 / 90 / 365 days (AUTH-02), default 30

No new top-level navigation. Settings is currently a stack of section cards (`app/dashboard/settings/page.tsx`), not a 64px row list, so budget a small new section and list component rather than assuming the existing row pattern.

### 12.5 Vendor guide and support copy

Update `docs/VENDOR-GUIDE.md`:

- "An email you check — we send a 6-digit code, and a link if you prefer."
- "Signing back in: enter your email, type the 6-digit code (or tap the link). The code works in whichever browser you are using."
- "Staying signed in: 30 days of not using the shop, then sign in again. You can change this in Settings."
- "New phone: use the code. If you have no email, message the bot with LOGIN."
- "Shared phone: untick 'Keep me signed in'."
- Auth Phase 0: keep the 15-minute link wording and change nothing about the email. Auth Phase 1: add the code line and the mixed sign-in instructions.

Support macros need the same change; the admin support replies currently point at the link-only flow.

---

## 13. Phased delivery

These are **auth workstreams**, not the delivery phases in `PLAN.md` section 7. A0 and A1 land inside the current delivery work; A2 fits the bot iteration; A3 is after the pilot. Effort assumes one developer with the existing test setup. It is deliberately sliced so each phase ships independently.

### Auth Phase 0: Stop the scanner bleed (shipped 2026-11-10)

Shipped: the confirmation page (`app/auth/verify/page.tsx`), POST-only redemption (`actions.ts`), `peekLoginToken` with shop name and masked identifier, the `next.config.mjs` headers, the analytics guard, and the integration tests. The bullets below are the record of what shipped; the remaining work is auth Phase 1.

- Convert `/auth/verify` from a GET-redeem route to a page + POST server action. Delete `app/auth/verify/route.ts`.
- Add `peekLoginToken` and show the shop name + masked identifier on the confirmation page (the login-CSRF control).
- Add the link-only expired/used state ("request a new link"). No code copy yet.
- Redirect to the dashboard if a valid session already exists.
- Add the headers in `next.config.mjs` (not the page): `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex`, `Cache-Control: no-store` for `/auth/verify` and `/auth/login`.
- Add the analytics guard in `lib/analytics.ts`: skip `/auth/*` and strip query strings from referrers.
- Add the "Keep me signed in" checkbox to the confirm page. In auth Phase 0 (stateless cookie) unchecked means a browser-session cookie with no `Max-Age`; the 12-hour server-side idle limit arrives with the session row in auth Phase 1. The checkbox must not silently do nothing in either phase.
- Keep the email copy and the 15-minute TTL unchanged.
- Test: `GET` does not consume; `POST` consumes once; a second `POST` fails; scanner simulation (`GET` then human `POST`) succeeds; `peekLoginToken` leaves `used_at` null; the confirm page shows the shop.

**Exit:** a prefetched link no longer produces "already used" for the human, and no auth token reaches the analytics table. This alone removes the most reported failure, before any schema change.

### Auth Phase 1: Sessions and codes (4 to 6 days)

- Migration `0025`.
- `lib/session.ts` and `lib/login-codes.ts`.
- Replace stateless session reads; keep the legacy fallback and upgrade legacy cookies in actions/route handlers.
- `requireVendor(nextPath?)` and the roughly dozen call sites; validate `next` on every path.
- Two-step login: code primary; the same email also carries the link (one send action).
- Minimal WhatsApp path: bot `LOGIN` intent issues a code, and the login page accepts a normalized phone + code. This closes the bot-created-vendor gap in the same release instead of leaving the bot link as the only door.
- Combined sign-in email (code + link) and welcome email.
- Multiple valid codes per vendor (no invalidation on resend); purpose filter; uniform timing.
- Cleanup job and indexes.
- Sessions section, sign out, sign out everywhere, idle-period setting; `logoutAction` revokes the row.
- Rate-limit tuning; a limit never invalidates an existing code or link.
- Structured `auth_event` logging.
- Tests in `lib/` (the vitest include path); a scripted browser check if needed, not `@playwright/test`, which is not installed.

**Exit:** a vendor signs in with a code in the browser they are holding; a bot-created vendor signs in with phone + WhatsApp code; stays signed in for 30 days of use; can revoke a device; no link preview can strand them; the order deep link survives sign-in.

### Auth Phase 1.5: Notification hygiene (0.5 day, can land with Auth Phase 1)

- Remove login links from order alerts; deep-link to `${appUrl()}/dashboard/orders` and carry `next`.
- Bot "Open dashboard" sends URL + code. The vendor can tap the link or use the code with their phone; both are real doors now.
- Confirm no other operational message carries a credential.

**Exit:** zero credentials in operational messages, and a bot-created vendor can sign in on a new phone with the bot code. Measure `login_link` row growth before and after.

### Auth Phase 2: WhatsApp-first polish (2 to 3 days)

- Full WhatsApp tab on the login page (the minimal phone + code path already ships in auth Phase 1).
- Add email in Settings for bot-created vendors (the existing TODO), so they can use email codes later. Adding an email requires a code sent to that address with purpose `email_change`; never accept an unverified address.
- Reuse the same code primitive to verify phone ownership on web signup (the outstanding `docs/EMAIL.md` gap), so the web path proves the number the bot would have proven.
- If we later need bot-initiated codes outside the window, submit an authentication template; do not block auth Phase 2 on it.

**Exit:** a vendor created on WhatsApp signs in on a new phone with no email, and can add a verified email for email codes.

### Auth Phase 3: Passkeys and login alerts (3 to 5 days)

- WebAuthn via a small library (for example `@simplewebauthn/server` and the browser counterpart); store credential id, public key, counter, transports, label.
- Register a passkey after a successful code/link sign-in, skippable.
- Sign in with passkey from the login page; email code remains the recovery path.
- Login alerts on a second channel.
- Anomaly checks on link/code requests and new devices.

**Exit:** a returning vendor on a new device signs in with biometrics in under 10 seconds, and can still recover without support.

### Before payouts: step-up (independent gate)

Step-up re-authentication for payout number, phone, email and PIN changes is required by PLAN 6.9 Wave 2 **before payouts go live**. It is not part of auth Phase 3 and must not wait for passkeys: it can reuse the same code primitive and a 5-minute "recently verified" marker on the session. Track it as its own gate on the payouts launch checklist.

### Sequencing against PLAN phases

Auth Phase 0 and Auth Phase 1 fit before payouts, alongside the current delivery Phase 2 work. Auth Phase 2 fits with the bot's next iteration. Auth Phase 3 is after the pilot, consistent with PLAN 6.9. The step-up gate lands before payouts, independently of Phase 3. Do not let any of this block the pilot: Auth Phase 0 is a hotfix, Auth Phase 1 is the durable fix, and the current link + 30-day cookie remains usable while it ships.

---

## 14. Tests and acceptance criteria

### 14.1 Unit

- Code generation: 6 digits, leading zeros preserved, unique salts, HMAC stable.
- Code verification: correct, wrong, expired, burned after 5; a second valid code still works after a resend (no invalidation); a `phone_change` code cannot verify as `login`.
- Unknown identifier: dummy HMAC compare path returns the same failure shape.
- Session token: 32 bytes, hash stored, no raw token in the row.
- Sliding: touch does not write more than once an hour; absolute cap is respected.
- `safeNext`: `/dashboard/orders` accepted; `//evil.com`, `https://evil.com`, `\evil`, `/auth/login`, and a 300-character path rejected.
- `peekLoginToken`: returns the shop name and identifier without writing `used_at`; expired and used tokens return null.
- Legacy token: old three-part cookie verifies; tampered legacy cookie fails.

### 14.2 Integration (Postgres)

- Request code → verify → session row exists → cookie works on `/dashboard`.
- Request link → `GET` leaves `used_at` null → `POST` sets it → second `POST` fails.
- Scanner simulation: `GET` twice, then a human `POST` succeeds.
- Wrong-browser flow: request code on "device A", verify on "device B", both see the same account; only B gets a session.
- Resend: request code, request another, verify with the first code; it still works until it expires.
- Purpose filter: a code issued for `email_change` cannot sign in.
- Rate limits: sixth code in 15 minutes per email is refused; 31st from one IP is refused; shared-IP scenario with 20 vendors still succeeds under the new limit. A refused send does not invalidate an existing code or link.
- Revocation: sign out everywhere invalidates all sessions on the next request; `logoutAction` revokes the current row.
- Cap: the 11th session revokes the oldest.
- Cleanup: expired links, codes and sessions are deleted; active rows are untouched; the `auth_event` delete uses a subquery (Postgres has no `DELETE … LIMIT`).
- Notification: `notifyVendorOfOrder` produces no `login_link` row and the message contains no token.
- Deep link: `/dashboard/orders` with no session redirects to login with `next`, and a code or link sign-in returns to `/dashboard/orders`.
- Enumeration: unknown email returns the same status and creates no row.
- Legacy: an old HMAC cookie still authenticates during the bridge window, and is upgraded on the first server action.

### 14.3 Browser/e2e

The repo has `playwright-core` and scripted checks, not `@playwright/test`. Either add `@playwright/test` as a deliberate dependency, or cover these as a script (the existing `scripts/*-smoke.mjs` pattern). Do not put them under `app/auth/*` expecting vitest to run them; `vitest.config.ts` includes `lib/**/*.test.ts` only.

- Mobile viewport: enter email → receive code (console provider in test) → type code → dashboard.
- Mobile viewport: open link → confirm page shows the shop name → Continue → dashboard.
- Close the tab and reopen the dashboard in the same context: still signed in.
- Open the link in a second context (simulating a mail app) while the first context is signed out: the code path works in the first context.
- Sessions settings: revoke another device, then that device redirects to login.
- `next` redirect lands on `/dashboard/orders`, not an external origin or `/auth/*`.
- "Keep me signed in" unchecked: the cookie has no `Max-Age` and the server row expires in 12 hours.

### 14.4 Acceptance criteria (product)

1. A link that an email scanner fetched still signs the vendor in when they tap it within 15 minutes.
2. A vendor who opens email on a laptop and the dashboard on a phone can sign in on the phone with the code, without a second email.
3. A vendor who signed in 29 days ago and used the dashboard yesterday is still signed in; the session slides.
4. A revoked device is rejected on its next request.
5. Closing the tab and reopening the same browser keeps the vendor signed in.
6. An order alert contains no credential and still gets the vendor to the order after sign-in.
7. Auth Phase 1: a used or expired link offers a code path and a resend path; auth Phase 0: it offers a resend path. No dead end in either.
8. `next=//evil.com`, `next=/auth/login` and a 300-character path cannot redirect off-site or into a loop.
9. A database dump contains no usable session token, link token or code.
10. The number of `login_link` rows created per month falls by at least 95% at current order volume.
11. A resend does not invalidate the code the vendor is reading.
12. A bot-created vendor with no email can sign in on a new phone with phone + WhatsApp code (auth Phase 1), not only with the bot link.

### 14.5 Metrics to instrument

Emit from the server, not the browser:

- `auth_code_sent{method=email|whatsapp}`
- `auth_code_verified{outcome=ok|bad|expired|burned}`
- `auth_link_viewed`, `auth_link_redeemed`, `auth_link_failed{reason=used|expired|invalid}`
- `auth_session_created{method=code|link|whatsapp|passkey}`
- `auth_session_revoked{reason=user|all|cap|admin}`
- `auth_signin_per_vendor_30d` (SQL over `auth_event`)
- `auth_link_redeemed_seconds_after_send` (histogram; a spike near zero confirms scanner consumption)
- Support tickets tagged "sign in" per 100 active vendors

Targets after auth Phase 1, measured over 30 days:

- "Link already used" errors below 1% of link views.
- At least 80% of sign-ins use a code, not a link (the resilient path is the default).
- Sign-in emails per active vendor per month down by at least 70%.
- Median time from "send code" to session under 60 seconds.
- No increase in account-takeover reports; a decrease in "cannot sign in" tickets.

---

## 15. Requirement and plan deltas

Applied on 2026-11-10; kept here as a record of the change. Revert if the direction changes.

### `docs/requirement.md`

| ID | Before | After |
|---|---|---|
| AUTH-01 | Vendors sign in to the PWA via a magic link or one-time code delivered on WhatsApp. No passwords. | Vendors sign in without a password using a **one-time code (preferred) or a magic link**, delivered by **email or WhatsApp**. The code can be entered in the browser that needs the session. |
| AUTH-02 | Sessions persist on the device for a configurable period (default 30 days) and can be revoked from settings. | Sessions persist and **slide with use**: 30 days of inactivity by default, configurable 7/30/90/365, absolute cap 365 days. Vendors can list devices and revoke one or all from Settings. |
| AUTH-03 | Vendors can sign up from the PWA directly (phone number, WhatsApp OTP), which then continues into the same guided setup. | Vendors can sign up from the PWA directly (phone number, a code by WhatsApp or email), which continues into the same guided setup. |
| ONB-20 | The bot offers an "Open dashboard" button that sends a single-use, expiring magic link … and prompts to install the PWA. | The bot offers an "Open dashboard" action that sends a **short-lived sign-in link and a one-time code**; either signs the vendor in without a password. (PWA install prompt remains deferred; there is no PWA yet.) |
| **AUTH-06 (new)** | — | Every sign-in email contains a one-time code as well as the link, so a preview, scanner or different browser cannot strand the vendor. |
| **AUTH-07 (new)** | — | Operational notifications (orders, stock, summaries) never contain authentication credentials; they deep-link to the dashboard. |

### `docs/PLAN.md`

- **3. Technology decisions:** auth row changed from "Custom WhatsApp magic-link auth" to "Custom passwordless auth: server-side sessions, one-time codes and links"; email row now says link sign-in ships today and code sign-in lands in auth Phase 1 (it must not claim codes are shipped).
- **6.4 Authentication:** replaced the three bullets with a summary of this document (code-first, link-fast, session-first; server-side sessions; 15-minute factors; revocation; notification hygiene) and a link to `docs/AUTH.md`.
- **6.9:** re-cut into auth Phase 0 (confirmation page), auth Phase 1 (codes, sessions, device list, cleanup) and Wave 3 (passkeys, alerts). The link lifetime target stays 15 minutes for both code and link. Step-up remains a separate Wave 2 gate before payouts, not part of auth Phase 3.
- **14. Current week:** added "Implement auth Phase 0 and auth Phase 1 of `docs/AUTH.md`"; kept "Add an email to dashboard settings" (auth Phase 2), since that also unlocks email sign-in for bot vendors.
- **Status snapshot:** changed "magic-link dashboard" to "passwordless dashboard" in the shipped list, and corrected the email row so it does not imply code sign-in is live.

### `docs/WHATSAPP.md`

Added a status note to the "Magic link dashboard" section: the bot link and 30-day cookie are live; auth Phase 1 adds the code and server-side sessions; auth Phase 2 adds the `LOGIN` intent. Do not rewrite it before those phases land.

### `docs/EMAIL.md`

Added a status note at the top: "The shipped flow below is being replaced by `docs/AUTH.md` (code-first, server-side sessions). Update this file when auth Phase 1 lands." Do not rewrite it before the code exists.

### `docs/VENDOR-GUIDE.md`

Apply the copy changes in 12.5 only when auth Phase 1 is live, so the guide never describes a flow the vendor cannot use.

---

## 16. Open questions and what not to do

### Open questions (recommendations in bold)

1. **Is 30 days idle or absolute?** **Idle, with a 365-day absolute cap.** It matches the phrase "persist on the device" and stops active vendors being logged out mid-workflow. If the product decision is a strict 30 days, the session table still supports it; only the sliding write and the setting change.
2. **Code or link as the default on the login page?** **Code.** It is the resilient path and it keeps the vendor in the browser. The link stays one tap away. Measure the mix and revisit after 30 days.
3. **WhatsApp code via inbound `LOGIN` or an authentication template?** **Inbound keyword first.** The vendor initiates, so the reply is inside the 24-hour window and needs no template approval. Add a template only for re-engagement or when a vendor cannot message us.
4. **Link and code TTL 10 or 15 minutes?** **Keep 15 for both.** The current copy and email delivery expectations already use 15; the POST fix removes the scanner problem, so shortening the window would add expiry friction for a marginal security gain. Revisit after 30 days of data on expiry-driven retries.
5. **Passkey library or native WebAuthn?** **`@simplewebauthn` server + browser** in auth Phase 3. It is small, audited and avoids hand-rolling attestation parsing. Do not add it to auth Phase 1.
6. **Shared-device default?** **"Keep me signed in" checked by default**, with the option visible. Most vendors use a personal phone; the shared-shop case is real but secondary, and a default-off checkbox would recreate the friction we are removing.
7. **Do we need a separate `auth_event` table, or are structured logs enough?** **Table.** The team is small and SQL over 90 days of events is faster than standing up a metrics stack. It also gives support a concrete answer.
8. **Do we keep the 30-day cookie name `ska_vendor`?** **Yes for the transition.** Rename to `__Host-ska_session` with the passkey release, when a one-time sign-out is acceptable.
9. **What is the bot-created vendor's door between auth Phase 1 and auth Phase 2?** **The minimal WhatsApp code ships in auth Phase 1**, so the bot link is a shortcut, not the only door. The full WhatsApp tab and email-adding flows are auth Phase 2.
10. **Do we accept the link token in edge logs?** **Yes, bounded.** The link token is in the URL by design; single use and 15 minutes bound the exposure. Do not claim otherwise in the security copy.

### Do not do

- Do not make links multi-use, longer-lived or IP-bound. Mobile networks change IP mid-session.
- Do not put session tokens or one-time codes in URLs, logs, analytics or notification bodies. The link token is the only credential that belongs in a URL, and only in its own single-use link. It will still appear in edge access logs; that is accepted and bounded.
- Do not remove the link. Some vendors prefer one tap, and it is the fastest path when it works.
- Do not make the code the only factor with no link until passkeys and recovery are proven.
- Do not ship code copy or the code input before a code can actually be sent (auth Phase 0 is link-only).
- Do not add an in-process session cache; Cloudflare Workers isolates do not share memory and revocation must stay immediate.
- Do not use `DELETE … LIMIT` (invalid Postgres) or rely on a cleanup timer that is not in `wrangler.jsonc`.
- Do not hard-block a vendor at a daily cap in a way that invalidates the code they already have.
- Do not build a generic "Sign in" confirmation page; the shop name and masked account are the login-CSRF control.
- Do not block the pilot on auth Phase 2 or 3. Auth Phase 0 and auth Phase 1 are the fix for the reported friction.
- Do not migrate to Supabase Auth for this. The custom flow is small, understood, and already integrated with phone identity, the bot and the dashboard.
- Do not add passwords, PINs or SMS as a "just in case" factor. Each adds a reset path and support load.
- Do not treat a link preview as a bug in the email provider. Treat it as a design constraint.

---

## 17. Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-11-10 | Adopt code-first, link-fast, session-first | The link is fragile across scanners and browser contexts; the session is the durable unit. |
| 2026-11-10 | Keep the magic link | One-tap is valuable when it works; removing it would be a regression for same-device users. |
| 2026-11-10 | Server-side sessions, opaque cookie | AUTH-02 requires revocation and a device list; a signed cookie cannot provide either. |
| 2026-11-10 | 6-digit code, 15 minutes, 5 attempts | Fits the email/WhatsApp channel and the existing link window; the attempt cap and rate limits make 6 digits sufficient for this risk profile. |
| 2026-11-10 | No credentials in notifications | Order alerts are operational, not authentication; forwarding an alert must not grant access. |
| 2026-11-10 | Auth Phase 0 first | Stops the most visible failure in under a day, before the schema change. |

---

## Appendix A: Why a 6-digit code is safe enough here

A 6-digit code has 1,000,000 possibilities. With 5 attempts per code, an attacker's chance per code is 0.0005%. The code is bound to one vendor, expires in 15 minutes, and is rate-limited per email, IP and vendor. The HMAC with a server-only key means a database leak does not allow offline brute force. This is the same risk profile as a bank OTP, with a shorter window and a smaller attempt budget. It is not a password and must never be reused or stored in plaintext.

The real risk is not guessing; it is **phishing** (a vendor typing the code into a fake site) and **account takeover** (someone with the email or WhatsApp). The mitigations are anti-phishing copy, a clear domain, passkeys in auth Phase 3, and the account-takeover plan in PLAN 6.9. A longer code would not fix either.

## Appendix B: The three reported scenarios, answered directly

| Scenario | What happens today | What happens after auth Phase 1 |
|---|---|---|
| **The email previews the link** | The preview's GET consumes the token; the vendor sees "already used" and must request another link. | The preview's GET only renders a page. The vendor's tap shows Continue; the POST redeems. If a scanner still consumes it, the code in the same email works. |
| **The vendor closes the shop tab** | The session is a cookie in that browser; if the link opened in another context, the session is not where they return. They request a new link. | In the same browser, the session persists and slides for 30 days of use. In a different context, they enter the code from the same email. |
| **Every sign-in needs a new link** | The link is the only factor, and every order alert carries another one. | The session lasts; codes are the default; links are a shortcut; order alerts carry no credentials. |
