'use server';

import { after } from 'next/server';
import { notifyVendorOfLowStock, notifyVendorOfOrder } from '@/lib/notifications';
import { placeOrder } from '@/lib/orders';

// Thin server action so the checkout component can call the order service.
export async function submitOrder(formData: FormData) {
  const result = await placeOrder(formData);

  if (result.ok) {
    after(async () => {
      try {
        await notifyVendorOfOrder(result.order.code);
        await notifyVendorOfLowStock(result.order.code);
      } catch (error) {
        console.error('[orders] vendor notification failed', error);
      }
    });
  }

  return result;
}
