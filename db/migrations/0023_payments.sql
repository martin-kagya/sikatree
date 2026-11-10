-- Online payments (Paystack). Payment state lives beside the fulfilment
-- lifecycle, so "paid" never collides with pending/confirmed/ready.
alter table orders
  add column payment_method text not null default 'offline',
  add column payment_status text not null default 'unpaid',
  add column paid_at timestamptz;

alter table orders
  add constraint orders_payment_method_check check (payment_method in ('online', 'offline')),
  add constraint orders_payment_status_check
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));

-- One pending payment intent per order. A retry reuses or replaces it, never
-- stacks two live authorizations that could both be paid.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  provider text not null default 'paystack',
  reference text not null unique,
  amount_pesewas integer not null check (amount_pesewas > 0),
  currency text not null default 'GHS',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'abandoned')),
  channel text,
  provider_reference text,
  provider_fee_pesewas integer,
  authorization_url text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_one_pending
  on payments (order_id) where status = 'pending';

create index if not exists payments_expiry_idx on payments (status, expires_at);

-- Webhook deliveries are recorded by provider event id; a duplicate delivery
-- inserts nothing and is acknowledged. The raw payload is kept for replay.
create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  reference text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

-- Append-only settlement ledger. The payment row keeps gross and provider fee;
-- these entries record net cash in and the amount owed to the vendor.
create table if not exists ledger_entries (
  id bigserial primary key,
  payment_id uuid references payments (id) on delete cascade,
  order_id uuid references orders (id) on delete cascade,
  account text not null,
  direction text not null check (direction in ('debit', 'credit')),
  amount_pesewas integer not null check (amount_pesewas > 0),
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists ledger_entries_order_idx on ledger_entries (order_id);
create index if not exists ledger_entries_payment_idx on ledger_entries (payment_id);
