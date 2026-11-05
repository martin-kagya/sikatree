# WhatsApp onboarding (Phase 1 slice 1)

A vendor can message the bot, agree to consent, give a business name and type,
pick a handle, add a first item, and get a live page. The page is at
`/{handle}` and renders from the database.

## What works today

| Requirement | Status |
|---|---|
| ONB-01 start from WhatsApp or a `wa.me` link | Works (footer "Chat on WhatsApp" and waitlist deep link) |
| ONB-02 phone number is the identity, one account per number | Works |
| ONB-03 consent with timestamp, STOP opt-out | Works |
| ONB-04 English copy catalogue | English in `lib/whatsapp/copy.ts`; no Twi yet |
| ONB-05 name, type and handle collected in order | Works; category, logo and bio are not asked yet |
| ONB-06 handle suggestions and availability | Works, including reserved words and existing reservations |
| ONB-07 reply buttons for fixed choices | Works (3 buttons maximum) |
| ONB-08 MoMo payout details | Not yet; online payments stay off |
| ONB-09 resume a stalled setup | Works: state and draft persist per number |
| ONB-10 photo items | Not yet; text only |
| ONB-11 text list items | Works, with Confirm / Edit / Cancel |
| ONB-14 price formats | Rules parser covers 250, GHS 250, GH₵250, 250 cedis, 250ghc, stock, comma lists |
| ONB-15 / ONB-16 no publishing without confirmation | Works for items |
| ONB-19 live link and share message | Works; share card image not built |
| ONB-22 menu | Partial: share, add item, orders placeholder, help |
| ONB-26 unsupported input fallback | Works for non-text, non-button messages |
| ONB-27 idempotent webhook and per-number rate limit | Works |
| LP-22 waitlist handoff | Works: name, type and held handle are prefilled; signup becomes onboarded and the reservation is claimed |

## Flow

```
new -> consent -> name -> type -> handle -> item -> item_confirm -> live
                                        \-> item_skip ------------> live
live: share | add item | orders | help | menu
Any state: STOP opts out, RESTART starts over, HELP calls a human.
```

State lives in `wa_conversation` (one row per phone, `context` holds the draft
and any pending item). Every inbound message is stored in `wa_message` with a
unique provider id before processing, so duplicate deliveries do nothing.

## Webhook

`POST /api/whatsapp/webhook` verifies `X-Hub-Signature-256` against
`WHATSAPP_APP_SECRET`, stores the message, and answers Meta immediately. The
conversation runs in `after()`, after the response, inside a transaction guarded
by `pg_advisory_xact_lock(hashtext(phone))`, so two messages from one vendor
never interleave.

`GET /api/whatsapp/webhook` answers Meta's subscription check with
`WHATSAPP_VERIFY_TOKEN`.

## Providers

`lib/whatsapp/provider.ts` has one interface and two implementations:

- `console` (default): prints replies to the server log. No Meta account needed.
- `cloud`: posts to the Graph API. Set `WHATSAPP_PROVIDER=cloud`,
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, optional
  `WHATSAPP_API_VERSION`.

## Try it locally

```bash
pnpm dev
pnpm wa:sim "START"
pnpm wa:sim --button consent_yes
pnpm wa:sim "Ama's Glow Studio"
pnpm wa:sim --button type_products
pnpm wa:sim "amasglow"
pnpm wa:sim "Serum 120"
pnpm wa:sim --button item_confirm
```

Replies appear in the `pnpm dev` log. The shop is then live at
`http://localhost:3000/amasglow`. Use `--phone 233...` to play another vendor,
and `WA_SIM_URL` to point at another host.

## Meta setup checklist

1. Create a WhatsApp Business account and a test number.
2. Put the app secret and a verify token in the environment.
3. Add `https://<domain>/api/whatsapp/webhook` as the callback URL, subscribe to
   the `messages` field.
4. Set `WHATSAPP_PROVIDER=cloud` plus the phone number id and access token.
5. Start the conversation from the test phone once to open the 24-hour window.

## Data

- `vendors`: phone (unique), name, handle (unique), type, status, consent time.
- `items`: vendor, name, price in pesewas, optional stock, status, position.
- `wa_conversation`: state, draft context, opt-out flag, last activity.
- `wa_message`: inbound log with unique provider ids and processed time.

## Known gaps

1. No durable queue. `after()` is fine on Vercel but a crash between the 200 and
   the handler loses the message until replay. A `wa_job` table with retries is
   the next reliability step.
2. Photo and voice parsing, categories, bio, logo, payout details and magic
   links are not built.
3. Templates outside the 24-hour window (nudges, order alerts) need approved
   templates from Meta.
4. `HELP` acknowledges a human but there is no inbox yet.
5. No funnel metrics for the bot (time to go-live, drop-off step, correction
   rate). The waitlist funnel is separate.
