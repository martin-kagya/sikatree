import { query } from '@/lib/db';

export type RateLimitResult = {
  allowed: boolean;
  hits: number;
  limit: number;
  resetAt: Date;
};

// Fixed-window counter, atomic under concurrent requests. Windows are aligned
// to the epoch so every instance agrees on the boundary.
export async function hitRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const rows = await query<{ hits: number }>(
    `insert into rate_limit (bucket, window_start, hits)
     values ($1, $2, 1)
     on conflict (bucket, window_start)
     do update set hits = rate_limit.hits + 1
     returning hits`,
    [bucket, windowStart],
  );

  const hits = rows[0]?.hits ?? 1;
  return {
    allowed: hits <= limit,
    hits,
    limit,
    resetAt: new Date(windowStart.getTime() + windowMs),
  };
}
