-- 0009_support.sql
-- Human support inbox for WhatsApp "Help" (ONB-25, ADM-02).

create table if not exists support_ticket (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors (id) on delete set null,
  phone text not null,
  status text not null default 'open',
  reason text not null default 'help',
  last_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_ticket_status_check check (status in ('open', 'closed'))
);

-- One open ticket per phone; a new help message after closing starts a new one.
create unique index if not exists support_ticket_open_phone_idx
  on support_ticket (phone) where status = 'open';

create index if not exists support_ticket_status_idx
  on support_ticket (status, updated_at desc);

alter table support_ticket enable row level security;
