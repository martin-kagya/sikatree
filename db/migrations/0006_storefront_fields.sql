-- 0006_storefront_fields.sql
-- Fields the public product listing needs (theme, badges, compare price,
-- categories, focal point, second image) that the chat flow does not set yet.

alter table vendors add column if not exists location text;
alter table vendors add column if not exists category text;
alter table vendors add column if not exists accent text;
alter table vendors add column if not exists card_image_ratio text not null default '1/1';

alter table vendors drop constraint if exists vendors_card_image_ratio_check;
alter table vendors add constraint vendors_card_image_ratio_check
  check (card_image_ratio in ('1/1', '4/5', '5/4'));

alter table items add column if not exists category text;
alter table items add column if not exists compare_at_pesewas integer;
alter table items add column if not exists badge text;
alter table items add column if not exists focal_x numeric;
alter table items add column if not exists focal_y numeric;
alter table items add column if not exists image_url_alt text;

alter table items drop constraint if exists items_badge_check;
alter table items add constraint items_badge_check
  check (badge is null or badge in ('discount', 'popular', 'new'));
