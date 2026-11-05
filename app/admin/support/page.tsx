import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { formatGhanaPhone } from '@/lib/phone';
import { listSupportTickets } from '@/lib/support';
import { logoutAction } from '../actions';

export const metadata: Metadata = {
  title: 'Support | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ status?: string }>;

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Accra',
  }).format(new Date(iso));
}

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
] as const;

export default async function SupportPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();

  const params = await searchParams;
  const filter = params.status === 'closed' || params.status === 'all' ? params.status : 'open';

  const tickets = await listSupportTickets();
  const openCount = tickets.filter((ticket) => ticket.status === 'open').length;
  const visible = filter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === filter);

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-ink">sikatree</p>
            <h1 className="mt-1 text-h2 text-ink">Support</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex h-10 items-center rounded-pill border border-hairline bg-white px-4 text-small text-ink hover:border-ink/40"
            >
              Waitlist
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

        <p className="mt-3 text-small text-ink-muted">
          WhatsApp &quot;Help&quot; messages land here with the vendor and conversation attached.
          {openCount ? ` ${openCount} open.` : ' Nothing open.'}
        </p>

        <div className="mt-5 flex gap-2">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === 'open' ? '/admin/support' : `/admin/support?status=${tab.key}`}
              className={`inline-flex h-9 items-center rounded-pill px-3.5 text-small ${
                filter === tab.key
                  ? 'bg-ink text-white'
                  : 'border border-hairline bg-white text-ink hover:border-ink/40'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {visible.length ? (
          <div className="mt-4 overflow-hidden rounded-panel bg-white shadow-card">
            <div
              className="overflow-x-auto overscroll-x-contain"
              role="region"
              aria-label="Support tickets"
              tabIndex={0}
            >
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-page text-[12px] text-ink-muted">
                  <tr>
                    <th className="min-w-[160px] px-4 py-3 font-medium">Vendor</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">Phone</th>
                    <th className="min-w-[180px] px-4 py-3 font-medium">Last message</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">Updated</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                    <th className="whitespace-nowrap px-4 py-3" />
                  </tr>
                </thead>
              <tbody>
                {visible.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-hairline align-top">
                    <td className="min-w-[160px] px-4 py-3 text-small text-ink">
                      {ticket.vendorName ?? <span className="text-ink-muted">No vendor yet</span>}
                      {ticket.vendorHandle ? (
                        <span className="block text-[11px] text-ink-muted">
                          /{ticket.vendorHandle}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-small text-ink">
                      {formatGhanaPhone(ticket.phone)}
                    </td>
                    <td className="min-w-[180px] max-w-[320px] px-4 py-3 text-[13px] text-ink-muted">
                      <span className="line-clamp-2">{ticket.lastMessage ?? 'No message'}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-ink-muted">
                      {when(ticket.updatedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-pill px-2.5 py-1 text-[11px] font-medium ${
                          ticket.status === 'open'
                            ? 'bg-warn-bg text-ink'
                            : 'bg-surface-soft text-ink-muted'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/admin/support/${ticket.id}`}
                        className="text-[12px] font-medium text-green-deep underline underline-offset-2"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-hairline px-4 py-2 text-[11px] text-ink-muted sm:hidden">
              Swipe the table sideways to see status and Open.
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-panel bg-white p-6 text-small text-ink-muted shadow-card">
            No support tickets here. When a vendor replies Help on WhatsApp, the request appears
            here with their conversation.
          </p>
        )}
      </div>
    </div>
  );
}
