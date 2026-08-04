'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { str } from '@/lib/form';

export async function saveDraft(formData: FormData) {
  const id = str(formData, 'id');
  const subject = str(formData, 'subject');
  const body = str(formData, 'body');
  if (!subject || !body) return;
  const data = {
    townshipId: str(formData, 'townshipId'),
    to: str(formData, 'to'),
    cc: str(formData, 'cc'),
    subject,
    body,
    purpose: str(formData, 'purpose') ?? 'info_request',
  };
  if (id) await prisma.emailDraft.update({ where: { id }, data });
  else await prisma.emailDraft.create({ data });
  revalidatePath('/emails');
}

export async function markSent(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  await prisma.emailDraft.update({ where: { id }, data: { status: 'sent', sentAt: new Date() } });
  revalidatePath('/emails');
}

export async function deleteDraft(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  await prisma.emailDraft.delete({ where: { id } });
  revalidatePath('/emails');
}
