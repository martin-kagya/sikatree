import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from '@/components/icons';
import { getInsights, type Insights } from '@/lib/insights';
import { formatGhanaPhone } from '@/lib/phone';
import { requireAdmin } from '@/lib/admin-auth';
import { listForAdmin, statusCounts, type AdminEntry } from '@/lib/waitlist';
import { logoutAction, setNotesAction, setStatusAction } from './actions';

export const metadata: Metadata = {
  title: 'Waitlist | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string; status?: string; type?: string }>;

const STATUSES = ['waiting', 'invited', 'onboarded', 'unsubscribed'] as const;

const TYPE_LABEL: Record<string, string> = {
  products: 'Products',
  services: 'Services',
  both: 'Both',
};

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Accra',
  }).format(new Date(iso));
}

function queryString(filters: { q: string; status: string; type: string }): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  const value = params.toString();
  return value ? `?${value}` : '';
}

function Row({ row }: { row: AdminEntry }) {
  const waHref = `https://wa.me/${row.phone.replace(/\D/g, '')}?text=START`;

  return (
    <tr className="border-t border-hairline align-top">
      <td className="whitespace-nowrap py-3 pl-4 pr-2 text-small text-ink-muted">#{row.position}</td>
      <td className="whitespace-nowrap px-2 py-3 text-small text-ink">
        {formatGhanaPhone(row.phone)}
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="ml-2 text-[11px] text-green-deep underline underline-offset-2"
        >
          message
        </a>
      </td>
      <td className="px-2 py-3 text-small text-ink">
        {row.businessName ?? <span className="text-ink-muted">No name</span>}
        <span className="block text-[11px] text-ink-muted">
          {row.businessType ? TYPE_LABEL[row.businessType] : 'Not said'}
        </span>
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-small text-ink">
        {row.handle ? `/${row.handle}` : <span className="text-ink-muted">None</span>}
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-small text-ink">
        <form action={setStatusAction} className="flex items-center gap-1.5">
          <input type="hidden" name="id" value={row.id} />
          <div className="relative">
            <select
              name="status"
              defaultValue={row.status}
              aria-label={`Status for ${formatGhanaPhone(row.phone)}`}
              className="h-8 appearance-none rounded-inner border border-hairline bg-white pl-2 pr-7 text-[12px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          </div>
          <button type="submit" className="h-8 rounded-pill border border-hairline px-2.5 text-[11px] text-ink hover:border-ink/40">
            Save
          </button>
        </form>
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-[12px] text-ink-muted">
        {when(row.createdAt)}
      </td>
      <td className="px-2 py-3 pr-4">
        <details>
          <summary className="cursor-pointer text-[12px] text-green-deep">Notes</summary>
          <form action={setNotesAction} className="mt-2">
            <input type="hidden" name="id" value={row.id} />
            <textarea
              name="notes"
              defaultValue={row.notes ?? ''}
              rows={2}
              placeholder="Called, interested in Friday, etc."
              className="w-56 rounded-inner border border-hairline bg-white p-2 text-[12px] text-ink"
            />
            <button type="submit" className="mt-1 h-7 rounded-pill bg-ink px-3 text-[11px] text-white">
              Save note
            </button>
          </form>
        </details>
      </td>
    </tr>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();

  const params = await searchParams;
  const filters = {
    q: (params.q ?? '').trim(),
    status: params.status ?? '',
    type: params.type ?? '',
  };

  let rows: AdminEntry[] = [];
  let counts: Record<string, number> = {};
  let insights: Insights | null = null;
  let dbError = false;

  try {
    [rows, counts] = await Promise.all([listForAdmin(filters), statusCounts()]);
  } catch (error) {
    console.error('[admin] list failed', error);
    dbError = true;
  }

  try {
    insights = await getInsights();
  } catch (error) {
    console.error('[admin] insights failed', error);
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-ink">sikatree</p>
            <h1 className="mt-1 text-h2 text-ink">Waitlist</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/support"
              className="inline-flex h-10 items-center rounded-pill border border-hairline bg-white px-4 text-small text-ink hover:border-ink/40"
            >
              Support
            </Link>
            <Link
              href={`/admin/export${queryString(filters)}`}
              className="inline-flex h-10 items-center rounded-pill border border-hairline bg-white px-4 text-small text-ink hover:border-ink/40"
            >
              Export CSV
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-pill border border-hairline bg-white px-4 text-small text-ink hover:border-ink/40"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Total', value: total },
            { label: 'Waiting', value: counts.waiting ?? 0 },
            { label: 'Invited', value: counts.invited ?? 0 },
            { label: 'Onboarded', value: counts.onboarded ?? 0 },
            { label: 'Unsubscribed', value: counts.unsubscribed ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-card bg-white p-4 shadow-card">
              <dt className="text-[12px] text-ink-muted">{stat.label}</dt>
              <dd className="mt-1 text-[24px] font-medium tracking-tight text-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>

        {insights ? (
          <section className="mt-4 rounded-card bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-h3 text-ink">Onboarding funnel</h2>
              <p className="text-[11px] text-ink-muted">Target: under 10 minutes to a live page</p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Conversations', value: insights.conversations },
                { label: 'Live pages', value: insights.liveVendors },
                { label: 'Orders', value: insights.orders },
                {
                  label: 'Median to live',
                  value:
                    insights.medianMinutesToLive == null
                      ? 'No data'
                      : insights.medianMinutesToLive < 60
                        ? `${Math.round(insights.medianMinutesToLive)} min`
                        : `${(insights.medianMinutesToLive / 60).toFixed(1)} h`,
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[11px] text-ink-muted">{stat.label}</dt>
                  <dd className="mt-0.5 text-[20px] font-medium tracking-tight text-ink">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[11px] text-ink-muted">
              Median is first WhatsApp message to live page, across vendors created after their
              first message.
            </p>
          </section>
        ) : null}

        <form method="get" className="mt-6 flex flex-wrap items-end gap-2 rounded-card bg-white p-4 shadow-card">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="q" className="mb-1 block text-[12px] text-ink-muted">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Phone, business name or handle"
              className="h-10 w-full rounded-inner border border-hairline bg-page px-3 text-small text-ink"
            />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-[12px] text-ink-muted">
              Status
            </label>
            <div className="relative">
              <select
                id="status"
                name="status"
                defaultValue={filters.status}
                className="h-10 w-full appearance-none rounded-inner border border-hairline bg-page pl-3 pr-9 text-small text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep"
              >
                <option value="">All</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            </div>
          </div>
          <div>
            <label htmlFor="type" className="mb-1 block text-[12px] text-ink-muted">
              Type
            </label>
            <div className="relative">
              <select
                id="type"
                name="type"
                defaultValue={filters.type}
                className="h-10 w-full appearance-none rounded-inner border border-hairline bg-page pl-3 pr-9 text-small text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep"
              >
                <option value="">All</option>
                <option value="products">Products</option>
                <option value="services">Services</option>
                <option value="both">Both</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            </div>
          </div>
          <button type="submit" className="h-10 rounded-pill bg-ink px-5 text-small text-white">
            Filter
          </button>
          {(filters.q || filters.status || filters.type) && (
            <Link href="/admin" className="h-10 px-2 text-small leading-10 text-green-deep underline underline-offset-2">
              Clear
            </Link>
          )}
        </form>

        {dbError ? (
          <p className="mt-6 rounded-card bg-danger-bg p-4 text-small text-danger">
            Could not reach the database. Check DATABASE_URL and that migrations have run.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-card bg-white shadow-card">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="py-3 pl-4 pr-2 font-medium">#</th>
                  <th className="px-2 py-3 font-medium">Phone</th>
                  <th className="px-2 py-3 font-medium">Business</th>
                  <th className="px-2 py-3 font-medium">Link</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium">Joined</th>
                  <th className="px-2 py-3 pr-4 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row) => <Row key={row.id} row={row} />)
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-small text-ink-muted">
                      No signups match these filters yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[12px] text-ink-muted">
          Showing up to 200 rows. Export CSV for the full list. Invites are manual until the bot
          and the waitlist_invite template are live: the message link opens WhatsApp with START
          prefilled.
        </p>
      </div>
    </div>
  );
}
