-- 0002_ops.sql
-- Abuse protection and first-party funnel analytics (LP-19, LP-20).

-- Fixed-window counters. Buckets are coarse on purpose: "signup:ip:<addr>",
-- "signup:phone:+233...", "analytics:ip:<addr>". Old windows are pruned by the
-- migrate script and are harmless if they linger.
create table if not exists rate_limit (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

create table if not exists analytics_event (
  id bigserial primary key,
  name text not null,
  anon_id text,
  path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_event_name_idx on analytics_event (name, created_at);
create index if not exists analytics_event_created_idx on analytics_event (created_at);

alter table rate_limit enable row level security;
alter table analytics_event enable row level security;
