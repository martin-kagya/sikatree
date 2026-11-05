-- 0012_delivery_zone.sql
-- Zonal delivery fees and cash-on-arrival for the delivery fee (ORD-03).
-- "fixed" mode now has a within-region and an outside-region rate. The client
-- picks a zone at checkout, and can defer the delivery fee to cash on arrival,
-- which keeps it out of the order total but records it for the vendor.

alter table vendors add column if not exists delivery_fee_outside_pesewas integer not null default 1500;

alter table vendors drop constraint if exists vendors_delivery_fee_outside_check;
alter table vendors add constraint vendors_delivery_fee_outside_check
  check (delivery_fee_outside_pesewas >= 0);

alter table orders add column if not exists delivery_zone text;

alter table orders drop constraint if exists orders_delivery_zone_check;
alter table orders add constraint orders_delivery_zone_check
  check (delivery_zone is null or delivery_zone in ('within', 'outside'));

alter table orders add column if not exists delivery_on_arrival boolean not null default false;
