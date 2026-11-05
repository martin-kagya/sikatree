#!/usr/bin/env node
// Seeds the demo storefront for /amasglow: unbranded product renders plus a
// ten-product catalogue that exercises photos, descriptions, badges, stock and
// the grid variants. Run with: node scripts/seed-demo-store.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { Client } from 'pg';

const OUT_DIR = 'public/sample-stores/amasglow';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^(['"])(.*)\1$/, '$2');
  }
}

const PRODUCTS = [
  {
    slug: 'vitamin-c-serum',
    kind: 'dropper',
    bg: ['#f6f1e9', '#e7dece'],
    product: '#c58a44',
    cap: '#2c2a28',
    alt: true,
    name: 'Vitamin C serum',
    price: 12000,
    compareAt: 15000,
    badge: 'discount',
    category: 'Serums',
    stock: 8,
    description: 'Brightening serum with 12% vitamin C, for dark spots and dull skin. 30ml.',
  },
  {
    slug: 'hyaluronic-serum',
    kind: 'dropper',
    bg: ['#eef3f1', '#dfe8e3'],
    product: '#8fa7a0',
    cap: '#3a3f3d',
    alt: false,
    name: 'Hyaluronic serum',
    price: 9500,
    compareAt: null,
    badge: null,
    category: 'Serums',
    stock: 3,
    description: 'Light hydration for thirsty skin. Layers under moisturiser. 30ml.',
  },
  {
    slug: 'shea-body-butter',
    kind: 'jar',
    bg: ['#f7f1e6', '#eadcc8'],
    product: '#efe3cc',
    cap: '#8b6b45',
    alt: true,
    name: 'Shea body butter',
    price: 4500,
    compareAt: null,
    badge: null,
    category: 'Body',
    stock: null,
    description: 'Unrefined shea from northern Ghana, whipped with almond oil. 200g.',
    focal: { x: 0.5, y: 0.35 },
  },
  {
    slug: 'cocoa-body-butter',
    kind: 'jar',
    bg: ['#f3ece4', '#e2d2c2'],
    product: '#d8b795',
    cap: '#6b4a32',
    alt: false,
    name: 'Cocoa body butter',
    price: 5000,
    compareAt: null,
    badge: 'popular',
    category: 'Body',
    stock: 0,
    description: null,
  },
  {
    slug: 'glow-gift-set',
    kind: 'gift',
    bg: ['#f5f0ea', '#e5d8ca'],
    product: '#d9b98f',
    cap: '#2f3a33',
    alt: true,
    name: 'Glow gift set',
    price: 18000,
    compareAt: 22000,
    badge: 'discount',
    category: 'Gift sets',
    stock: 4,
    description: 'Serum, body butter and lip balm in a keepsake box. Ready to give.',
  },
  {
    slug: 'mini-glow-trio',
    kind: 'trio',
    bg: ['#f2f4f1', '#e1e7df'],
    product: '#b7c7b4',
    cap: '#333b34',
    alt: false,
    name: 'Mini glow trio',
    price: 12000,
    compareAt: null,
    badge: null,
    category: 'Gift sets',
    stock: null,
    description: null,
  },
  {
    slug: 'rose-face-mist',
    kind: 'spray',
    bg: ['#f8f1f2', '#ecdcdd'],
    product: '#d9a6a8',
    cap: '#4a3a3c',
    alt: false,
    name: 'Rose face mist',
    price: 7500,
    compareAt: null,
    badge: null,
    category: 'Serums',
    stock: 12,
    description: null,
  },
  {
    slug: 'charcoal-soap',
    kind: 'bar',
    bg: ['#f0f1f2', '#dde0e3'],
    product: '#4b5157',
    cap: '#2d3135',
    alt: false,
    name: 'Charcoal soap',
    price: 3500,
    compareAt: null,
    badge: null,
    category: 'Body',
    stock: 2,
    description: 'Activated charcoal bar for oily skin. Cold pressed, 120g.',
  },
  {
    slug: 'lip-butter',
    kind: 'tin',
    bg: ['#f7f1ec', '#e9d9cf'],
    product: '#e4c3b2',
    cap: '#8d5a4c',
    alt: false,
    name: 'Lip butter',
    price: 2500,
    compareAt: null,
    badge: null,
    category: 'Body',
    stock: 20,
    description: 'Shea and cocoa butter for dry lips. 15g tin.',
  },
  {
    slug: 'night-cream',
    kind: 'jar',
    bg: ['#f1f0f6', '#dedce8'],
    product: '#cfc9de',
    cap: '#413b52',
    alt: false,
    name: 'Night cream',
    price: 8500,
    compareAt: null,
    badge: 'new',
    category: 'Body',
    stock: 6,
    description: 'Rich overnight cream with niacinamide. Wake up softer. 50ml.',
  },
];

// A soft studio background and simple, label-free packaging. No text and no
// brand marks anywhere.
function scene(product, variant) {
  const [top, bottom] = product.bg;
  const shift = variant === 2 ? 26 : 0;
  const scale = variant === 2 ? 0.94 : 1;
  const { product: fill, cap } = product;

  const shapes = {
    dropper: `
      <rect x="470" y="500" width="260" height="440" rx="40" fill="url(#glass)"/>
      <rect x="540" y="430" width="120" height="90" rx="18" fill="${fill}" opacity="0.85"/>
      <rect x="532" y="360" width="136" height="90" rx="22" fill="${cap}"/>
      <rect x="570" y="300" width="60" height="70" rx="16" fill="${cap}" opacity="0.9"/>
      <rect x="500" y="540" width="36" height="340" rx="18" fill="#ffffff" opacity="0.28"/>`,
    jar: `
      <rect x="410" y="600" width="380" height="330" rx="46" fill="${fill}"/>
      <rect x="396" y="540" width="408" height="96" rx="34" fill="${cap}"/>
      <ellipse cx="600" cy="540" rx="204" ry="34" fill="${cap}" opacity="0.85"/>
      <rect x="432" y="636" width="44" height="250" rx="22" fill="#ffffff" opacity="0.3"/>
      <rect x="560" y="700" width="200" height="120" rx="18" fill="#ffffff" opacity="0.18"/>`,
    gift: `
      <rect x="390" y="520" width="420" height="420" rx="26" fill="${fill}"/>
      <rect x="575" y="520" width="50" height="420" fill="${cap}" opacity="0.9"/>
      <rect x="390" y="700" width="420" height="50" fill="${cap}" opacity="0.9"/>
      <path d="M600 520c-60-70-150-40-120 16 20 34 90 30 120 10 30 20 100 24 120-10 30-56-60-86-120-16z" fill="${cap}" opacity="0.75"/>
      <rect x="420" y="552" width="36" height="340" rx="18" fill="#ffffff" opacity="0.2"/>`,
    spray: `
      <rect x="520" y="500" width="160" height="460" rx="34" fill="url(#glass)"/>
      <rect x="556" y="430" width="88" height="80" rx="16" fill="${cap}"/>
      <rect x="548" y="392" width="104" height="44" rx="14" fill="${cap}" opacity="0.9"/>
      <rect x="542" y="540" width="30" height="340" rx="15" fill="#ffffff" opacity="0.3"/>`,
    bar: `
      <rect x="400" y="640" width="400" height="240" rx="56" fill="${fill}"/>
      <rect x="420" y="660" width="360" height="80" rx="40" fill="#ffffff" opacity="0.14"/>
      <rect x="440" y="772" width="320" height="18" rx="9" fill="#000000" opacity="0.12"/>`,
    tin: `
      <ellipse cx="600" cy="760" rx="200" ry="86" fill="${cap}"/>
      <rect x="400" y="690" width="400" height="70" rx="30" fill="${fill}"/>
      <ellipse cx="600" cy="690" rx="200" ry="80" fill="${fill}"/>
      <ellipse cx="600" cy="690" rx="152" ry="56" fill="#ffffff" opacity="0.18"/>`,
    trio: `
      <rect x="380" y="640" width="130" height="320" rx="30" fill="${fill}"/>
      <rect x="398" y="600" width="94" height="46" rx="14" fill="${cap}"/>
      <rect x="535" y="560" width="140" height="400" rx="32" fill="${fill}" opacity="0.92"/>
      <rect x="554" y="516" width="102" height="50" rx="14" fill="${cap}"/>
      <rect x="700" y="600" width="130" height="360" rx="30" fill="${fill}" opacity="0.84"/>
      <rect x="718" y="560" width="94" height="46" rx="14" fill="${cap}"/>
      <rect x="398" y="676" width="22" height="250" rx="11" fill="#ffffff" opacity="0.25"/>`,
  };

  return `<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${fill}"/>
      <stop offset="1" stop-color="${fill}" stop-opacity="0.72"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <rect width="1200" height="1200" fill="url(#glow)"/>
  <g transform="translate(${shift} 0) translate(600 760) scale(${scale}) translate(-600 -760)">
    <ellipse cx="600" cy="960" rx="280" ry="54" fill="#2b241d" opacity="0.18" filter="url(#soft)"/>
    ${shapes[product.kind]}
  </g>
</svg>`;
}

async function render(product, variant) {
  const file = path.join(OUT_DIR, `${product.slug}-${variant}.jpg`);
  await sharp(Buffer.from(scene(product, variant)))
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(file);
  return file;
}

await mkdir(OUT_DIR, { recursive: true });

const files = [];
for (const product of PRODUCTS) {
  files.push(await render(product, 1));
  if (product.alt) files.push(await render(product, 2));
}
console.log(`images: ${files.length} written to ${OUT_DIR}`);

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/sikatree_dev';
const client = new Client({ connectionString: databaseUrl, ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined });
await client.connect();

const vendorRows = await client.query("select id from vendors where handle = 'amasglow'");
const vendor = vendorRows.rows[0];
if (!vendor) throw new Error('Run the bot onboarding for amasglow first');

await client.query(
  `update vendors
      set bio = $2, location = $3, category = $4, accent = null, card_image_ratio = '1/1'
    where id = $1`,
  [
    vendor.id,
    'Serums, body butters and gift sets for everyday glow.',
    'Kumasi',
    'Skincare',
  ],
);

const previous = await client.query('select image_url from items where vendor_id = $1 and image_url like $2', [
  vendor.id,
  '%/storage/v1/object/public/%',
]);

await client.query('delete from items where vendor_id = $1', [vendor.id]);

for (const [index, product] of PRODUCTS.entries()) {
  await client.query(
    `insert into items
       (vendor_id, name, description, price_pesewas, compare_at_pesewas, stock, status,
        category, badge, focal_x, focal_y, image_url, image_url_alt, position, created_at)
     values ($1,$2,$3,$4,$5,$6,'active',$7,$8,$9,$10,$11,$12,$13, now() - ($14 || ' hours')::interval)`,
    [
      vendor.id,
      product.name,
      product.description,
      product.price,
      product.compareAt,
      product.stock,
      product.category,
      product.badge,
      product.focal?.x ?? null,
      product.focal?.y ?? null,
      `/sample-stores/amasglow/${product.slug}-1.jpg`,
      product.alt ? `/sample-stores/amasglow/${product.slug}-2.jpg` : null,
      index,
      index,
    ],
  );
}

// Remove the old uploaded demo images so the bucket does not keep orphans.
const supabaseUrl = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const secret = process.env.SUPABASE_SECRET_KEY;
if (supabaseUrl && secret) {
  for (const row of previous.rows) {
    const objectPath = row.image_url.split('/object/public/items/')[1];
    if (!objectPath) continue;
    await fetch(`${supabaseUrl}/storage/v1/object/items/${objectPath}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${secret}`, apikey: secret },
    }).catch(() => {});
  }
}

await client.end();
console.log(`catalogue: ${PRODUCTS.length} products seeded for amasglow`);
