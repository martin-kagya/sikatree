import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';

// Simulate the Cloudflare Workers global so db() takes the per-query path.
beforeAll(() => {
  (globalThis as { WebSocketPair?: unknown }).WebSocketPair = function WebSocketPair() {};
});

afterAll(async () => {
  delete (globalThis as { WebSocketPair?: unknown }).WebSocketPair;
  await db().end();
});

describe('worker database path', () => {
  it('opens a fresh client for a query and closes it', async () => {
    const first = await query<{ ok: number }>('select 1 as ok');
    const second = await query<{ ok: number }>('select 1 as ok');
    expect(first[0].ok).toBe(1);
    expect(second[0].ok).toBe(1);
  });

  it('opens a transaction client with release()', async () => {
    const client = await db().connect();
    try {
      const result = await client.query<{ ok: number }>('select 1 as ok');
      expect(result.rows[0].ok).toBe(1);
    } finally {
      client.release();
    }
  });
});
