-- 0003_whatsapp.sql
-- Vendors, catalogue items, conversation state and the inbound message log
-- (Phase 1: ONB-01 to ONB-09, ONB-19, ONB-26, ONB-27).

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text not null,
  handle text not null unique,
  type text,
  bio text,
  status text not null default 'draft',
  consent_at timestamptz,
  waitlist_signup_id uuid references waitlist_signup (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_type_check check (type is null or type in ('products', 'services', 'both')),
  constraint vendors_status_check check (status in ('draft', 'live', 'suspended'))
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors (id) on delete cascade,
  name text not null,
  description text,
  price_pesewas integer not null,
  stock integer,
  status text not null default 'active',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint items_price_check check (price_pesewas >= 0),
  constraint items_stock_check check (stock is null or stock >= 0),
  constraint items_status_check check (status in ('active', 'sold_out', 'hidden'))
);

create index if not exists items_vendor_idx on items (vendor_id, position);

-- One conversation per WhatsApp number (ONB-02, ONB-09). `context` holds the
-- draft vendor and any pending confirmation, so a stall resumes mid-flow.
create table if not exists wa_conversation (
  phone text primary key,
  vendor_id uuid references vendors (id) on delete set null,
  state text not null default 'new',
  context jsonb not null default '{}'::jsonb,
  opted_out boolean not null default false,
  last_activity timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Every inbound message is stored before processing. The unique provider id is
-- what makes duplicate webhook deliveries harmless (ONB-27).
create table if not exists wa_message (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text not null unique,
  phone text not null,
  direction text not null default 'in',
  kind text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  status text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wa_message_direction_check check (direction in ('in', 'out'))
);

create index if not exists wa_message_phone_idx on wa_message (phone, created_at desc);

alter table vendors enable row level security;
alter table items enable row level security;
alter table wa_conversation enable row level security;
alter table wa_message enable row level security;
