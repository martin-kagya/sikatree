-- 0005_item_images.sql
-- Public URL of a vendor's item photo, hosted in Supabase Storage.
-- image_ref keeps the original WhatsApp media id for re-downloads.

alter table items add column if not exists image_url text;
