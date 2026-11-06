-- 0019_service_availability.sql
-- Service vendors publish the hours they are open and the specific days they
-- are fully booked, so customers only see real slots. The optional weekly cap
-- limits how many appointments a vendor takes in a week.

create table if not exists vendor_availability (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors (id) on delete cascade,
  -- 0 = Sunday, 6 = Saturday.
  weekday smallint not null check (weekday between 0 and 6),
  start_minute integer not null check (start_minute between 0 and 1439),
  end_minute integer not null check (end_minute between 1 and 1440),
  constraint vendor_availability_window check (end_minute > start_minute),
  unique (vendor_id, weekday, start_minute)
);

create index if not exists vendor_availability_vendor_idx
  on vendor_availability (vendor_id, weekday, start_minute);

-- Specific dates the vendor is away or already fully booked.
create table if not exists vendor_blocked_date (
  vendor_id uuid not null references vendors (id) on delete cascade,
  blocked_date date not null,
  primary key (vendor_id, blocked_date)
);

alter table vendors add column if not exists booking_slot_minutes integer not null default 60;
alter table vendors add column if not exists weekly_booking_cap integer;

alter table vendors drop constraint if exists vendors_weekly_booking_cap_check;
alter table vendors add constraint vendors_weekly_booking_cap_check
  check (weekly_booking_cap is null or weekly_booking_cap between 1 and 500);

alter table vendor_availability enable row level security;
alter table vendor_blocked_date enable row level security;
