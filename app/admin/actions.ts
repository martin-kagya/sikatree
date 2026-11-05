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
import { setStatus, updateNotes, type SignupStatus } from '@/lib/waitlist';

export type LoginState = { error?: string };

const STATUSES: SignupStatus[] = ['waiting', 'invited', 'onboarded', 'unsubscribed'];

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminEnabled()) return { error: 'Set ADMIN_PASSWORD in the environment to use the admin.' };

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const limit = await hitRateLimit(`admin-login:ip:${ip}`, 8, 300).catch(() => null);
  if (limit && !limit.allowed) {
    return { error: 'Too many attempts. Wait a few minutes and try again.' };
  }

  const password = String(formData.get('password') ?? '');
  if (!verifyPassword(password)) return { error: 'Wrong password.' };

  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionToken(), {
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
