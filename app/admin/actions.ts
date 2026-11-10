'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE,
  adminEnabled,
  clientIp,
  createSessionToken,
  requireAdmin,
  verifyPassword,
} from '@/lib/admin-auth';
import { hitRateLimit } from '@/lib/rate-limit';
import { replyToSupportTicket, setSupportStatus, type SupportStatus } from '@/lib/support';
import { setStatus, updateNotes, type SignupStatus } from '@/lib/waitlist';

export type LoginState = { error?: string };

const STATUSES: SignupStatus[] = ['waiting', 'invited', 'onboarded', 'unsubscribed'];

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!(await adminEnabled())) return { error: 'No admin credential is stored.' };

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const limit = await hitRateLimit(`admin-login:ip:${ip}`, 8, 300).catch(() => null);
  if (limit && !limit.allowed) {
    return { error: 'Too many attempts. Wait a few minutes and try again.' };
  }

  const password = String(formData.get('password') ?? '');
  if (!(await verifyPassword(password))) return { error: 'Wrong password.' };

  const store = await cookies();
  store.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 12 * 60 * 60,
  });

  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

export async function setStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as SignupStatus;
  if (!id || !STATUSES.includes(status)) return;

  await setStatus(id, status);
  revalidatePath('/admin');
}

export async function setNotesAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const notes = String(formData.get('notes') ?? '').slice(0, 2000);
  if (!id) return;

  await updateNotes(id, notes);
  revalidatePath('/admin');
}

export async function replySupportAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const body = String(formData.get('body') ?? '');
  const result = await replyToSupportTicket(id, body);

  if (!result.ok) {
    redirect(`/admin/support/${id}?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath(`/admin/support/${id}`);
  revalidatePath('/admin/support');
  redirect(`/admin/support/${id}?sent=1`);
}

export async function supportStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as SupportStatus;
  if (!id || !['open', 'closed'].includes(status)) return;

  await setSupportStatus(id, status);
  revalidatePath(`/admin/support/${id}`);
  revalidatePath('/admin/support');
  redirect(`/admin/support/${id}?saved=1`);
}
