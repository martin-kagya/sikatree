-- 0007_orders.sql
-- Guest checkout orders (ORD-04, ORD-05 basics). Payments are not connected
-- yet, so orders start as pending with a pay-on-delivery/pickup note.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  vendor_id uuid not null references vendors (id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  fulfilment text not null,
  address text,
  notes text,
  booking_at timestamptz,
  subtotal_pesewas integer not null,
  delivery_pesewas integer not null default 0,
  total_pesewas integer not null,
  status text not null default 'pending',
  eta_text text,
  created_at timestamptz not null default now(),
  constraint orders_fulfilment_check check (fulfilment in ('delivery', 'pickup', 'appointment')),
  constraint orders_status_check check (status in ('pending', 'confirmed', 'ready', 'completed', 'cancelled')),
  constraint orders_totals_check check (subtotal_pesewas >= 0 and delivery_pesewas >= 0 and total_pesewas >= 0)
);

create index if not exists orders_vendor_idx on orders (vendor_id, created_at desc);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  item_id uuid references items (id) on delete set null,
  name text not null,
  price_pesewas integer not null,
  quantity integer not null,
  line_total_pesewas integer not null,
  constraint order_items_quantity_check check (quantity > 0)
);

create index if not exists order_items_order_idx on order_items (order_id);

alter table orders enable row level security;
alter table order_items enable row level security;
