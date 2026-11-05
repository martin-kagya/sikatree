import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import { getInsights } from '@/lib/insights';

const PHONE = '+233241000010';

beforeEach(async () => {
  await query(
    'truncate support_ticket, wa_message, wa_conversation, orders, items, vendors restart identity cascade',
  );
});

afterAll(async () => {
  await db().end();
});

describe('onboarding insights', () => {
  it('reports funnel counts and the median time to live', async () => {
    await query(
      `insert into vendors (phone, name, handle, type, status, consent_at, created_at)
       values ($1, 'Ama''s Glow', 'amaglow', 'products', 'live', now(), now() - interval '10 minutes')`,
      [PHONE],
    );
    await query(
      `insert into wa_conversation (phone, state, created_at)
       values ($1, 'live', now() - interval '25 minutes')`,
      [PHONE],
    );

    const insights = await getInsights();
    expect(insights.conversations).toBe(1);
    expect(insights.liveVendors).toBe(1);
    expect(insights.orders).toBe(0);
    expect(insights.medianMinutesToLive).toBeGreaterThan(14.5);
    expect(insights.medianMinutesToLive).toBeLessThan(15.5);
  });

  it('returns null median when there is nothing to measure', async () => {
    const insights = await getInsights();
    expect(insights.medianMinutesToLive).toBeNull();
  });
});
