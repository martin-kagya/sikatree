#!/usr/bin/env node
// Applies db/migrations/*.sql in lexical order, once each, inside a
// transaction. Safe to re-run. Usage: pnpm db:migrate
import { readdir, readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

function loadEnvLocal() {
  if (!existsSync('.env.local')) return;
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.replace(/^(['"])(.*)\1$/, '$2');
  }
}

loadEnvLocal();

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://localhost:5432/sikatree_dev';

// Managed providers (Supabase included) require TLS. The pooler serves a
// self-signed chain, so verification is opt-in.
let hostname = '';
try {
  hostname = new URL(databaseUrl).hostname;
} catch {
  /* no TLS */
}
const local = !hostname || hostname === 'localhost' || hostname === '127.0.0.1';
const ssl = local
  ? undefined
  : { rejectUnauthorized: process.env.DATABASE_SSL_STRICT === 'true' };

const dir = path.join(process.cwd(), 'db', 'migrations');
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

const client = new Client({ connectionString: databaseUrl, ssl });
await client.connect();

try {
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  // Serialize concurrent deploys.
  await client.query('select pg_advisory_lock(917341)');

  const { rows } = await client.query('select name from schema_migrations');
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file}`);
      continue;
    }
    const sql = await readFile(path.join(dir, file), 'utf8');
    console.log(`apply ${file}`);
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw new Error(`migration ${file} failed: ${error.message}`);
    }
  }

  // Housekeeping: drop rate-limit windows older than a day.
  await client.query("delete from rate_limit where window_start < now() - interval '1 day'");

  console.log('migrations up to date');
} finally {
  await client.query('select pg_advisory_unlock(917341)').catch(() => {});
  await client.end();
}
