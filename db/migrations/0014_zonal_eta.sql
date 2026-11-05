-- 0014_zonal_eta.sql
-- Delivery ETA is now zonal like the fee: one estimate for the vendor's region
-- and one for outside it. Rename the single delivery text to the within-region
-- value and add the outside-region value.

alter table vendors rename column eta_delivery_text to eta_delivery_within_text;
alter table vendors add column if not exists eta_delivery_outside_text text not null default 'Delivery in 45 to 60 minutes';
