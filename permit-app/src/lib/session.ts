import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/db';
import { COOKIE_NAME, readSession, isAdmin } from '@/lib/auth';

/** The signed-in, active user for this request, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  const userId = await readSession(raw);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return null;
  return user;
}

/** Guarantee a user; middleware should already enforce this, but be defensive. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Admin-only guard for sensitive pages/actions. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user.role)) redirect('/');
  return user;
}

/** Admin or manager (e.g. editing company settings). */
export async function requireManager(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'admin' && user.role !== 'manager') redirect('/');
  return user;
}
