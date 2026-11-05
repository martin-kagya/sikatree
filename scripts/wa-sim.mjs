#!/usr/bin/env node
// Sends a fake inbound WhatsApp message to the local webhook, signed the same
// way Meta signs it. Use it to walk the onboarding flow without a Business
// account:
//
//   pnpm wa:sim "START"
//   pnpm wa:sim "Ama's Glow Studio"
//   pnpm wa:sim --button type_products
//   pnpm wa:sim "Serum 120"
//
// Bot replies are printed by the server (console provider) in its log.
import { readFileSync, existsSync } from 'node:fs';
import { randomUUID, createHmac } from 'node:crypto';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^(['"])(.*)\1$/, '$2');
  }
}

const args = process.argv.slice(2);
let phone = process.env.WA_SIM_PHONE ?? '233241234567';
let button = null;
let imageCaption = null;
const textParts = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--phone') phone = args[++i];
  else if (args[i] === '--button') button = args[++i];
  else if (args[i] === '--image') imageCaption = args[++i];
  else textParts.push(args[i]);
}

const text = textParts.join(' ');
if (!text && !button && imageCaption === null) {
  console.error('Usage: pnpm wa:sim "message" [--phone 233...] [--button id] [--image "caption"]');
  process.exit(1);
}

const simBase = new URL(
  process.env.WA_SIM_URL ?? 'http://127.0.0.1:3000/api/whatsapp/webhook',
).origin;
const imageId = process.env.WA_SIM_IMAGE_URL ?? `${simBase}/clothing.jpg`;

const message = {
  from: phone.replace(/\D/g, ''),
  id: `wamid.sim.${randomUUID()}`,
  timestamp: String(Math.floor(Date.now() / 1000)),
  type: button ? 'interactive' : imageCaption !== null ? 'image' : 'text',
  ...(button
    ? { interactive: { type: 'button_reply', button_reply: { id: button, title: button } } }
    : imageCaption !== null
      ? { image: { id: imageId, caption: imageCaption } }
      : { text: { body: text } }),
};

const payload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'sim',
      changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', messages: [message] } }],
    },
  ],
};

const raw = JSON.stringify(payload);
const secret = process.env.WHATSAPP_APP_SECRET;
if (!secret) {
  console.error('WHATSAPP_APP_SECRET is not set in .env.local');
  process.exit(1);
}

const signature = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
const url = process.env.WA_SIM_URL ?? 'http://127.0.0.1:3000/api/whatsapp/webhook';

const response = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature },
  body: raw,
});

console.log(
  `sent as ${phone}: ${button ? `button ${button}` : imageCaption !== null ? `image "${imageCaption}"` : text}`,
);
console.log(`webhook ${response.status}: ${await response.text()}`);
