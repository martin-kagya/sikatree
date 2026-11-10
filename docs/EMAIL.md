# Web signup and email sign-in

> **Replanned 2026-11-10.** The flow below is what is live today. It is being replaced by
> `docs/AUTH.md` (code-first, link-fast, server-side sessions, no credentials in notifications).
> Update this file when auth Phase 1 lands.

Status (2026-11-10): shipped. This is the off-Meta onboarding path: a vendor can create a shop and sign
in without a WhatsApp Business account, which unblocks design partners while Meta verification is
pending.

## Flow

1. `/start` collects business name, type, shop link, WhatsApp number, email and consent.
2. The shop is created **live** with an empty catalogue. If the number matches a waitlist signup, that
   signup is marked `onboarded` and its handle reservation is claimed; reservations for other handles are
   released.
3. A single-use, 15-minute dashboard link is emailed to the address. The link is the proof that the
   person controls the email.
4. `/auth/login` takes an email and sends a fresh link. The page always shows the same confirmation, so
   it cannot be used to discover which emails have shops.
5. `/auth/verify` shows a confirmation page with the shop name and a masked account; tapping **Continue** POSTs to redeem the token and set the 30-day vendor session. A plain GET never consumes the token, so an email preview or scanner cannot burn the link (auth Phase 0, `docs/AUTH.md`).

## Rules

- Phone stays the unique shop identity: one shop per number, whether it came from the bot or the web.
- The handle is checked against reserved words, existing shops and active waitlist reservations. Your own
  reservation is claimable.
- Email is unique, case-insensitive.
- Rate limits: signup 10/IP/hour and 3 per phone and email per hour; sign-in 10/IP/15 min and 5 per email
  per 15 min.
- If the welcome email fails, the shop still exists and the sign-in page can send another link.

## Email delivery

```bash
# .env.local
RESEND_API_KEY=re_...
EMAIL_FROM="sikatree <hello@sikatree.africa>"
EMAIL_PROVIDER=          # leave blank; "console" forces the log sender
```

- Without `RESEND_API_KEY`, development and tests print messages with the `[email:out]` prefix. In
  production the provider returns null and email signup/sign-in are switched off rather than logging
  links.
- Verify the sending domain in Resend before using `EMAIL_FROM`; until then, deliveries fail with a 403.
- The templates live in `lib/email/templates.ts`; only the magic link is sent today.
- Links use `APP_URL` when set (e.g. `http://localhost:3001` for local tests), otherwise the canonical
  domain.

## Not built yet

- **Phone ownership is not proven on web signup.** The bot proves it because the vendor messages from the
  number; the web path only proves the email. Combined with one shop per phone, someone who knows a
  waitlist vendor's number could claim that vendor's reservation. Add an SMS or WhatsApp code before
  opening web signup to the public.
- Adding or changing an email from the dashboard, so vendors created by the bot cannot use email
  sign-in yet.
- A separate verified-email flag; the magic link itself proves control.
- Email receipts, order updates and vendor notifications.
- Password or passkey sign-in; links only.
