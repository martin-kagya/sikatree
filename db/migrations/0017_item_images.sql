-- 0017_item_images.sql
-- Multiple item images (CAT-02): the primary photo stays on items.image_url;
-- this table holds up to four additional photos per item, ordered by position.

create table if not exists item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id) on delete cascade,
  url text not null,
  position integer not null default 0
);

create index if not exists item_images_item_idx on item_images (item_id, position);

alter table item_images enable row level security;
