import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const ADMIN_URL = 'postgres://localhost:5432/postgres';
const TEST_URL = 'postgres://localhost:5432/sikatree_test';

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
