'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { deleteFile } from '@/lib/storage';
import { str, date } from '@/lib/form';

export async function setApplicationStatus(formData: FormData) {
  const id = str(formData, 'id');
  const status = str(formData, 'status');
  if (!id || !status) return;
  const patch: Record<string, unknown> = { status };
  const when = new Date();
  if (status === 'submitted') patch.submittedAt = date(formData, 'submittedAt') ?? when;
  if (status === 'approved') patch.approvedAt = date(formData, 'approvedAt') ?? when;
  const exp = date(formData, 'expiresAt');
  if (exp) patch.expiresAt = exp;
  await prisma.permitApplication.update({ where: { id }, data: patch });
  revalidatePath('/permits');
  revalidatePath('/');
}

export async function deleteApplication(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  const app = await prisma.permitApplication.findUnique({ where: { id } });
  if (app?.generatedPdfPath) await deleteFile(app.generatedPdfPath);
  await prisma.permitApplication.delete({ where: { id } });
  revalidatePath('/permits');
  revalidatePath('/');
}
