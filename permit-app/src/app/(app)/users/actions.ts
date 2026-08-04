'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin, getCurrentUser } from '@/lib/session';
import { hashPassword } from '@/lib/password';
import { logActivity } from '@/lib/activity';
import { str, bool } from '@/lib/form';

const ROLES = ['admin', 'manager', 'member'];

export async function saveUser(formData: FormData) {
  await requireAdmin();
  const id = str(formData, 'id');
  const email = str(formData, 'email')?.toLowerCase();
  const name = str(formData, 'name');
  const role = str(formData, 'role') ?? 'member';
  const password = str(formData, 'password');
  if (!email || !name || !ROLES.includes(role)) return;

  if (id) {
    const data: Record<string, unknown> = { email, name, role, active: bool(formData, 'active') };
    if (password) data.passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id }, data });
    await logActivity({ action: 'user.updated', entity: 'user', entityId: id, detail: `${name} (${role})` });
  } else {
    if (!password) return; // new users need a password
    const created = await prisma.user.create({
      data: { email, name, role, active: true, passwordHash: await hashPassword(password) },
    });
    await logActivity({ action: 'user.created', entity: 'user', entityId: created.id, detail: `${name} (${role})` });
  }
  revalidatePath('/users');
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = str(formData, 'id');
  if (!id || id === admin.id) return; // never delete yourself
  // Keep at least one admin around.
  const target = await prisma.user.findUnique({ where: { id } });
  if (target?.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin', active: true } });
    if (adminCount <= 1) return;
  }
  await prisma.user.delete({ where: { id } });
  await logActivity({ action: 'user.deleted', entity: 'user', detail: target?.name ?? id });
  revalidatePath('/users');
}

/** Any signed-in user can change their own password. */
export async function changeOwnPassword(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;
  const password = str(formData, 'password');
  if (!password || password.length < 6) return;
  await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(password) } });
  revalidatePath('/users');
}
