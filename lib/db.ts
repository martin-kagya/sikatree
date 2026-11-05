import { Client, Pool, type PoolClient } from 'pg';

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

// Cloudflare Workers terminate sockets when a request ends, so the global pool
// that works on Node leaves dead clients behind. In a Worker we open one Client
// per query or transaction and close it before the request finishes.
function isCloudflareWorker(): boolean {
  return typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined';
}

let hyperdrivePromise: Promise<string | null> | null = null;
let modeLogged = false;

async function hyperdriveConnectionString(): Promise<string | null> {
  if (!isCloudflareWorker()) return null;
  if (!hyperdrivePromise) {
    hyperdrivePromise = (async () => {
      try {
        // Cloudflare's runtime module. webpackIgnore keeps Next from trying to
        // resolve it during the Node build.
        const specifier = 'cloudflare:workers';
        const mod = (await import(/* webpackIgnore: true */ specifier)) as {
          env?: { HYPERDRIVE?: { connectionString?: string } };
        };
        const connection = mod.env?.HYPERDRIVE?.connectionString ?? null;
        if (!connection) {
          console.warn('[db] HYPERDRIVE binding missing; falling back to DATABASE_URL');
        }
        return connection;
      } catch {
        console.warn('[db] cloudflare:workers unavailable; falling back to DATABASE_URL');
        return null;
      }
    })();
  }
  return hyperdrivePromise;
}

async function workerClient(): Promise<Client> {
  const hyperdrive = await hyperdriveConnectionString();
  if (!modeLogged) {
    console.log(`[db] worker connection source: ${hyperdrive ? 'HYPERDRIVE' : 'DATABASE_URL'}`);
    modeLogged = true;
  }
  if (hyperdrive) {
    // Worker to Hyperdrive is inside Cloudflare and is plain TCP. The origin
    // TLS is handled by Hyperdrive, so never let sslmode in the URL turn on a
    // second handshake here.
    return new Client({
      connectionString: hyperdrive,
      ssl: false,
      connectionTimeoutMillis: 10_000,
    });
  }
  return new Client(poolOptions());
}

type Database = Pick<Pool, 'query' | 'connect'> & { end(): Promise<void> };

// Hyperdrive (and the pooler behind it) can drop an idle or freshly-opened
// socket between Worker requests. The driver surfaces that as a connection-level
// error such as "Connection terminated unexpectedly" before a result is
// delivered, so one retry is safe for this app's idempotent writes (analytics
// events and on-conflict upserts) and clears the large majority of them.
function isTransientConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Connection terminated') ||
    message.includes('Connection reset') ||
    message.includes('connection timeout') ||
    message.includes('socket hang up') ||
    message.includes('ECONNRESET') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('EPIPE')
  );
}

const workerDb: Database = {
  query: (async (text: string, params?: unknown[]) => {
    const run = async () => {
      const client = await workerClient();
      try {
        await client.connect();
        return await client.query(text, params);
      } finally {
        await client.end().catch(() => {});
      }
    };

    try {
      return await run();
    } catch (error) {
      const dbError = error as { message?: string; code?: string; detail?: string };
      if (!isTransientConnectionError(error)) {
        console.error('[db] worker query failed', {
          message: dbError.message,
          code: dbError.code,
          detail: dbError.detail,
        });
        throw error;
      }

      console.warn('[db] worker query failed (transient), retrying once', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
      return await run();
    }
  }) as Pool['query'],

  connect: async () => {
    const client = await workerClient();
    await client.connect();
    // The transaction code calls release(); a Worker Client has end() instead.
    (client as unknown as { release: () => void }).release = () => {
      void client.end().catch(() => {});
    };
    return client as unknown as PoolClient;
  },

  end: async () => {},
};

// Next.js dev reloads modules; keep one pool per process.
const globalForDb = globalThis as unknown as { __sikatreePool?: Database };

export function db(): Database {
  if (isCloudflareWorker()) return workerDb;

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
  const result = await db().query<T>(text, params);
  return result.rows as T[];
}

export const reservationDays = () => {
  const value = Number(process.env.RESERVATION_DAYS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30;
};
