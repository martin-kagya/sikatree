-- 0015_cancellation_reason.sql
-- Vendors record why an order was cancelled (ORD-10). The client sees the
-- reason on the tracking page; a WhatsApp client notification waits for
-- approved templates.

alter table orders add column if not exists cancellation_reason text;
