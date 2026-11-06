-- 0016_inventory.sql
-- Low-stock alerts (INV-04) and a stock movement log (INV-05).
-- low_stock_threshold is vendor-level; null/blank means alerts are off.

alter table vendors add column if not exists low_stock_threshold integer;

create table if not exists stock_movement (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id) on delete cascade,
  delta integer not null,
  source text not null default 'manual',
  reason text,
  created_at timestamptz not null default now(),
  constraint stock_movement_source_check check (source in ('manual', 'order', 'cancellation'))
);

create index if not exists stock_movement_item_idx on stock_movement (item_id, created_at desc);

alter table stock_movement enable row level security;
