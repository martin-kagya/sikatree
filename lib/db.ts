import { Pool } from 'pg';

// Local development default. In production set DATABASE_URL to the Supabase
// pooler string (session mode, port 5432). The direct db.<ref>.supabase.co host
// is IPv6 only, and the pooler is the reliable path from most networks.
const DEFAULT_LOCAL = 'postgres://localhost:5432/sikatree_dev';

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set. The waitlist needs a Postgres database.');
  }
  return DEFAULT_LOCAL;
}

function isLocal(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function poolOptions() {
  const url = connectionString();
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    /* fall through with no TLS */
  }

  if (!hostname || isLocal(hostname)) {
    return { connectionString: url, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 };
  }

  // Supabase's pooler serves a self-signed chain, so the default is encryption
  // without chain verification. Set DATABASE_SSL_STRICT=true when the provider
  // presents a publicly trusted certificate.
  return {
    connectionString: url,
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_STRICT === 'true' },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}

// Next.js dev reloads modules; keep one pool per process.
const globalForDb = globalThis as unknown as { __sikatreePool?: Pool };

export function db(): Pool {
  if (!globalForDb.__sikatreePool) {
    const pool = new Pool(poolOptions());
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
