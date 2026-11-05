import { Pool } from 'pg';

// Local development default. Set DATABASE_URL (Supabase's pooler connection
// string works unchanged) in production.
const DEFAULT_LOCAL = 'postgres://localhost:5432/sikatree_dev';

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set. The waitlist needs a Postgres database.');
  }
  return DEFAULT_LOCAL;
}

// Next.js dev reloads modules; keep one pool per process.
const globalForDb = globalThis as unknown as { __sikatreePool?: Pool };

export function db(): Pool {
  if (!globalForDb.__sikatreePool) {
    const pool = new Pool({
      connectionString: connectionString(),
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    // A pool error must not crash the server.
    pool.on('error', (error) => {
      console.error('[db] idle client error', error);
    });
    globalForDb.__sikatreePool = pool;
  }
  return globalForDb.__sikatreePool;
}

export async function query<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await db().query(text, params);
  return result.rows as T[];
}

export const reservationDays = () => {
  const value = Number(process.env.RESERVATION_DAYS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30;
};
