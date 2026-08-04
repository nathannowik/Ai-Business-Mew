'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { COOKIE_NAME, makeSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { str } from '@/lib/form';

export async function login(formData: FormData) {
  const email = str(formData, 'email')?.toLowerCase();
  const password = str(formData, 'password');
  const from = str(formData, 'from') || '/';
  const fail = () => redirect(`/login?error=1${from !== '/' ? `&from=${encodeURIComponent(from)}` : ''}`);

  if (!email || !password) fail();

  const user = await prisma.user.findUnique({ where: { email: email! } });
  if (!user || !user.active || !(await verifyPassword(password!, user.passwordHash))) fail();

  await prisma.user.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } });

  const jar = await cookies();
  jar.set(COOKIE_NAME, await makeSession(user!.id), {
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
