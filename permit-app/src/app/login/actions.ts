'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_NAME, appPassword, sessionToken } from '@/lib/auth';
import { str } from '@/lib/form';

export async function login(formData: FormData) {
  const password = str(formData, 'password');
  const from = str(formData, 'from') || '/';
  if (password !== appPassword()) {
    redirect(`/login?error=1${from !== '/' ? `&from=${encodeURIComponent(from)}` : ''}`);
  }
  const token = await sessionToken();
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  redirect(from.startsWith('/') ? from : '/');
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect('/login');
}
