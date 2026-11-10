import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle } from '@/components/icons';
import { contact, site } from '@/lib/brand';
import { listVendorSupportTickets } from '@/lib/support';
import { requireVendor } from '@/lib/vendor-auth';

export const metadata: Metadata = {
  title: 'Support | sikatree',
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

const supportHref = contact.whatsappNumber
  ? `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent('Help')}`
  : `https://wa.me/?text=${encodeURIComponent('Help')}`;

export default async function VendorSupportPage() {
  const vendorId = await requireVendor('/dashboard/support');
  const tickets = await listVendorSupportTickets(vendorId);

  return (
    <main className="mt-6 space-y-5 stagger">
      <div>
        <Link href="/dashboard" className="text-[13px] text-ink-muted hover:text-ink">
          Back to dashboard
        </Link>
        <h1 className="mt-1 text-h1 text-ink">Support</h1>
      </div>
        <p className="text-small text-ink-muted">
          Replies arrive on WhatsApp. This page shows the requests you have opened.
        </p>

        <a
          href={supportHref}
          target="_blank"
          rel="noreferrer"
          className="pressable mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-green-main px-6 text-label text-ink hover:bg-green-main/90"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Message support on WhatsApp
        </a>

        <section className="mt-6 rounded-panel bg-white p-6 shadow-card">
          <h2 className="text-h2 text-ink">Your requests</h2>

          {tickets.length ? (
            <ul className="mt-4 divide-y divide-hairline">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-pill px-2.5 py-1 text-[11px] font-medium ${
                        ticket.status === 'open'
                          ? 'bg-warn-bg text-ink'
                          : 'bg-surface-soft text-ink-muted'
                      }`}
                    >
                      {ticket.status === 'open' ? 'Open' : 'Resolved'}
                    </span>
                    <span className="text-[12px] text-ink-muted">{when(ticket.updatedAt)}</span>
                  </div>
                  <p className="mt-2 text-[14px] text-ink">
                    {ticket.lastMessage ?? 'Support request'}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    Opened {when(ticket.createdAt)} · reply on WhatsApp to continue
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-small text-ink-muted">
              No support requests yet. Message support on WhatsApp with <strong>Help</strong> and
              your request will appear here.
            </p>
          )}
        </section>

        <p className="mt-6 text-center text-[12px] text-ink-muted">
          sikatree support · {site.email}
        </p>
    </main>
  );
}
