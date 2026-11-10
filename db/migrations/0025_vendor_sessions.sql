-- Vendor sessions and one-time sign-in codes (AUTH.md auth Phase 1).
-- The cookie carries an opaque token; only its hash is stored. Revocation,
-- sliding expiry and the device list all depend on the session row.

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
  revoked_reason text,
  constraint vendor_session_expiry_check check (expires_at <= absolute_expires_at)
);

create index if not exists vendor_session_vendor_idx
  on vendor_session (vendor_id, last_seen_at desc);
create index if not exists vendor_session_expiry_idx
  on vendor_session (expires_at);
create index if not exists vendor_session_revoked_idx
  on vendor_session (revoked_at);

alter table vendor_session enable row level security;

-- One-time codes. The HMAC (not the code) is stored; the per-row salt stops
-- cross-row precomputation. Multiple codes may be valid: resending must never
-- invalidate the code the vendor is already reading.
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
    check (purpose in ('login', 'email_change', 'phone_change')),
  constraint login_code_attempts_check check (attempts >= 0),
  constraint login_code_max_attempts_check check (max_attempts > 0)
);

create index if not exists login_code_vendor_idx
  on login_code (vendor_id, created_at desc);
create index if not exists login_code_expiry_idx
  on login_code (expires_at);

alter table login_code enable row level security;

-- Per-vendor session preference (AUTH-02's configurable period). Existing
-- vendors get the default.
alter table vendors
  add column if not exists session_idle_days integer not null default 30;

do $$
begin
  alter table vendors
    add constraint vendors_session_idle_days_check
    check (session_idle_days between 1 and 365);
exception
  when duplicate_object then null;
end $$;

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

-- A deep link survives sign-in: the link stores where the vendor was going.
alter table login_link add column if not exists next_path text;

-- The cleanup job deletes expired links by expiry time.
create index if not exists login_link_expiry_idx on login_link (expires_at);
