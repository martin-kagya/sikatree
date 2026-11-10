'use server';

import { after } from 'next/server';
import { notifyVendorOfLowStock, notifyVendorOfOrder } from '@/lib/notifications';
import { placeOrder } from '@/lib/orders';
import { startPayment } from '@/lib/payments/service';

// Thin server action so the checkout component can call the order service.
export async function submitOrder(formData: FormData) {
  const result = await placeOrder(formData);
  if (!result.ok) return result;

  if (result.order.paymentMethod === 'online') {
    // The order exists now; a failure here cancels it and releases the stock.
    const started = await startPayment(result.order.code);
    if (!started.ok) return { ok: false as const, error: started.error };
    return { ok: true as const, order: { ...result.order, paymentUrl: started.authorizationUrl } };
  }

  // Offline orders notify the vendor immediately, as before.
  after(async () => {
    try {
      await notifyVendorOfOrder(result.order.code);
      await notifyVendorOfLowStock(result.order.code);
    } catch (error) {
      console.error('[orders] vendor notification failed', error);
    }
  });

  return result;
}
