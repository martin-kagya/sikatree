'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { VENDOR_COOKIE } from '@/lib/vendor-auth';

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(VENDOR_COOKIE);
  redirect('/');
}
