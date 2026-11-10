import Link from 'next/link';
import { site } from '@/lib/brand';
import { formatCedis } from '@/lib/money';
import { nextStatusesFor, type OrderRecord, type OrderStatus } from '@/lib/orders';
import { formatGhanaPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { CancelOrderForm, DeliveryFeeForm, OrderStatusButtons } from '@/components/dashboard/order-actions';
import { CopyLink } from './copy-link';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'New',
  confirmed: 'Confirmed',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-warn-bg text-ink',
  confirmed: 'bg-mint-100 text-green-deep',
  ready: 'bg-green-deep text-white',
  completed: 'bg-ink text-white',
  cancelled: 'bg-danger-bg text-danger',
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirm order',
  ready: 'Mark ready',
  completed: 'Mark completed',
  cancelled: 'Cancel order',
};

function nextLabel(status: OrderStatus, fulfilment: string): string {
  if (fulfilment === 'appointment') {
    if (status === 'confirmed') return 'Confirm booking';
    if (status === 'completed') return 'Mark done';
    if (status === 'cancelled') return 'Cancel booking';
    return status;
  }
  return NEXT_LABEL[status] ?? status;
}

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Accra',
  }).format(new Date(iso));
}

function fulfilmentText(order: OrderRecord): string {
  if (order.fulfilment === 'delivery') return `Delivery to ${order.address ?? 'address to confirm'}`;
  if (order.fulfilment === 'pickup') return 'Pickup at the shop';
  return order.bookingAt ? `Appointment ${when(order.bookingAt)}` : 'Appointment to confirm';
}

export function OrderCard({ order }: { order: OrderRecord }) {
  const messageHref = `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi ${order.customerName}, about your order ${order.code} on sikatree.`,
  )}`;

  return (
    <article className="rounded-[20px] border border-hairline p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[12px] text-ink-muted">{when(order.createdAt)}</p>
          <p className="text-h3 text-ink">{order.code}</p>
        </div>
        <span
          className={cn(
            'rounded-pill px-2.5 py-1 text-[11px] font-medium',
            STATUS_STYLE[order.status],
          )}
        >
          {STATUS_LABEL[order.status]}
        </span>
        <p className="text-label text-ink">
          {formatCedis(order.totalPesewas)}
          {order.paymentStatus === 'paid' ? (
            <span className="ml-2 rounded-pill bg-mint-100 px-2 py-0.5 text-[11px] text-green-deep">
              Paid online
            </span>
          ) : null}
        </p>
      </div>

      <ul className="mt-3 space-y-1 text-[13px] text-ink">
        {order.lines.map((line) => (
          <li key={line.name} className="flex justify-between gap-3">
            <span>
              {line.quantity} x {line.name}
            </span>
            <span className="tabular-nums">{formatCedis(line.lineTotalPesewas)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-muted">
        <span>
          {order.customerName} · {formatGhanaPhone(order.customerPhone)}
          <a
            href={messageHref}
            target="_blank"
            rel="noreferrer"
            className="ml-2 text-green-deep underline underline-offset-2"
          >
            Message
          </a>
        </span>
        <span>{fulfilmentText(order)}</span>
        {order.fulfilment === 'delivery' && order.deliveryFeeMode === 'confirm_after' ? (
          <span>
            {order.deliveryPesewas
              ? `Delivery ${formatCedis(order.deliveryPesewas)}`
              : 'Delivery fee to confirm'}
          </span>
        ) : null}
        {order.fulfilment === 'delivery' && order.deliveryFeeMode === 'fixed' ? (
          <span>
            Delivery {order.deliveryZone === 'outside' ? '(other region)' : '(same region)'}{' '}
            {formatCedis(order.deliveryPesewas)}
            {order.deliveryOnArrival ? ' on arrival' : ''}
          </span>
        ) : null}
        <span>{order.customerEmail}</span>
        {order.notes ? <span>Note: {order.notes}</span> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {order.paymentMethod === 'online' && order.paymentStatus !== 'paid' ? (
          <p className="inline-flex h-9 items-center rounded-pill bg-warn-bg px-3 text-[12px] font-medium text-ink">
            Waiting for online payment
          </p>
        ) : (
          <OrderStatusButtons
            orderId={order.id}
            actions={nextStatusesFor(order.status, order.fulfilment)
              .filter((status) => status !== 'cancelled')
              .map((status) => ({
                status,
                label: nextLabel(status, order.fulfilment),
              }))}
          />
        )}

        <Link
          href={`/o/${order.code}`}
          className="pressable inline-flex h-9 items-center rounded-pill border border-hairline px-3 text-[12px] font-medium text-ink hover:border-ink/40"
        >
          Track page
        </Link>
        <CopyLink value={`https://${site.domain}/o/${order.code}`} label="Copy tracking link" />
      </div>

      {nextStatusesFor(order.status, order.fulfilment).includes('cancelled') ? (
        <CancelOrderForm orderId={order.id} />
      ) : null}

      {order.fulfilment === 'delivery' &&
      order.deliveryFeeMode === 'confirm_after' &&
      order.status === 'pending' ? (
        <DeliveryFeeForm orderId={order.id} hasFee={order.deliveryPesewas > 0} />
      ) : null}
    </article>
  );
}
