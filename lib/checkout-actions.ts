'use server';

import { placeOrder } from '@/lib/orders';

// Thin server action so the checkout component can call the order service.
export async function submitOrder(formData: FormData) {
  return placeOrder(formData);
}
