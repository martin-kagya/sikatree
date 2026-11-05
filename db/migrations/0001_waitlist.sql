-- 0001_waitlist.sql
-- Waitlist signups and reserved handles (PLAN.md Phase L, LP-09 to LP-14, LP-19, LP-23).

create table if not exists waitlist_signup (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  business_type text,
  business_name text,
  handle text,
  referral_code text not null,
  referred_by uuid references waitlist_signup (id) on delete set null,
  bumps integer not null default 0,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  consent_at timestamptz not null,
  status text not null default 'waiting',
  notes text,
  created_at timestamptz not null default now(),
  constraint waitlist_phone_unique unique (phone),
  constraint waitlist_referral_unique unique (referral_code),
  constraint waitlist_business_type_check
    check (business_type is null or business_type in ('products', 'services', 'both')),
  constraint waitlist_status_check
    check (status in ('waiting', 'invited', 'onboarded', 'unsubscribed'))
);

create index if not exists waitlist_created_idx on waitlist_signup (created_at);
create index if not exists waitlist_status_idx on waitlist_signup (status);

-- A handle reservation is a soft claim held while the vendor is still in the
-- queue. It expires (`RESERVATION_DAYS`, default 30) and the row is reused, so
-- the primary key on handle also caps each handle to one row.
create table if not exists reserved_handle (
  handle text primary key,
  signup_id uuid not null references waitlist_signup (id) on delete cascade,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'reserved',
  constraint reserved_handle_status_check
    check (status in ('reserved', 'claimed', 'released'))
);

create index if not exists reserved_handle_signup_idx on reserved_handle (signup_id);

-- The app connects with a role that bypasses RLS (the table owner locally, or
-- Supabase's service_role). Enable RLS with no permissive policies so that the
-- anon/authenticated keys cannot read or write these tables directly: every
-- insert goes through the server action.
alter table waitlist_signup enable row level security;
alter table reserved_handle enable row level security;
