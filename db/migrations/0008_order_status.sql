-- 0008_order_status.sql
-- Track when an order last moved through its lifecycle.

alter table orders add column if not exists updated_at timestamptz not null default now();
