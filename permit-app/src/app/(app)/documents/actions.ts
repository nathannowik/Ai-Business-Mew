'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { saveFile, deleteFile } from '@/lib/storage';
import { str } from '@/lib/form';

const EXT_FROM_MIME: Record<string, string> = {
  'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
};

export async function uploadDocument(formData: FormData) {
  const employeeId = str(formData, 'employeeId');
  const townshipId = str(formData, 'townshipId');
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return;
  if (!employeeId && !townshipId) return;

  const dotExt = file.name.includes('.') ? `.${file.name.split('.').pop()}` : (EXT_FROM_MIME[file.type] ?? '');
  const key = await saveFile('documents', dotExt || '.bin', Buffer.from(await file.arrayBuffer()));

  await prisma.document.create({
    data: {
      name: str(formData, 'name') ?? file.name,
      category: str(formData, 'category') ?? 'other',
      storageKey: key,
      mimeType: file.type || null,
      size: file.size,
      employeeId: employeeId ?? null,
      townshipId: townshipId ?? null,
    },
  });

  if (employeeId) revalidatePath('/employees');
  if (townshipId) revalidatePath(`/townships/${townshipId}`);
}

export async function deleteDocument(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return;
  await deleteFile(doc.storageKey);
  await prisma.document.delete({ where: { id } });
  if (doc.employeeId) revalidatePath('/employees');
  if (doc.townshipId) revalidatePath(`/townships/${doc.townshipId}`);
}
