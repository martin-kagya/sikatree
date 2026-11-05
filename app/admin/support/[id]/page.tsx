import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { formatGhanaPhone } from '@/lib/phone';
import { getSupportTicket, listSupportMessages } from '@/lib/support';
import { replySupportAction, supportStatusAction } from '../../actions';

export const metadata: Metadata = {
  title: 'Support ticket | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Accra',
  }).format(new Date(iso));
}

export default async function SupportTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const { error } = await searchParams;
  const ticket = await getSupportTicket(id);
  if (!ticket) notFound();

  const messages = await listSupportMessages(ticket.phone);
  const waHref = `https://wa.me/${ticket.phone.replace(/\D/g, '')}`;

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[900px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin/support" className="text-[13px] text-ink-muted hover:text-ink">
              Back to support
            </Link>
            <h1 className="mt-1 text-h2 text-ink">
              {ticket.vendorName ?? formatGhanaPhone(ticket.phone)}
            </h1>
          </div>
          <span
            className={`rounded-pill px-3 py-1 text-[12px] font-medium ${
              ticket.status === 'open' ? 'bg-warn-bg text-ink' : 'bg-surface-soft text-ink-muted'
            }`}
          >
            {ticket.status}
          </span>
        </header>

        {error ? (
          <p className="mt-4 rounded-inner bg-danger-bg p-3 text-[13px] text-danger">{error}</p>
        ) : null}

        <section className="mt-5 rounded-panel bg-white p-5 shadow-card">
          <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-muted">Phone</dt>
              <dd className="mt-1 text-ink">{formatGhanaPhone(ticket.phone)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-muted">Vendor</dt>
              <dd className="mt-1 text-ink">
                {ticket.vendorHandle ? (
                  <Link
                    href={`/${ticket.vendorHandle}`}
                    className="text-green-deep underline underline-offset-2"
                  >
                    /{ticket.vendorHandle}
                  </Link>
                ) : (
                  <span className="text-ink-muted">No live page yet</span>
                )}
                {ticket.vendorStatus ? (
                  <span className="ml-2 text-[11px] text-ink-muted">{ticket.vendorStatus}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-muted">Opened</dt>
              <dd className="mt-1 text-ink">{when(ticket.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-muted">Updated</dt>
              <dd className="mt-1 text-ink">{when(ticket.updatedAt)}</dd>
            </div>
          </dl>

          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-9 items-center rounded-pill border border-hairline px-3 text-[12px] text-ink hover:border-ink/40"
          >
            Open in WhatsApp
          </a>
        </section>

        <section className="mt-4 rounded-panel bg-white p-5 shadow-card">
          <h2 className="text-h3 text-ink">Conversation</h2>
          {messages.length ? (
            <ol className="mt-4 space-y-3">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={`max-w-[85%] rounded-[16px] p-3 ${
                    message.direction === 'out'
                      ? 'ml-auto bg-mint-100'
                      : 'mr-auto border border-hairline bg-white'
                  }`}
                >
                  <p className="text-[11px] text-ink-muted">
                    {message.direction === 'out' ? 'You' : 'Vendor'} · {when(message.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink">
                    {message.body ?? `[${message.kind ?? 'message'}]`}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-small text-ink-muted">No stored messages for this number yet.</p>
          )}
        </section>

        <section className="mt-4 rounded-panel bg-white p-5 shadow-card">
          {ticket.status === 'open' ? (
            <form action={replySupportAction}>
              <input type="hidden" name="id" value={ticket.id} />
              <label htmlFor="support-reply" className="text-[13px] font-medium text-ink">
                Reply on WhatsApp
              </label>
              <textarea
                id="support-reply"
                name="body"
                rows={4}
                maxLength={1000}
                placeholder="Type the reply. It sends from the sikatree WhatsApp number."
                className="mt-2 w-full rounded-[12px] border border-hairline bg-white p-3 text-[13px] text-ink outline-none focus:border-green-deep focus:ring-2 focus:ring-green-deep"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-pill bg-green-main px-4 text-small text-ink"
                >
                  Send reply
                </button>
                <span className="text-[11px] text-ink-muted">
                  Free-form replies work inside the WhatsApp 24-hour window.
                </span>
              </div>
            </form>
          ) : (
            <p className="text-small text-ink-muted">This ticket is closed. Reopen it to reply.</p>
          )}

          <form action={supportStatusAction} className="mt-4 border-t border-hairline pt-4">
            <input type="hidden" name="id" value={ticket.id} />
            <input
              type="hidden"
              name="status"
              value={ticket.status === 'open' ? 'closed' : 'open'}
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-pill border border-hairline px-3 text-[12px] text-ink hover:border-ink/40"
            >
              {ticket.status === 'open' ? 'Mark resolved' : 'Reopen ticket'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
