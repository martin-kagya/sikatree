-- 0004_jobs_auth.sql
-- Durable job queue, photo refs, replay guard and single-use login links
-- (PLAN.md 6.2 idempotency, ONB-10 media, ONB-20 / AUTH-01 magic links).

create table if not exists wa_job (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  run_after timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wa_job_status_check check (status in ('pending', 'running', 'done', 'failed'))
);

create index if not exists wa_job_due_idx on wa_job (status, run_after);

-- Replay guard: a message processed twice must not advance the conversation
-- twice (ONB-27). The engine records the provider id it last applied here.
alter table wa_conversation add column if not exists last_message_id text;

-- Placeholder for the media that a photo item came from. Hosting and
-- thumbnails follow in a later step; the reference lets us re-download it then.
alter table items add column if not exists image_ref text;

create table if not exists login_link (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists login_link_vendor_idx on login_link (vendor_id);

alter table wa_job enable row level security;
alter table login_link enable row level security;
