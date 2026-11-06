#!/usr/bin/env node
// Seeds a demo service provider ("Naa's Glow Studio" at /naasglow) so the
// appointment/booking flow can be tested end to end.
//
//   node scripts/seed-demo-services.mjs
//
// Re-runnable: it upserts the vendor and replaces its services.
import { mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { Client } from 'pg';

const HANDLE = 'naasglow';
const OUT_DIR = `public/sample-stores/${HANDLE}`;

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^(['"])(.*)\1$/, '$2');
  }
}

const VENDOR = {
  name: "Naa's Glow Studio",
  phone: '+233240000111',
  bio: 'Bridal and event makeup, hair and gele in Accra. Soft glam that lasts the day.',
  location: 'Osu, Accra',
  category: 'Makeup & beauty',
};

const SERVICES = [
  {
    slug: 'bridal-makeup',
    name: 'Bridal makeup',
    price: 95000,
    category: 'Bridal',
    description:
      'Full bridal glam with lashes, a touch-up kit and a 30-minute trial. Travel within Accra included.',
    source: 'public/hustles/beauty.jpg',
    position: 'centre',
  },
  {
    slug: 'soft-glam-session',
    name: 'Soft glam session',
    price: 35000,
    category: 'Events',
    description: 'Everyday glow for dinners, birthdays and shoots. About 60 minutes at the studio.',
    source: 'public/hustles/beauty.jpg',
    position: 'top',
  },
  {
    slug: 'gele-styling',
    name: 'Gele styling',
    price: 45000,
    category: 'Bridal',
    description:
      'Hand-tied gele in your chosen style, pinned to last the day. Add makeup for a bundle price.',
    source: 'public/hustles/hair.jpg',
    position: 'centre',
  },
  {
    slug: 'photoshoot-makeup',
    name: 'Photoshoot makeup',
    price: 55000,
    category: 'Photoshoot',
    description: 'Camera-ready finish that holds under studio lights. Book with your photographer.',
    source: 'public/hustles/photography.jpg',
    position: 'centre',
  },
  {
    slug: 'bridal-party',
    name: 'Bridal party (per person)',
    price: 40000,
    category: 'Bridal',
    description:
      'Makeup for bridesmaids and family. One artist per four people; travel quoted separately.',
    source: 'public/hustles/heels.jpg',
    position: 'centre',
  },
  {
    slug: 'birthday-glam',
    name: 'Birthday glam',
    price: 30000,
    category: 'Events',
    description: 'A bold, photo-ready look for your birthday dinner or night out. About 60 minutes.',
    source: 'public/hustles/beauty.jpg',
    position: 'bottom',
  },
  {
    slug: 'content-day',
    name: 'Content day',
    price: 120000,
    category: 'Photoshoot',
    description:
      'Half-day glam with up to three looks and a touch-up artist on set for your content shoot.',
    source: 'public/hustles/photography.jpg',
    position: 'bottom',
  },
  {
    slug: 'makeup-lesson',
    name: 'One-on-one makeup lesson',
    price: 40000,
    category: 'Events',
    description:
      'Bring your kit and learn your everyday face in 90 minutes. Notes and a product list included.',
    source: 'public/hustles/beauty.jpg',
    position: 'left',
  },
];

await mkdir(OUT_DIR, { recursive: true });
for (const service of SERVICES) {
  await sharp(service.source)
    .resize(1200, 1200, { fit: 'cover', position: service.position })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(OUT_DIR, `${service.slug}.jpg`));
}
console.log(`images: ${SERVICES.length} written to ${OUT_DIR}`);

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/sikatree_dev';
const client = new Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});
await client.connect();

const existing = await client.query('select id from vendors where handle = $1', [HANDLE]);
let vendorId;
if (existing.rows[0]) {
  vendorId = existing.rows[0].id;
  await client.query(
    `update vendors
        set name = $2, phone = $3, type = 'services', status = 'live', bio = $4,
            location = $5, category = $6, updated_at = now()
      where id = $1`,
    [vendorId, VENDOR.name, VENDOR.phone, VENDOR.bio, VENDOR.location, VENDOR.category],
  );
} else {
  const inserted = await client.query(
    `insert into vendors (phone, name, handle, type, status, consent_at, bio, location, category)
     values ($1, $2, $3, 'services', 'live', now(), $4, $5, $6)
     returning id`,
    [VENDOR.phone, VENDOR.name, HANDLE, VENDOR.bio, VENDOR.location, VENDOR.category],
  );
  vendorId = inserted.rows[0].id;
}

await client.query('delete from items where vendor_id = $1', [vendorId]);
for (const [index, service] of SERVICES.entries()) {
  await client.query(
    `insert into items
       (vendor_id, name, description, price_pesewas, stock, status, category, position, image_url, kind)
     values ($1, $2, $3, $4, null, 'active', $5, $6, $7, 'service')`,
    [
      vendorId,
      service.name,
      service.description,
      service.price,
      service.category,
      index,
      `/sample-stores/${HANDLE}/${service.slug}.jpg`,
    ],
  );
}

// Weekly availability: Monday to Saturday, 09:00-18:00, 60-minute slots.
await client.query('delete from vendor_availability where vendor_id = $1', [vendorId]);
for (const weekday of [1, 2, 3, 4, 5, 6]) {
  await client.query(
    `insert into vendor_availability (vendor_id, weekday, start_minute, end_minute)
     values ($1, $2, $3, $4)`,
    [vendorId, weekday, 9 * 60, 18 * 60],
  );
}
await client.query('delete from vendor_blocked_date where vendor_id = $1', [vendorId]);
await client.query(
  'update vendors set booking_slot_minutes = 60, weekly_booking_cap = null where id = $1',
  [vendorId],
);

await client.end();
console.log(`seeded ${SERVICES.length} services for /${HANDLE} (vendor ${vendorId})`);
console.log('availability: Mon-Sat 09:00-18:00, 60-minute slots, no weekly cap');
