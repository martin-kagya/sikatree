import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, MessageCircle } from '@/components/icons';
import { ReorderButton } from '@/components/reorder-button';
import { OstraMark } from '@/components/ui/ostra-mark';
import { site } from '@/lib/brand';
import { formatCedis } from '@/lib/money';
import { getOrderByCode, type OrderRecord } from '@/lib/orders';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Order tracking | sikatree',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<OrderRecord['status'], string> = {
  pending: 'Order placed',
  confirmed: 'Confirmed',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_STYLE: Record<OrderRecord['status'], string> = {
  pending: 'bg-warn-bg text-ink',
  confirmed: 'bg-mint-100 text-green-deep',
  ready: 'bg-green-deep text-white',
  completed: 'bg-ink text-white',
  cancelled: 'bg-danger-bg text-danger',
};

function stepsFor(order: OrderRecord) {
  // A booking is a visit, not a shipment: requested, confirmed, done.
  if (order.fulfilment === 'appointment') {
    return [
      { key: 'pending', label: 'Requested' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'completed', label: 'Done' },
    ];
  }
  return [
    { key: 'pending', label: 'Placed' },
    { key: 'confirmed', label: 'Confirmed' },
    {
      key: 'ready',
      label: order.fulfilment === 'delivery' ? 'Out for delivery' : 'Ready for pickup',
    },
    {
      key: 'completed',
      label: order.fulfilment === 'delivery' ? 'Delivered' : 'Picked up',
    },
  ];
}

function statusLabel(order: OrderRecord): string {
  if (order.fulfilment !== 'appointment') return STATUS_LABEL[order.status];
  if (order.status === 'pending') return 'Requested';
  if (order.status === 'confirmed' || order.status === 'ready') return 'Confirmed';
  if (order.status === 'completed') return 'Done';
  return 'Cancelled';
}

function paymentNote(order: OrderRecord): string {
  if (order.paymentStatus === 'paid') return 'Paid online.';
  if (order.paymentMethod === 'online' && order.paymentStatus === 'pending') {
    return 'Payment pending. This page updates once the payment clears.';
  }
  if (order.paymentMethod === 'online' && order.paymentStatus === 'failed') {
    return 'The online payment did not go through. Message the vendor to arrange payment.';
  }
  if (order.fulfilment === 'delivery') {
    if (order.deliveryFeeMode === 'confirm_after') {
      return 'Pay on delivery. The vendor will confirm the delivery fee.';
    }
    if (order.deliveryOnArrival) {
      return 'Pay for your items on delivery; the delivery fee is paid on arrival.';
    }
    return 'Pay on delivery.';
  }
  if (order.fulfilment === 'pickup') return 'Pay at pickup.';
  return 'Pay at your appointment.';
}

function paymentLabel(order: OrderRecord): string {
  if (order.paymentStatus === 'paid') return 'Paid online';
  if (order.paymentMethod === 'online') {
    return order.paymentStatus === 'failed' ? 'Payment failed' : 'Payment pending';
  }
  if (order.fulfilment === 'delivery') return 'Pay on delivery';
  if (order.fulfilment === 'pickup') return 'Pay at pickup';
  return 'Pay at appointment';
}

function deliveryLabel(order: OrderRecord): string {
  if (order.fulfilment === 'delivery' && order.deliveryFeeMode === 'confirm_after') {
    return order.deliveryPesewas ? formatCedis(order.deliveryPesewas) : 'To be confirmed';
  }
  if (order.fulfilment === 'delivery' && order.deliveryOnArrival) {
    return `${formatCedis(order.deliveryPesewas)} on arrival`;
  }
  return order.deliveryPesewas ? formatCedis(order.deliveryPesewas) : 'Free';
}

function fulfilmentNote(order: OrderRecord): string {
  if (order.fulfilment === 'delivery') return 'Delivery';
  if (order.fulfilment === 'pickup') return 'Pickup at the shop';
  return order.bookingAt
    ? `Appointment ${new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Africa/Accra',
      }).format(new Date(order.bookingAt))}`
    : 'Appointment';
}

export default async function TrackOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { code } = await params;
  const { payment } = await searchParams;
  const order = await getOrderByCode(decodeURIComponent(code));
  if (!order) notFound();

  const steps = stepsFor(order);
  const activeIndex =
    order.status === 'cancelled' ? -1 : steps.findIndex((step) => step.key === order.status);
  const trackInset = 100 / (steps.length * 2);
  const trackWidth = 100 - 2 * trackInset;
  const vendorHref = `https://wa.me/${order.vendorPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi ${order.vendorName}, I'm asking about order ${order.code}.`,
  )}`;
  const reorderLines = order.lines.flatMap((line) =>
    line.itemId ? [{ itemId: line.itemId, quantity: line.quantity }] : [],
  );

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[720px]">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
            sikatree
          </Link>
          <Link
            href={`/${order.vendorHandle}`}
            className="text-[13px] text-ink-muted hover:text-ink"
          >
            {order.vendorName}
          </Link>
        </header>

        <main className="mt-6 space-y-5 stagger">
          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] uppercase tracking-wide text-ink-muted">
                  {order.fulfilment === 'appointment' ? 'Booking' : 'Order tracking'}
                </p>
                <h1 className="mt-1 text-h1 text-ink">{order.code}</h1>
              </div>
              <span
                className={cn(
                  'rounded-pill px-3 py-1 text-[12px] font-medium',
                  STATUS_STYLE[order.status],
                )}
              >
                {statusLabel(order)}
              </span>
            </div>

            {payment === 'paid' && order.paymentStatus === 'paid' ? (
              <p className="mt-5 rounded-inner bg-mint-100 p-3 text-[13px] text-green-deep">
                Payment received. {order.vendorName} has been notified.
              </p>
            ) : payment === 'pending' && order.paymentStatus !== 'paid' ? (
              <p className="mt-5 rounded-inner bg-warn-bg p-3 text-[13px] text-ink">
                We are confirming the payment with Paystack. This page updates once it clears.
              </p>
            ) : null}

            {order.status === 'cancelled' ? (
              <p className="mt-5 rounded-inner bg-danger-bg p-3 text-[13px] text-danger">
                This order was cancelled.
                {order.cancellationReason ? ` Reason: ${order.cancellationReason}.` : ''} Message{' '}
                {order.vendorName} if you need help.
              </p>
            ) : (
              <div className="relative mt-8">
                <div
                  className="absolute top-3.5 h-0.5 bg-hairline"
                  style={{ left: `${trackInset}%`, right: `${trackInset}%` }}
                />
                <div
                  className="absolute top-3.5 h-0.5 bg-green-main transition-[width] duration-200"
                  style={{
                    left: `${trackInset}%`,
                    width: `${(Math.max(activeIndex, 0) / (steps.length - 1)) * trackWidth}%`,
                  }}
                />
                <ol
                  className={cn(
                    'relative grid',
                    steps.length === 3 ? 'grid-cols-3' : 'grid-cols-4',
                  )}
                >
                  {steps.map((step, index) => {
                    const done = index <= activeIndex;
                    const current = index === activeIndex;
                    return (
                      <li
                        key={step.key}
                        aria-current={current ? 'step' : undefined}
                        className="flex flex-col items-center gap-2"
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-medium',
                            done
                              ? 'border-green-main bg-green-main text-ink'
                              : 'border-hairline bg-white text-ink-muted',
                            current && 'ring-4 ring-mint-100',
                          )}
                        >
                          {done ? (
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span
                          className={cn(
                            'text-center text-[10px] leading-tight sm:text-[11px]',
                            done ? 'text-ink' : 'text-ink-muted',
                          )}
                        >
                          {step.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            <p className="mt-6 rounded-inner bg-page p-3 text-[12px] text-ink-muted">
              {order.eta ? `${order.eta}. ` : ''}
              {paymentNote(order)} This page updates when {order.vendorName} moves{' '}
              {order.fulfilment === 'appointment' ? 'your booking' : 'the order'} forward.
            </p>
          </section>

          <section className="rounded-panel bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-h2 text-ink">
              {order.fulfilment === 'appointment' ? 'Your booking' : 'Your order'}
            </h2>
            <ul className="mt-4 divide-y divide-hairline">
              {order.lines.map((line) => (
                <li key={line.name} className="flex justify-between gap-3 py-3 text-[14px] text-ink">
                  <span>
                    {line.quantity} x {line.name}
                  </span>
                  <span className="tabular-nums">{formatCedis(line.lineTotalPesewas)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-2 border-t border-hairline pt-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Item total</dt>
                <dd className="text-ink">{formatCedis(order.subtotalPesewas)}</dd>
              </div>
              {order.fulfilment !== 'appointment' ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Delivery</dt>
                  <dd className="text-ink">{deliveryLabel(order)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Payment</dt>
                <dd className="text-ink">{paymentLabel(order)}</dd>
              </div>
              <div className="flex justify-between text-[15px] font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCedis(order.totalPesewas)}</dd>
              </div>
            </dl>

            <p className="mt-3 text-[12px] text-ink-muted">{fulfilmentNote(order)}</p>
          </section>

          <section className="grid gap-3 sm:flex sm:flex-row">
            <a
              href={vendorHref}
              target="_blank"
              rel="noreferrer"
              aria-label={`Message ${order.vendorName} on WhatsApp`}
              className="pressable inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-pill bg-green-main px-5 text-[14px] text-ink hover:bg-green-main/90 sm:w-auto sm:flex-1 sm:text-label"
            >
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Message {order.vendorName}</span>
            </a>
            {reorderLines.length ? (
              <ReorderButton handle={order.vendorHandle} lines={reorderLines} />
            ) : null}
            <Link
              href={`/${order.vendorHandle}`}
              className="pressable inline-flex h-12 w-full shrink-0 items-center justify-center rounded-pill border border-hairline bg-white px-6 text-label text-ink hover:border-ink/40 sm:w-auto"
            >
              Back to the shop
            </Link>
          </section>

          <footer className="flex flex-col items-center gap-2 pt-4 text-center text-[12px] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="flex">
                <OstraMark className="h-4 w-4" />
              </span>
              Powered by Ostra
            </span>
            <span>
              Keep this link. It updates as your{' '}
              {order.fulfilment === 'appointment' ? 'booking' : 'order'} moves. {site.domain}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
