-- 0021_waitlist_monthly_orders.sql
-- How many orders a vendor expects a month, captured on the waitlist so we can
-- size demand. Stored as a band rather than an exact number.

alter table waitlist_signup add column if not exists monthly_orders text;

alter table waitlist_signup drop constraint if exists waitlist_monthly_orders_check;
alter table waitlist_signup add constraint waitlist_monthly_orders_check
  check (
    monthly_orders is null
    or monthly_orders in ('just-starting', '1-20', '21-50', '51-100', '101-300', '300-plus')
  );
