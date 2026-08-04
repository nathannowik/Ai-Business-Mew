'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { deleteFile } from '@/lib/storage';
import { str } from '@/lib/form';

export async function deleteBatch(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  const batch = await prisma.permitBatch.findUnique({ where: { id } });
  if (batch?.combinedPdfPath) await deleteFile(batch.combinedPdfPath);
  // Applications keep their records; their batchId is set null by the schema relation.
  await prisma.permitBatch.delete({ where: { id } });
  revalidatePath('/batches');
  revalidatePath('/permits');
  revalidatePath('/');
}
