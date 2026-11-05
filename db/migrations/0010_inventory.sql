-- 0010_inventory.sql
-- Orders placed after stock decrement shipped can restore stock on cancel.
-- Orders that predate it must not, or a cancellation would inflate stock.

alter table orders add column if not exists stock_reserved boolean not null default false;
