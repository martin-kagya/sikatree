-- Storefront customization, Phase 1 (docs/STOREFRONT-CUSTOMIZATION.md).
-- Existing name, bio, location, category, accent and card_image_ratio are
-- reused; this adds the brand fields and the link-button table.

alter table vendors add column if not exists tagline text;
alter table vendors add column if not exists logo_url text;
alter table vendors add column if not exists logo_alt text;
alter table vendors add column if not exists cover_url text;

create table if not exists vendor_links (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors (id) on delete cascade,
  kind text not null,
  label text not null,
  url text not null,
  position integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_links_kind_check check (kind in (
    'whatsapp', 'instagram', 'tiktok', 'snapchat', 'facebook',
    'website', 'maps', 'phone', 'custom'
  ))
);

create index if not exists vendor_links_vendor_idx
  on vendor_links (vendor_id, position);

-- One link per social channel, website, maps and phone. Custom links can repeat.
create unique index if not exists vendor_links_one_per_kind
  on vendor_links (vendor_id, kind)
  where kind <> 'custom';

alter table vendor_links enable row level security;
