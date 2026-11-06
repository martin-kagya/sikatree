-- 0018_categories.sql
-- Vendor-defined, reorderable categories (CAT-03). Items still carry a free-text
-- category name; this table supplies the display order and the managed list.

create table if not exists vendor_categories (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  unique (vendor_id, name)
);

create index if not exists vendor_categories_vendor_idx on vendor_categories (vendor_id, position);

alter table vendor_categories enable row level security;
