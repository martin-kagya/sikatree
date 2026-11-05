import { describe, expect, it } from 'vitest';
import { vendorOrderMessage } from '@/lib/notifications';
import type { OrderRecord } from '@/lib/orders';

const order: OrderRecord = {
  id: 'order-1',
  code: 'ORD-4F9K',
  vendorId: 'vendor-1',
  vendorName: "Ama's Glow Studio",
  vendorHandle: 'amasglow',
  vendorPhone: '+233241234567',
  customerName: 'Kofi Mensah',
  customerPhone: '+233245551234',
  customerEmail: 'kofi@example.com',
  fulfilment: 'delivery',
  address: '12 Oxford Street, Osu',
  notes: 'Call on arrival',
  bookingAt: null,
  subtotalPesewas: 24000,
  deliveryPesewas: 1500,
  totalPesewas: 25500,
  status: 'pending',
  eta: 'Delivery in 45 to 60 minutes',
  createdAt: '2026-11-05T15:00:00.000Z',
  updatedAt: '2026-11-05T15:00:00.000Z',
  lines: [
    { name: 'Vitamin C serum', quantity: 2, pricePesewas: 12000, lineTotalPesewas: 24000 },
  ],
};

describe('vendor order notification', () => {
  it('includes the code, items, total, customer and dashboard link', () => {
    const message = vendorOrderMessage(order, 'https://sikatree.africa/auth/verify?token=abc');
    expect(message).toContain('New order ORD-4F9K');
    expect(message).toContain('2 x Vitamin C serum');
    expect(message).toContain('GH₵255');
    expect(message).toContain('pay on delivery');
    expect(message).toContain('Kofi Mensah');
    expect(message).toContain('12 Oxford Street, Osu');
    expect(message).toContain('Call on arrival');
    expect(message).toContain('https://sikatree.africa/auth/verify?token=abc');
  });

  it('switches the payment line for pickup and appointments', () => {
    expect(vendorOrderMessage({ ...order, fulfilment: 'pickup' }, 'https://x')).toContain(
      'pay at pickup',
    );
    expect(vendorOrderMessage({ ...order, fulfilment: 'appointment' }, 'https://x')).toContain(
      'pay at the appointment',
    );
  });
});
