import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

// CI points TEST_DATABASE_URL at a service container; locally it defaults to
// the throwaway sikatree_test database on the developer machine.
const TEST_URL = process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/sikatree_test';
const adminUrl = new URL(TEST_URL);
adminUrl.pathname = '/postgres';
const ADMIN_URL = adminUrl.toString();

// Creates (once) and migrates the throwaway test database.
export default async function setup() {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  const exists = await admin.query('select 1 from pg_database where datname = $1', [
    'sikatree_test',
  ]);
  if (!exists.rowCount) await admin.query('create database sikatree_test');
  await admin.end();

  const client = new Client({ connectionString: TEST_URL });
  await client.connect();
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const dir = path.join(process.cwd(), 'db', 'migrations');
  const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const done = await client.query('select 1 from schema_migrations where name = $1', [file]);
    if (done.rowCount) continue;
    await client.query('begin');
    try {
      await client.query(await readFile(path.join(dir, file), 'utf8'));
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }

  await client.end();
}
