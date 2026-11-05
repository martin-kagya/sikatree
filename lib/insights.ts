import { db } from '@/lib/db';

export type Insights = {
  conversations: number;
  liveVendors: number;
  orders: number;
  medianMinutesToLive: number | null;
};

// ONB-21: median time from the first WhatsApp message to a live page. The
// conversation row is created on first contact; the vendor row is created at
// go-live, so their difference is the setup time.
export async function getInsights(): Promise<Insights> {
  const [conversations, liveVendors, orders, median] = await Promise.all([
    db().query<{ count: string }>('select count(*) from wa_conversation'),
    db().query<{ count: string }>("select count(*) from vendors where status = 'live'"),
    db().query<{ count: string }>('select count(*) from orders'),
    db().query<{ median: string | null }>(
      `select percentile_cont(0.5) within group (
                order by extract(epoch from (v.created_at - c.created_at)) / 60
              ) as median
         from vendors v
         join wa_conversation c on c.phone = v.phone
        where v.created_at >= c.created_at`,
    ),
  ]);

  const rawMedian = median.rows[0]?.median;

  return {
    conversations: Number(conversations.rows[0]?.count ?? 0),
    liveVendors: Number(liveVendors.rows[0]?.count ?? 0),
    orders: Number(orders.rows[0]?.count ?? 0),
    medianMinutesToLive: rawMedian == null ? null : Number(rawMedian),
  };
}
