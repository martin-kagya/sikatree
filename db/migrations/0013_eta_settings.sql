-- 0013_eta_settings.sql
-- Vendor-configurable ETA text for delivery and pickup orders, shown on the
-- order success card and the client tracking page. Appointment orders keep the
-- computed date/time.

alter table vendors add column if not exists eta_delivery_text text not null default 'Delivery in 45 to 60 minutes';
alter table vendors add column if not exists eta_pickup_text text not null default 'Ready for pickup in about 30 minutes';
