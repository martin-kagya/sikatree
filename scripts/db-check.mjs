#!/usr/bin/env node
// Prints where DATABASE_URL points and whether the waitlist schema is there.
// Safe to run against production: read-only, secrets masked.
import { existsSync, readFileSync } from 'node:fs';
import { Client } from 'pg';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^(['"])(.*)\1$/, '$2');
  }
}

const url = process.env.DATABASE_URL ?? 'postgres://localhost:5432/sikatree_dev';
let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error('DATABASE_URL is not a valid URL');
  process.exit(1);
}

const host = parsed.hostname;
const local = host === 'localhost' || host === '127.0.0.1';
const maskedPassword = parsed.password ? '***' : '(none)';

console.log(`host:  ${host}:${parsed.port || 5432}`);
console.log(`db:    ${parsed.pathname.replace(/^\//, '')}`);
console.log(`user:  ${parsed.username}`);
console.log(`pass:  ${maskedPassword}`);
console.log(`tls:   ${local ? 'off (local)' : 'on, chain verification ' + (process.env.DATABASE_SSL_STRICT === 'true' ? 'strict' : 'relaxed')}`);

const client = new Client({
  connectionString: url,
  ssl: local ? undefined : { rejectUnauthorized: process.env.DATABASE_SSL_STRICT === 'true' },
  connectionTimeoutMillis: 10_000,
});

try {
  await client.connect();
  const version = await client.query('select version()');
  console.log(`server: ${version.rows[0].version.split(',')[0]}`);

  const migrations = await client.query('select name from schema_migrations order by 1').catch(() => null);
  if (!migrations) {
    console.log('migrations: none applied (run pnpm db:migrate)');
  } else {
    console.log(`migrations: ${migrations.rows.map((row) => row.name).join(', ') || 'none'}`);
  }

  const counts = await client
    .query(
      `select
         (select count(*) from waitlist_signup)::int as signups,
         (select count(*) from reserved_handle)::int as handles,
         (select count(*) from analytics_event)::int as events`,
    )
    .catch(() => null);

  if (counts) {
    const { signups, handles, events } = counts.rows[0];
    console.log(`rows:  signups=${signups} handles=${handles} events=${events}`);
  }
  console.log('connection OK');
} catch (error) {
  console.error(`connection FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
