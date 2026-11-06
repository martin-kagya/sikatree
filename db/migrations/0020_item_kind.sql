-- 0020_item_kind.sql
-- A vendor can run a shop and take service bookings under one page. Items now
-- carry their own kind so products and services can be listed and checked out
-- separately instead of relying on the vendor's overall type.

alter table items add column if not exists kind text not null default 'product';

alter table items drop constraint if exists items_kind_check;
alter table items add constraint items_kind_check check (kind in ('product', 'service'));

create index if not exists items_vendor_kind_idx on items (vendor_id, kind, position);

-- Service vendors' existing items are services. Product vendors keep products,
-- and a "both" vendor starts with products until it marks an item as a service.
update items
   set kind = 'service'
 where vendor_id in (select id from vendors where type = 'services');
