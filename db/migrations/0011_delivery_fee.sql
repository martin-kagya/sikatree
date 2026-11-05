-- 0011_delivery_fee.sql
-- Vendor-configurable delivery fee (ORD-03): free, fixed, or confirm-after.
-- The order snapshots the mode so a later settings change does not rewrite
-- what the client was shown at checkout.

alter table vendors add column if not exists delivery_fee_mode text not null default 'fixed';
alter table vendors add column if not exists delivery_fee_pesewas integer not null default 1500;

alter table vendors drop constraint if exists vendors_delivery_fee_mode_check;
alter table vendors add constraint vendors_delivery_fee_mode_check
  check (delivery_fee_mode in ('free', 'fixed', 'confirm_after'));

alter table vendors drop constraint if exists vendors_delivery_fee_pesewas_check;
alter table vendors add constraint vendors_delivery_fee_pesewas_check
  check (delivery_fee_pesewas >= 0);

alter table orders add column if not exists delivery_fee_mode text not null default 'fixed';

alter table orders drop constraint if exists orders_delivery_fee_mode_check;
alter table orders add constraint orders_delivery_fee_mode_check
  check (delivery_fee_mode in ('free', 'fixed', 'confirm_after'));
