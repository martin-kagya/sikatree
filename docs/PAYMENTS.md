# Payments (Paystack)

Status (2026-11-10): the test-mode adapter is shipped. Live collection still needs the Paystack
compliance review (Ghana business documents); the test and live keys are the same code path.

## Flow

1. The buyer picks **Pay now** at checkout. The option only appears when `PAYSTACK_SECRET_KEY` is set;
   otherwise checkout stays pay-on-delivery.
2. `placeOrder` stores the order with `payment_method = 'online'` and `payment_status = 'pending'`,
   and decrements stock exactly as before.
3. `startPayment` creates a `payments` row with a `SIK-…` reference and initializes Paystack Checkout
   with the server-computed total. The buyer is redirected to `authorization_url`.
4. Paystack returns the buyer to `/o/{code}/payment-callback`; that route verifies the transaction with
   the API and marks it paid.
5. Paystack also POSTs `/api/payments/paystack`. The route checks `x-paystack-signature` (HMAC-SHA512 of
   the raw body), verifies the transaction server-side, applies the event and records it in
   `payment_events` (unique per provider event id).
6. Once paid: `orders.payment_status = 'paid'` and `paid_at` are set, the vendor gets the WhatsApp order
   alert (and a low-stock alert), and the settlement ledger is written. The fulfilment lifecycle
   (`pending → confirmed → ready → completed`) is untouched. An unpaid online order cannot be confirmed;
   the dashboard shows **Waiting for online payment** until the money clears.
7. If the buyer abandons checkout, the pending payment expires after `PAYMENT_HOLD_MINUTES` (default 30).
   The job runner cancels the order and restores stock. Cancelling an unpaid order from the dashboard also
   abandons its intent and marks the order's payment failed.

## Ledger

- `payments` stores gross amount, Paystack fee, channel and provider transaction id.
- `ledger_entries` records, per paid order: **debit `provider_clearing`**, **credit `vendor_payable`**,
  both for `gross − provider fee`.
- Platform and buyer fees are **not applied yet**. The decided 1.5% + 1.5% model with the 1.95%
  gross-up (PAY-03/PAY-04) plugs in here later, which is why the ledger is a separate table rather than
  fields on the order.

## Setup

```bash
# .env.local (test key)
PAYSTACK_SECRET_KEY=sk_test_...
PAYMENT_HOLD_MINUTES=30
# Local testing or a tunnel; blank uses https://sikatree.africa
APP_URL=http://localhost:3001
```

In the Paystack dashboard, set the webhook URL to `https://<domain>/api/payments/paystack` and enable
`charge.success` and `charge.failed`. The callback URL is built from `site.url`; nothing else to
configure.

The scheduled endpoint `GET /api/internal/jobs/run` (Bearer `CRON_SECRET`) now drains the WhatsApp queue
**and** expires unpaid payments. Run it every minute or five. Response:
`{"processed": n, "expiredPayments": n}`.

## Local testing

1. Set the test secret key and run `pnpm dev`.
2. Buy something on a live shop and choose **Pay now**.
3. Use a Paystack test card. Watch the callback land on `/o/{code}?payment=paid` and the order show
   **Paid online**.
4. Send a signed webhook with `pnpm`/`curl` if you want to exercise the idempotent path; the signature is
   HMAC-SHA512 of the raw body using the same secret.

MoMo behaves differently in sandbox than in production; the real MTN/Telecel/AirtelTigo pass is a
post-compliance task.

## Before enabling live collection

- Update `app/terms` and `app/privacy`: the terms still say online payments are not connected.
- Add the live Paystack keys and run the real MoMo pass across MTN, Telecel and AirtelTigo.
- Add refunds and a payout path; today money settles to the platform account and the vendor payable
  ledger, with no payout run.

## Not built yet

- Platform fee split and buyer gross-up (PAY-03, PAY-04).
- Refunds, partial refunds and a `refunded` order view (PAY-06, ORD-10).
- Payouts (PAY-05).
- Email receipts (the email provider in `docs/EMAIL.md` can carry them).
- A "retry payment" button after a pending order. Today a failed attempt is retried by placing the order
  again; an abandoned one is cancelled by expiry.

## Safety rules

- Amounts come from the stored order, never from the request body.
- A redirect is never proof of payment; only verification is.
- One pending intent per order (partial unique index), and marking paid is idempotent under a row lock.
- A payment that succeeds after the order was cancelled is recorded, logged, and **not** fulfilled; it
  needs a manual refund until refunds are built.
